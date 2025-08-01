# Job Completion API Documentation

## Overview

The Job Completion API allows technicians to mark their assigned jobs as completed. This endpoint includes comprehensive validation to ensure jobs can only be completed under specific conditions.

## Endpoint

```
PATCH /v1/jobs/{jobId}/complete
```

## Authentication

- **Required**: Yes
- **Type**: Bearer Token
- **User Type**: Technician only

## Request Headers

```
Authorization: Bearer <technician_jwt_token>
Content-Type: application/json
```

## Request Body

No request body is required for this endpoint.

## URL Parameters

| Parameter | Type   | Description                             | Required |
| --------- | ------ | --------------------------------------- | -------- |
| jobId     | String | MongoDB ObjectId of the job to complete | Yes      |

## Validation Rules

The API performs the following validations before allowing job completion:

### 1. Authentication & Authorization

- ✅ User must be authenticated as a technician
- ✅ Only technicians can complete jobs
- ✅ Technician must be assigned to the specific job

### 2. Job Status Validation

- ✅ Job status must be "Scheduled" or "In Progress"
- ❌ Cannot complete jobs with status "Pending", "Completed", or "Overdue"

### 3. Due Date Validation

- ✅ Job can only be completed on its due date
- ❌ Cannot complete jobs before or after the due date

### 4. Assignment Validation

- ✅ Job must be assigned to the requesting technician
- ❌ Cannot complete jobs assigned to other technicians

## Response Format

### Success Response (200 OK)

```json
{
  "status": "success",
  "message": "Job completed successfully",
  "data": {
    "job": {
      "id": "507f1f77bcf86cd799439011",
      "job_id": "J-123456",
      "property": {
        "id": "507f1f77bcf86cd799439012",
        "address": {
          "fullAddress": "123 Test Street, Test City, TS 12345"
        }
      },
      "jobType": "Gas",
      "dueDate": "2024-01-15T00:00:00.000Z",
      "assignedTechnician": {
        "id": "507f1f77bcf86cd799439013",
        "fullName": "John Technician",
        "phone": "1234567890",
        "email": "john@example.com",
        "availabilityStatus": "Available"
      },
      "status": "Completed",
      "description": "Gas safety inspection",
      "priority": "Medium",
      "completedAt": "2024-01-15T14:30:00.000Z",
      "estimatedDuration": 2,
      "actualDuration": null,
      "cost": {
        "materialCost": 0,
        "laborCost": 0,
        "totalCost": 0
      },
      "notes": "",
      "isOverdue": false,
      "createdAt": "2024-01-10T10:00:00.000Z",
      "updatedAt": "2024-01-15T14:30:00.000Z",
      "owner": {
        "ownerType": "Agency",
        "ownerId": "507f1f77bcf86cd799439014"
      },
      "createdBy": {
        "userType": "Agency",
        "userId": "507f1f77bcf86cd799439014"
      },
      "lastUpdatedBy": {
        "userType": "Technician",
        "userId": "507f1f77bcf86cd799439013"
      }
    },
    "technician": {
      "id": "507f1f77bcf86cd799439013",
      "fullName": "John Technician",
      "currentJobs": 2,
      "availabilityStatus": "Available"
    },
    "completionDetails": {
      "completedAt": "2024-01-15T14:30:00.000Z",
      "completedBy": {
        "name": "John Technician",
        "type": "Technician",
        "userId": "507f1f77bcf86cd799439013"
      },
      "dueDate": "2024-01-15T00:00:00.000Z"
    }
  }
}
```

### Error Responses

#### 400 Bad Request - Invalid Job ID

```json
{
  "status": "error",
  "message": "Invalid job ID format"
}
```

#### 400 Bad Request - Wrong Due Date

```json
{
  "status": "error",
  "message": "Job can only be completed on its due date",
  "details": {
    "jobDueDate": "Mon Jan 16 2024",
    "today": "Mon Jan 15 2024"
  }
}
```

#### 400 Bad Request - Invalid Status

```json
{
  "status": "error",
  "message": "Job can only be completed if it is in 'Scheduled' or 'In Progress' status",
  "details": {
    "currentStatus": "Completed",
    "allowedStatuses": ["Scheduled", "In Progress"]
  }
}
```

#### 403 Forbidden - Not Assigned Technician

```json
{
  "status": "error",
  "message": "Access denied. You can only complete jobs assigned to you."
}
```

#### 403 Forbidden - Wrong User Type

```json
{
  "status": "error",
  "message": "Only technicians can complete jobs"
}
```

#### 404 Not Found - Job Not Found

```json
{
  "status": "error",
  "message": "Job not found"
}
```

#### 500 Internal Server Error

```json
{
  "status": "error",
  "message": "Failed to complete job"
}
```

## Business Logic

### What Happens When a Job is Completed

1. **Job Status Update**: Job status is changed to "Completed"
2. **Completion Timestamp**: `completedAt` field is set to current date/time
3. **Technician Job Count**: Technician's `currentJobs` count is decreased by 1
4. **Availability Status**: Technician's availability status is updated based on job count
5. **Notifications**: Completion notifications are sent to:
   - Agency (if job belongs to an agency)
   - All super users
6. **Transaction Safety**: All updates are performed within a database transaction

### Technician Availability Logic

- **Available**: When `currentJobs < 4`
- **Busy**: When `currentJobs >= 4`

## Example Usage

### cURL Example

```bash
curl -X PATCH \
  http://localhost:3000/v1/jobs/507f1f77bcf86cd799439011/complete \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -H 'Content-Type: application/json'
```

### JavaScript Example

```javascript
const completeJob = async (jobId, technicianToken) => {
  try {
    const response = await fetch(`/v1/jobs/${jobId}/complete`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${technicianToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log("Job completed successfully:", data);
      return data;
    } else {
      console.error("Failed to complete job:", data);
      throw new Error(data.message);
    }
  } catch (error) {
    console.error("Error completing job:", error);
    throw error;
  }
};

// Usage
completeJob("507f1f77bcf86cd799439011", "technician_jwt_token");
```

## Testing

A test file is available at `src/examples/testJobCompletion.js` that creates test scenarios for:

1. ✅ Valid completion scenario
2. ❌ Future due date scenario
3. ❌ Already completed job scenario
4. ❌ Unassigned job scenario

To run the test:

```bash
node src/examples/testJobCompletion.js
```

## Notifications

When a job is completed, the system automatically sends notifications to relevant parties:

### Notification Recipients

- **Agency**: If the job belongs to an agency
- **Super Users**: All super users in the system

### Notification Content

- **Type**: `JOB_COMPLETED`
- **Title**: `{JobType} Job Completed`
- **Message**: `{TechnicianName} has completed a {JobType} job at {PropertyAddress}. Completed on: {Date}`

### Notification Data

```json
{
  "jobId": "507f1f77bcf86cd799439011",
  "job_id": "J-123456",
  "propertyId": "507f1f77bcf86cd799439012",
  "propertyAddress": "123 Test Street, Test City, TS 12345",
  "jobType": "Gas",
  "dueDate": "2024-01-15T00:00:00.000Z",
  "completedAt": "2024-01-15T14:30:00.000Z",
  "priority": "Medium",
  "technician": {
    "id": "507f1f77bcf86cd799439013",
    "fullName": "John Technician",
    "email": "john@example.com"
  },
  "completedBy": {
    "userType": "Technician",
    "userId": "507f1f77bcf86cd799439013",
    "name": "John Technician"
  }
}
```

## Security Considerations

1. **Authentication Required**: Only authenticated technicians can access this endpoint
2. **Authorization**: Technicians can only complete jobs assigned to them
3. **Input Validation**: All inputs are validated for format and business rules
4. **Transaction Safety**: Database operations are wrapped in transactions
5. **Error Handling**: Comprehensive error handling with appropriate HTTP status codes

## Related Endpoints

- `GET /v1/jobs` - List jobs
- `GET /v1/jobs/{id}` - Get specific job details
- `PATCH /v1/jobs/{id}/status` - Update job status
- `PATCH /v1/jobs/{id}/assign` - Assign job to technician
- `PATCH /v1/jobs/{id}/claim` - Claim available job

## Changelog

- **v1.0.0** - Initial implementation of job completion API
  - Added PATCH /v1/jobs/{jobId}/complete endpoint
  - Implemented comprehensive validation logic
  - Added notification system integration
  - Added transaction safety
  - Created test scenarios and documentation
