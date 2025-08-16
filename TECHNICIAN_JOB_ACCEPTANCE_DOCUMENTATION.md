# Technician Job Acceptance Documentation

## Overview

This document describes how technicians can accept/claim jobs in the RentalEase CRM system. Technicians have the ability to self-assign themselves to available (unassigned) jobs through the claim functionality.

## Job Acceptance Methods

### 1. Self-Claiming Available Jobs

**Primary Method:** Technicians can claim unassigned jobs themselves.

**Endpoint:** `PATCH /api/jobs/:id/claim`

**Authentication:** Required - Technician only

**Request Headers:**

```
Authorization: Bearer <technician_jwt_token>
Content-Type: application/json
```

**Request Body:** None required (technician claims the job for themselves)

**Example Request:**

```bash
curl -X PATCH \
  http://localhost:4000/api/jobs/64f8a1b2c3d4e5f6a7b8c9d0/claim \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

## Prerequisites for Job Acceptance

### 1. Job Must Be Available

- Job must not have an `assignedTechnician` (unassigned)
- Job status should be "Pending" or "Scheduled"
- Job must belong to the technician's organization/agency

### 2. Technician Must Be Available

- Technician's `availabilityStatus` should not be "Busy"
- Technician's `currentJobs` count should be less than 4
- Technician must be authenticated and active

### 3. Access Permissions

- Technician must have access to the job (organization validation)
- Job must exist and be valid

## Job Acceptance Process

### Step 1: Find Available Jobs

Use the available jobs endpoint to see jobs that can be claimed:

```
GET /api/jobs/available
Authorization: Bearer <technician_token>
```

**Query Parameters:**

- `jobType` - Filter by job type
- `priority` - Filter by priority
- `search` - Search in description/notes
- `page` - Page number
- `limit` - Items per page

### Step 2: Claim the Job

Once a suitable job is found, claim it using the job ID:

```
PATCH /api/jobs/{jobId}/claim
Authorization: Bearer <technician_token>
```

### Step 3: Job Status Changes

Upon successful claiming:

- Job `assignedTechnician` is set to the claiming technician's ID
- Job `status` changes to "Scheduled"
- Technician's `currentJobs` count increases by 1
- Technician's `availabilityStatus` updates based on job count

## Success Response

```json
{
  "status": "success",
  "message": "Job claimed successfully",
  "data": {
    "job": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "job_id": "J-123456",
      "property": {
        "id": "property_id",
        "address": "123 Main St, City, State",
        "propertyType": "Apartment",
        "region": "North"
      },
      "jobType": "Electrical",
      "dueDate": "2024-01-20T10:00:00.000Z",
      "assignedTechnician": {
        "id": "technician_id",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+1234567890",
        "email": "john@example.com",
        "availabilityStatus": "Available"
      },
      "status": "Scheduled",
      "priority": "High",
      "description": "Fix electrical outlet in kitchen",
      "estimatedDuration": 2,
      "cost": {
        "materialCost": 50,
        "laborCost": 100,
        "totalCost": 150
      },
      "notes": "Tenant reported sparking",
      "isOverdue": false,
      "createdAt": "2024-01-15T10:00:00.000Z"
    },
    "technician": {
      "id": "technician_id",
      "fullName": "John Doe",
      "currentJobs": 3,
      "availabilityStatus": "Available"
    }
  }
}
```

## Error Responses

### 400 - Invalid Job ID

```json
{
  "status": "error",
  "message": "Invalid job ID format"
}
```

### 403 - Not a Technician

```json
{
  "status": "error",
  "message": "Only technicians can claim jobs"
}
```

### 404 - Job Not Found

```json
{
  "status": "error",
  "message": "Job not found"
}
```

### 400 - Job Already Assigned

```json
{
  "status": "error",
  "message": "This job is already assigned to a technician"
}
```

### 400 - Technician Too Busy

```json
{
  "status": "error",
  "message": "You are currently too busy to take on more jobs. Please complete some existing jobs first."
}
```

### 403 - Access Denied

```json
{
  "status": "error",
  "message": "Access denied. You do not have permission to claim this job."
}
```

### 404 - Technician Not Found

```json
{
  "status": "error",
  "message": "Technician not found"
}
```

### 500 - Server Error

```json
{
  "status": "error",
  "message": "Failed to claim job"
}
```

## Business Rules

### Job Availability Rules

- Only unassigned jobs can be claimed
- Jobs with existing `assignedTechnician` cannot be claimed
- Jobs must belong to the technician's organization

### Technician Availability Rules

- Maximum 4 concurrent jobs per technician
- `availabilityStatus` becomes "Busy" when `currentJobs >= 4`
- Busy technicians cannot claim new jobs

### Job Status Rules

- Claimed jobs automatically change status to "Scheduled"
- Only "Pending" or "Scheduled" jobs can be claimed
- Completed jobs cannot be claimed

### Notification Rules

- Job assignment notifications are sent to all stakeholders
- Notifications include property details and technician information
- Notification failures don't prevent job claiming

## Common Use Cases for AI

### 1. Get Available Jobs for Claiming

```
GET /api/jobs/available?jobType=Electrical&priority=High&page=1&limit=10
Authorization: Bearer <technician_token>
```

### 2. Claim a Specific Job

```
PATCH /api/jobs/64f8a1b2c3d4e5f6a7b8c9d0/claim
Authorization: Bearer <technician_token>
```

### 3. Check Technician's Current Jobs

```
GET /api/technicians/active-jobs
Authorization: Bearer <technician_token>
```

### 4. View Job Details Before Claiming

```
GET /api/jobs/64f8a1b2c3d4e5f6a7b8c9d0
Authorization: Bearer <technician_token>
```

## Frontend Integration Example

```javascript
// Function to claim a job
const claimJob = async (jobId) => {
  try {
    const response = await fetch(`/api/jobs/${jobId}/claim`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${technicianToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.status === "success") {
      // Show success message
      showNotification("Job claimed successfully!", "success");

      // Update UI - remove job from available list
      removeJobFromAvailableList(jobId);

      // Update technician stats
      updateTechnicianStats(data.data.technician);

      // Refresh active jobs list
      refreshActiveJobs();
    } else {
      showNotification(data.message, "error");
    }
  } catch (error) {
    console.error("Error claiming job:", error);
    showNotification("Failed to claim job", "error");
  }
};

// Function to get available jobs
const getAvailableJobs = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters);
    const response = await fetch(`/api/jobs/available?${queryParams}`, {
      headers: {
        Authorization: `Bearer ${technicianToken}`,
      },
    });

    const data = await response.json();

    if (data.status === "success") {
      return data.data.jobs;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error("Error fetching available jobs:", error);
    throw error;
  }
};
```

## Workflow Summary

1. **Browse Available Jobs** - Use `/api/jobs/available` to see unassigned jobs
2. **Review Job Details** - Check job requirements, location, and priority
3. **Claim Job** - Use `/api/jobs/{id}/claim` to accept the job
4. **Job Becomes Active** - Job appears in technician's active jobs list
5. **Complete Job** - Use `/api/jobs/{id}/complete` when finished

## Notes

- Job claiming is first-come, first-served
- Technicians should review job details before claiming
- Claimed jobs cannot be transferred to other technicians
- Job completion is required to free up technician capacity
- All job activities are logged and tracked for reporting

