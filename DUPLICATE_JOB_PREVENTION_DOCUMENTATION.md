# Duplicate Job Prevention System

## Overview

This document explains the duplicate job prevention system implemented to ensure that no duplicate jobs are created for the same property, job type, and date.

## Problem

Previously, the cron job system could create duplicate jobs for the same property and compliance type (e.g., two Gas jobs or two Electrical jobs) on the same date. This happened because:

1. The duplicate check only looked at job status, not the date
2. Multiple cron job runs could create jobs for the same compliance requirement
3. Manual job creation didn't have proper duplicate checking

## Solution

The system now prevents duplicates at multiple levels:

### 1. Database Level (Pre-save Hook)

**File**: `src/models/Job.js`

A pre-save hook checks for existing jobs with the same:

- Property ID
- Job Type
- Date (same day, regardless of time)

```javascript
jobSchema.pre("save", async function (next) {
  if (this.isNew) {
    const startOfDay = new Date(this.dueDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(this.dueDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingJob = await this.constructor.findOne({
      property: this.property,
      jobType: this.jobType,
      dueDate: { $gte: startOfDay, $lte: endOfDay },
      _id: { $ne: this._id },
    });

    if (existingJob) {
      const error = new Error(
        `A ${
          this.jobType
        } job already exists for this property on ${startOfDay.toDateString()}`
      );
      error.name = "DuplicateJobError";
      return next(error);
    }
  }
  // ... rest of the hook
});
```

### 2. Cron Job Level

**File**: `src/services/complianceCronJob.js`

The cron job now uses an improved duplicate checking method:

```javascript
async checkExistingJob(propertyId, complianceType, dueDate) {
  const jobTypeMap = {
    gasCompliance: "Gas",
    electricalSafety: "Electrical",
    smokeAlarms: "Smoke",
  };

  // Use the static method for consistent duplicate checking
  const existingJob = await Job.checkForDuplicate(
    propertyId,
    jobTypeMap[complianceType],
    dueDate
  );

  return existingJob;
}
```

### 3. Static Method for Reusability

**File**: `src/models/Job.js`

A static method provides consistent duplicate checking across the application:

```javascript
jobSchema.statics.checkForDuplicate = async function (
  propertyId,
  jobType,
  dueDate,
  excludeJobId = null
) {
  const startOfDay = new Date(dueDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(dueDate);
  endOfDay.setHours(23, 59, 59, 999);

  const query = {
    property: propertyId,
    jobType: jobType,
    dueDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ["Pending", "Scheduled", "Overdue"] },
  };

  if (excludeJobId) {
    query._id = { $ne: excludeJobId };
  }

  return await this.findOne(query);
};
```

### 4. API Level Error Handling

**File**: `src/routes/job.routes.js`

The API properly handles duplicate job errors:

```javascript
// Handle duplicate job error
if (error.name === "DuplicateJobError") {
  return res.status(409).json({
    status: "error",
    message: error.message,
    details: {
      duplicate:
        "A job of this type already exists for this property on the specified date",
    },
  });
}
```

## Rules

The duplicate prevention system follows these rules:

1. **Same Property + Same Job Type + Same Date = Duplicate**

   - Cannot create two Gas jobs for the same property on the same date
   - Cannot create two Electrical jobs for the same property on the same date
   - Cannot create two Smoke jobs for the same property on the same date

2. **Different Job Types on Same Date = Allowed**

   - Can create a Gas job and an Electrical job for the same property on the same date
   - Can create a Gas job and a Smoke job for the same property on the same date

3. **Same Job Type on Different Dates = Allowed**

   - Can create a Gas job for Monday and another Gas job for Tuesday
   - Can create an Electrical job for this week and another for next week

4. **Date Comparison is Day-Based**
   - Jobs are considered duplicates if they're on the same calendar day
   - Time within the day doesn't matter (9 AM vs 2 PM on same day = duplicate)

## Status Consideration

The system only considers jobs with these statuses when checking for duplicates:

- `Pending`
- `Scheduled`
- `Overdue`

Completed jobs are not considered duplicates, allowing new jobs to be created after previous ones are completed.

## Testing

A test script is available at `src/examples/testDuplicateJobPrevention.js` to verify the duplicate prevention system works correctly.

To run the test:

```bash
node src/examples/testDuplicateJobPrevention.js
```

## Error Messages

When a duplicate job is attempted, the system returns:

- **API Response**: HTTP 409 Conflict with descriptive message
- **Cron Job**: Logs a warning message and skips job creation
- **Database**: Throws a `DuplicateJobError` with detailed message

## Benefits

1. **Prevents Data Inconsistency**: No more duplicate jobs cluttering the system
2. **Improves User Experience**: Clear error messages when duplicates are attempted
3. **Maintains Data Integrity**: Consistent checking across all job creation methods
4. **Flexible**: Allows different job types on same date, same job type on different dates
5. **Robust**: Multiple layers of protection (database, application, API)

## Migration Notes

If you have existing duplicate jobs in your database, you may want to clean them up before deploying this system. You can identify duplicates using:

```javascript
// Find duplicate jobs
const duplicates = await Job.aggregate([
  {
    $group: {
      _id: {
        property: "$property",
        jobType: "$jobType",
        date: { $dateToString: { format: "%Y-%m-%d", date: "$dueDate" } },
      },
      count: { $sum: 1 },
      jobs: { $push: "$$ROOT" },
    },
  },
  {
    $match: { count: { $gt: 1 } },
  },
]);
```
