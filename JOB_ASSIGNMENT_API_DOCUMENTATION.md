# Job Assignment API Documentation

## Overview

The RentalEase CRM system provides multiple ways to assign jobs to technicians. This document covers all available methods for job assignment, including both manual assignment by super users and self-claiming by technicians.

## Available Assignment Methods

### 1. **Manual Assignment by Super Users** (`PATCH /api/jobs/:id/assign`)

Super users can manually assign jobs to technicians.

### 2. **Self-Claiming by Technicians** (`PATCH /api/jobs/:id/claim`)

Technicians can claim available jobs themselves.

### 3. **Assignment During Job Creation** (`POST /api/jobs`)

Jobs can be assigned to technicians when they are first created.

### 4. **Assignment During Job Updates** (`PUT /api/jobs/:id`)

Jobs can be assigned or reassigned during updates.

---

## 1. Manual Assignment by Super Users

### Endpoint

```
PATCH /api/jobs/:id/assign
```

### Authentication

- **Required:** Super User authentication
- **Middleware:** `authenticateSuperUser`

### Request Body

```json
{
  "technicianId": "64f8a1b2c3d4e5f6a7b8c9d0"
}
```

### Request Headers

```
Authorization: Bearer {super_user_token}
Content-Type: application/json
```

### Example Request

```bash
curl -X PATCH \
  http://localhost:3000/api/jobs/64f8a1b2c3d4e5f6a7b8c9d0/assign \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "technicianId": "64f8a1b2c3d4e5f6a7b8c9d0"
  }'
```

### Success Response (200)

```json
{
  "status": "success",
  "message": "Job assigned successfully",
  "data": {
    "job": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "job_id": "JOB-2024-001",
      "jobType": "Electrical",
      "status": "Scheduled",
      "assignedTechnician": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "fullName": "Mike Johnson",
        "phone": "+1234567890",
        "email": "mike@example.com",
        "availabilityStatus": "Available"
      },
      "property": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "address": {
          "fullAddress": "123 Main St, City, State 12345"
        }
      },
      "dueDate": "2024-12-15T00:00:00.000Z",
      "priority": "High"
    },
    "technician": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "fullName": "Mike Johnson",
      "currentJobs": 3,
      "availabilityStatus": "Available"
    }
  }
}
```

### Error Responses

#### 400 - Invalid ID Format

```json
{
  "status": "error",
  "message": "Invalid job ID or technician ID format"
}
```

#### 403 - Access Denied

```json
{
  "status": "error",
  "message": "Access denied. You do not have permission to assign this job."
}
```

#### 404 - Job or Technician Not Found

```json
{
  "status": "error",
  "message": "Job not found"
}
```

#### 400 - Organization Mismatch

```json
{
  "status": "error",
  "message": "Technician does not belong to the same organization"
}
```

---

## 2. Self-Claiming by Technicians

### Endpoint

```
PATCH /api/jobs/:id/claim
```

### Authentication

- **Required:** Technician authentication
- **Middleware:** `authenticate`

### Request Body

_No body required - technician claims the job for themselves_

### Request Headers

```
Authorization: Bearer {technician_token}
Content-Type: application/json
```

### Example Request

```bash
curl -X PATCH \
  http://localhost:3000/api/jobs/64f8a1b2c3d4e5f6a7b8c9d0/claim \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

### Success Response (200)

```json
{
  "status": "success",
  "message": "Job claimed successfully",
  "data": {
    "job": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "job_id": "JOB-2024-001",
      "jobType": "Electrical",
      "status": "Scheduled",
      "assignedTechnician": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "fullName": "Mike Johnson",
        "phone": "+1234567890",
        "email": "mike@example.com",
        "availabilityStatus": "Available"
      },
      "property": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "address": {
          "fullAddress": "123 Main St, City, State 12345"
        }
      },
      "dueDate": "2024-12-15T00:00:00.000Z",
      "priority": "High"
    },
    "technician": {
      "id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "fullName": "Mike Johnson",
      "currentJobs": 3,
      "availabilityStatus": "Available"
    }
  }
}
```

### Error Responses

#### 403 - Not a Technician

```json
{
  "status": "error",
  "message": "Only technicians can claim jobs"
}
```

#### 400 - Job Already Assigned

```json
{
  "status": "error",
  "message": "This job is already assigned to a technician"
}
```

#### 400 - Technician Too Busy

```json
{
  "status": "error",
  "message": "You are currently too busy to take on more jobs. Please complete some existing jobs first."
}
```

#### 403 - Access Denied

```json
{
  "status": "error",
  "message": "Access denied. You do not have permission to claim this job."
}
```

---

## 3. Assignment During Job Creation

### Endpoint

```
POST /api/jobs
```

### Authentication

- **Required:** Any authenticated user (Super User, Agency, or Technician)
- **Middleware:** `authenticate`

### Request Body

```json
{
  "property": "64f8a1b2c3d4e5f6a7b8c9d0",
  "jobType": "Electrical",
  "dueDate": "2024-12-15",
  "assignedTechnician": "64f8a1b2c3d4e5f6a7b8c9d0",
  "description": "Fix electrical outlet in kitchen",
  "priority": "High",
  "estimatedDuration": 2,
  "notes": "Customer reported sparking"
}
```

### Example Request

```bash
curl -X POST \
  http://localhost:3000/api/jobs \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "property": "64f8a1b2c3d4e5f6a7b8c9d0",
    "jobType": "Electrical",
    "dueDate": "2024-12-15",
    "assignedTechnician": "64f8a1b2c3d4e5f6a7b8c9d0",
    "description": "Fix electrical outlet in kitchen",
    "priority": "High",
    "estimatedDuration": 2,
    "notes": "Customer reported sparking"
  }'
```

### Success Response (201)

```json
{
  "status": "success",
  "message": "Job created successfully",
  "data": {
    "job": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "job_id": "JOB-2024-001",
      "jobType": "Electrical",
      "status": "Scheduled",
      "assignedTechnician": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "fullName": "Mike Johnson",
        "phone": "+1234567890",
        "email": "mike@example.com",
        "availabilityStatus": "Available"
      },
      "property": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "address": {
          "fullAddress": "123 Main St, City, State 12345"
        }
      },
      "dueDate": "2024-12-15T00:00:00.000Z",
      "priority": "High",
      "description": "Fix electrical outlet in kitchen",
      "estimatedDuration": 2,
      "notes": "Customer reported sparking"
    }
  }
}
```

---

## 4. Assignment During Job Updates

### Endpoint

```
PUT /api/jobs/:id
```

### Authentication

- **Required:** Any authenticated user (Super User, Agency, or Technician)
- **Middleware:** `authenticate`

### Request Body

```json
{
  "assignedTechnician": "64f8a1b2c3d4e5f6a7b8c9d0",
  "status": "Scheduled",
  "priority": "High"
}
```

### Example Request

```bash
curl -X PUT \
  http://localhost:3000/api/jobs/64f8a1b2c3d4e5f6a7b8c9d0 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "assignedTechnician": "64f8a1b2c3d4e5f6a7b8c9d0",
    "status": "Scheduled",
    "priority": "High"
  }'
```

### Success Response (200)

```json
{
  "status": "success",
  "message": "Job updated successfully",
  "data": {
    "job": {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "job_id": "JOB-2024-001",
      "jobType": "Electrical",
      "status": "Scheduled",
      "assignedTechnician": {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "fullName": "Mike Johnson",
        "phone": "+1234567890",
        "email": "mike@example.com",
        "availabilityStatus": "Available"
      }
    }
  }
}
```

---

## Notifications

### In-App Notifications

When a job is assigned, the following recipients receive in-app notifications:

1. **Technician** - Gets notified they've been assigned a job
2. **Agency** - Gets notified when their job is assigned to a technician
3. **Super Users** - Get notified of all job assignments for oversight

### Email Notifications

Email notifications are also sent to the assigned technician.

### Notification Format

```json
{
  "type": "JOB_ASSIGNED",
  "title": "Electrical Job Assigned",
  "message": "John Smith has assigned an Electrical job at 123 Main St to Mike Johnson. Due date: 12/15/2024",
  "data": {
    "jobId": "job_id",
    "propertyAddress": "123 Main St",
    "technician": {
      "id": "tech_id",
      "fullName": "Mike Johnson",
      "email": "mike@example.com"
    },
    "assignedBy": {
      "name": "John Smith",
      "userType": "SuperUser"
    }
  }
}
```

---

## Business Rules

### Technician Availability

- Technicians can only claim jobs if they have less than 4 current jobs
- If a technician has 4 or more jobs, their `availabilityStatus` becomes "Busy"
- Busy technicians cannot claim new jobs

### Job Status Changes

- When a job is assigned, its status automatically changes to "Scheduled"
- Only unassigned jobs can be claimed by technicians
- Jobs that are already assigned cannot be claimed

### Organization Access

- Technicians can only claim jobs that belong to their organization
- Super users can assign jobs to any technician within the same organization
- Agencies can only assign jobs to technicians within their organization

### Validation Rules

- Job ID must be a valid MongoDB ObjectId
- Technician ID must be a valid MongoDB ObjectId
- Technician must exist and belong to the same organization as the job
- Job must exist and be unassigned (for claiming)

---

## Frontend Integration Examples

### React/JavaScript Example - Claim Job

```javascript
const claimJob = async (jobId) => {
  try {
    const response = await fetch(`/api/jobs/${jobId}/claim`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.status === "success") {
      // Show success message
      showNotification("Job claimed successfully!", "success");
      // Refresh job list
      refreshJobs();
    } else {
      showNotification(data.message, "error");
    }
  } catch (error) {
    console.error("Error claiming job:", error);
    showNotification("Failed to claim job", "error");
  }
};
```

### React/JavaScript Example - Assign Job

```javascript
const assignJob = async (jobId, technicianId) => {
  try {
    const response = await fetch(`/api/jobs/${jobId}/assign`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ technicianId }),
    });

    const data = await response.json();

    if (data.status === "success") {
      showNotification("Job assigned successfully!", "success");
      refreshJobs();
    } else {
      showNotification(data.message, "error");
    }
  } catch (error) {
    console.error("Error assigning job:", error);
    showNotification("Failed to assign job", "error");
  }
};
```

---

## Error Handling Best Practices

1. **Always validate IDs** before making requests
2. **Handle authentication errors** (401, 403)
3. **Check technician availability** before allowing claims
4. **Show appropriate error messages** to users
5. **Log errors** for debugging purposes
6. **Implement retry logic** for network failures

---

## Testing

### Test Cases to Cover

1. **Valid Assignment**

   - Super user assigns job to available technician
   - Technician claims available job
   - Job status changes to "Scheduled"

2. **Invalid Scenarios**

   - Assigning to non-existent technician
   - Claiming already assigned job
   - Claiming job when technician is busy
   - Assigning job from different organization

3. **Notification Testing**

   - Verify in-app notifications are sent
   - Verify email notifications are sent
   - Check notification content accuracy

4. **Edge Cases**
   - Assigning job to technician with 3 current jobs (becomes busy)
   - Reassigning job from one technician to another
   - Assigning job during creation vs. later assignment
