# Active Jobs API Documentation for AI Prompts

## Overview

This document provides concise information for AI prompts to retrieve active jobs from the RentalEase CRM system.

## Key Endpoints

### 1. Get All Jobs (General)

**Endpoint:** `GET /api/jobs`
**Authentication:** Required (SuperUser, TeamMember, Agency, PropertyManager, Technician)

**Query Parameters:**

- `status` - Filter by status (Pending, Scheduled, Completed, Overdue)
- `jobType` - Filter by type (Gas, Electrical, Smoke, Repairs, Routine Inspection)
- `priority` - Filter by priority (Low, Medium, High, Urgent)
- `assignedTechnician` - Filter by assigned technician ID
- `search` - Search in description and notes
- `startDate` / `endDate` - Date range filter (YYYY-MM-DD)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- `sortBy` - Sort field (default: dueDate)
- `sortOrder` - Sort order (asc/desc)

### 2. Get Active Jobs (Technician-Specific)

**Endpoint:** `GET /api/technicians/active-jobs`
**Authentication:** Required (Technician only)

**Filters Applied Automatically:**

- `assignedTechnician`: Current technician ID
- `status`: ["Pending", "Scheduled"] (active statuses only)
- `dueDate`: >= current date (not overdue)

**Query Parameters:** Same as general jobs endpoint

### 3. Get Available Jobs (Unassigned)

**Endpoint:** `GET /api/jobs/available`
**Authentication:** Required (SuperUser, Technician only)

**Filters Applied Automatically:**

- `assignedTechnician`: null/undefined (unassigned jobs only)

## Job Data Structure

```json
{
  "id": "job_mongodb_id",
  "job_id": "J-123456",
  "property": {
    "id": "property_id",
    "address": "123 Main St, City, State",
    "propertyType": "Apartment",
    "region": "North",
    "status": "Occupied"
  },
  "jobType": "Electrical",
  "dueDate": "2024-01-20T10:00:00.000Z",
  "assignedTechnician": {
    "id": "technician_id",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "email": "john@example.com"
  },
  "status": "Pending",
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
}
```

## Response Format

```json
{
  "status": "success",
  "message": "Jobs retrieved successfully",
  "data": {
    "jobs": [...], // Array of job objects
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "statistics": {
      "statusCounts": {
        "Pending": 10,
        "Scheduled": 15,
        "Completed": 20,
        "Overdue": 5
      },
      "totalJobs": 50
    }
  }
}
```

## Job Status Definitions

- **Pending**: Job created but not yet scheduled
- **Scheduled**: Job assigned to technician with date/time
- **Completed**: Job finished successfully
- **Overdue**: Job past due date and not completed

## Job Types

- Gas
- Electrical
- Smoke
- Repairs
- Routine Inspection

## Priority Levels

- Low
- Medium
- High
- Urgent

## Common Use Cases for AI

1. **Get all active jobs for a technician:**

   ```
   GET /api/technicians/active-jobs
   Authorization: Bearer <technician_token>
   ```

2. **Get available jobs for assignment:**

   ```
   GET /api/jobs/available?jobType=Electrical&priority=High
   Authorization: Bearer <superuser_token>
   ```

3. **Search jobs by description:**

   ```
   GET /api/jobs?search=electrical&status=Pending
   Authorization: Bearer <user_token>
   ```

4. **Get jobs within date range:**
   ```
   GET /api/jobs?startDate=2024-01-01&endDate=2024-01-31
   Authorization: Bearer <user_token>
   ```

## Error Responses

```json
{
  "status": "error",
  "message": "Error description"
}
```

Common error codes:

- `400` - Bad request (invalid parameters)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `500` - Internal server error

