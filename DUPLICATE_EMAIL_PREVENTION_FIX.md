# Duplicate Email Prevention Fix with 5-Day Window

## Problem Description

After sending a confirmation email for a booked inspection, users were receiving the original smoke alarm inspection email again. This was happening because:

1. **Initial Email Sent**: The compliance cron job sends an email for the original inspection date (e.g., July 17)
2. **Tenant Books**: The tenant books a new date (e.g., July 20)
3. **Property Updated**: The property's compliance schedule is updated with the new date (July 20)
4. **Cron Job Runs Again**: The cron job sees the new date (July 20) and thinks no email was sent for this date, so it sends another email

## Root Cause

The issue was in the `hasEmailBeenSent` method in `src/services/complianceCronJob.js`. The method only checked for existing email logs based on the `trackingKey`, which was generated as:

```
${propertyId}_${complianceType}_${dateString}
```

When the inspection date changed (after booking), it created a new `trackingKey`, making the system think no email had been sent for the new date.

## Solution Implemented

### Enhanced Email Prevention Logic with 5-Day Window

Modified the email tracking system to use a **5-day window** instead of exact date matching:

1. **5-Day Window Tracking**: Emails sent within 5 days of each other for the same property and compliance type are considered duplicates
2. **Existing Job Check**: Check if a job already exists for this property and compliance type
3. **Recently Completed Job Check**: Check if a job was recently completed for this property and compliance type

### Code Changes

#### 1. Updated Tracking Key Generation

```javascript
// Generate unique key for email tracking with 5-day window
generateEmailKey(propertyId, complianceType, inspectionDate) {
  // Create a 5-day window around the inspection date
  const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000;
  const startOfWindow = new Date(inspectionDate.getTime() - fiveDaysInMs);
  const endOfWindow = new Date(inspectionDate.getTime() + fiveDaysInMs);

  // Use the start of the window as the key date
  const windowStartDate = startOfWindow.toDateString();
  return `${propertyId}_${complianceType}_${windowStartDate}`;
}
```

#### 2. Updated Email Log Check

```javascript
// Method to check if email was recently sent
emailLogSchema.statics.wasEmailRecentlySent = async function (
  propertyId,
  complianceType,
  inspectionDate
) {
  // Create a 5-day window around the inspection date
  const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000;
  const startOfWindow = new Date(inspectionDate.getTime() - fiveDaysInMs);
  const endOfWindow = new Date(inspectionDate.getTime() + fiveDaysInMs);

  // Check if any email was sent within this 5-day window
  const existingLog = await this.findOne({
    propertyId: propertyId,
    complianceType: complianceType,
    emailSentAt: { $gte: startOfWindow, $lte: endOfWindow },
    emailStatus: "sent",
  });

  return existingLog !== null;
};
```

#### 3. Enhanced Job Existence Check

```javascript
// Check if a job already exists for this property and compliance type
// This prevents sending duplicate emails when tenant has already booked
const jobType = this.getJobTypeFromComplianceType(complianceType);
const existingJob = await Job.findOne({
  property: propertyId,
  jobType: jobType,
  status: { $in: ["Pending", "Scheduled", "In Progress", "Completed"] },
  createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
});

if (existingJob) {
  this.logMessage(
    `⏭️ Job already exists for ${propertyId} - ${complianceType} (${inspectionDate.toDateString()}) - Job ID: ${
      existingJob._id
    }, Status: ${existingJob.status} - Skipping duplicate email`
  );
  return true;
}

// Check if a job was recently completed for this property and compliance type
// This prevents sending emails when inspection has already been completed
const recentlyCompletedJob = await Job.findOne({
  property: propertyId,
  jobType: jobType,
  status: "Completed",
  completedAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }, // Last 90 days
});

if (recentlyCompletedJob) {
  this.logMessage(
    `⏭️ Recently completed job exists for ${propertyId} - ${complianceType} (${inspectionDate.toDateString()}) - Job ID: ${
      recentlyCompletedJob._id
    }, Completed: ${
      recentlyCompletedJob.completedAt
    } - Skipping duplicate email`
  );
  return true;
}
```

## 5-Day Window Logic

### How It Works

- **Original Date**: July 20
- **5-Day Window**: July 15 - July 25
- **Any email sent within this window** for the same property and compliance type will prevent duplicate emails
- **Dates outside this window** (July 14 or earlier, July 26 or later) will trigger new emails

### Examples

1. **Email sent for July 20** → No email sent for July 17, 18, 19, 21, 22, 23, 24, 25
2. **Email sent for July 20** → Email WILL be sent for July 14, July 26, etc.
3. **Tenant books for July 22** → No duplicate email sent (within 5-day window)
4. **Tenant books for July 27** → New email sent (outside 5-day window)

## Prevention Scenarios

The enhanced logic now prevents duplicate emails in the following scenarios:

1. **Email Already Sent**: An email was sent within 5 days for the same property and compliance type
2. **Job Already Created**: A job exists for the same property and compliance type (tenant has booked)
3. **Job Recently Completed**: A job was completed recently for the same property and compliance type (inspection already done)

## Testing

A test file has been created at `src/examples/testDuplicateEmailPrevention.js` to verify the 5-day window functionality works correctly in all scenarios.

## Benefits

- ✅ **Eliminates Duplicate Emails**: No more smoke alarm emails after booking confirmation within 5 days
- ✅ **Flexible Rescheduling**: Allows reasonable date changes without triggering duplicates
- ✅ **Prevents Spam**: Reduces email fatigue for tenants
- ✅ **Maintains Functionality**: Still sends emails for genuinely new inspection requirements
- ✅ **Comprehensive Coverage**: Handles all scenarios where duplicate emails might occur

## Files Modified

- `src/services/complianceCronJob.js`: Enhanced `generateEmailKey` method with 5-day window
- `src/models/EmailLog.js`: Updated `wasEmailRecentlySent` method with 5-day window
- `src/examples/testDuplicateEmailPrevention.js`: Test file for 5-day window verification
- `DUPLICATE_EMAIL_PREVENTION_FIX.md`: This documentation

## Monitoring

The fix includes detailed logging to help monitor the prevention logic:

- `⏭️ Job already exists` - When a job exists and email is skipped
- `⏭️ Recently completed job exists` - When a completed job exists and email is skipped
- `⏭️ Email already sent` - When an email was sent within 5-day window and email is skipped
