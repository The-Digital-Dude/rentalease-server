# Technician Job Routes Documentation

This document describes the three new routes added to the technician routes for viewing jobs assigned to technicians.

## Routes Overview

### 1. GET `/technicians/my-jobs`

**Description:** Get all jobs assigned to the authenticated technician (paginated table)

**Authentication:** Required - Technician only

**Query Parameters:**

- `jobType` (optional): Filter by job type (Gas, Electrical, Smoke, Repairs, Routine Inspection)
- `status` (optional): Filter by status (Pending, Scheduled, Completed, Overdue)
- `priority` (optional): Filter by priority (Low, Medium, High, Urgent)
- `search` (optional): Search in description, notes, and job type
- `startDate` (optional): Filter jobs from this date
- `endDate` (optional): Filter jobs until this date
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `sortBy` (optional): Field to sort by (default: dueDate)
- `sortOrder` (optional): Sort order - "asc" or "desc" (default: asc)

**Response:**

```json
{
  "status": "success",
  "message": "My jobs retrieved successfully",
  "data": {
    "jobs": [...], // Array of job objects with full details
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

### 2. GET `/technicians/active-jobs`

**Description:** Get active jobs for the authenticated technician (claimed by technician, not completed, not overdue)

**Authentication:** Required - Technician only

**Query Parameters:**

- `jobType` (optional): Filter by job type
- `priority` (optional): Filter by priority
- `search` (optional): Search in description, notes, and job type
- `startDate` (optional): Filter jobs from this date
- `endDate` (optional): Filter jobs until this date
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `sortBy` (optional): Field to sort by (default: dueDate)
- `sortOrder` (optional): Sort order - "asc" or "desc" (default: asc)

**Filters Applied:**

- `assignedTechnician`: Current technician ID
- `status`: ["Pending", "Scheduled"] (active statuses)
- `dueDate`: >= current date (not overdue)

**Response:** Same structure as my-jobs but only includes active jobs

### 3. GET `/technicians/overdue-jobs`

**Description:** Get overdue jobs for the authenticated technician (assigned to technician, due date is behind, not completed)

**Authentication:** Required - Technician only

**Query Parameters:**

- `jobType` (optional): Filter by job type
- `priority` (optional): Filter by priority
- `search` (optional): Search in description, notes, and job type
- `startDate` (optional): Filter jobs from this date
- `endDate` (optional): Filter jobs until this date
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `sortBy` (optional): Field to sort by (default: dueDate)
- `sortOrder` (optional): Sort order - "asc" or "desc" (default: asc)

**Filters Applied:**

- `assignedTechnician`: Current technician ID
- `dueDate`: < current date (overdue)
- `status`: != "Completed" (not completed)

**Response:** Same structure as my-jobs but only includes overdue jobs

### 4. GET `/technicians/completed-jobs`

**Description:** Get completed jobs for the authenticated technician (assigned to technician, status is completed)

**Authentication:** Required - Technician only

**Query Parameters:**

- `jobType` (optional): Filter by job type
- `priority` (optional): Filter by priority
- `search` (optional): Search in description, notes, and job type
- `startDate` (optional): Filter jobs completed from this date
- `endDate` (optional): Filter jobs completed until this date
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)
- `sortBy` (optional): Field to sort by (default: completedAt)
- `sortOrder` (optional): Sort order - "asc" or "desc" (default: desc)

**Filters Applied:**

- `assignedTechnician`: Current technician ID
- `status`: "Completed" (only completed jobs)

**Response:** Same structure as my-jobs but only includes completed jobs

## Job Object Structure

Each job in the response includes:

- `id`: Job ID
- `job_id`: Unique job identifier
- `property`: Property details (populated)
- `jobType`: Type of job
- `dueDate`: Due date
- `assignedTechnician`: Assigned technician details (populated)
- `status`: Current status
- `description`: Job description
- `priority`: Priority level
- `completedAt`: Completion date (if completed)
- `estimatedDuration`: Estimated duration in hours
- `actualDuration`: Actual duration in hours
- `cost`: Cost breakdown (material, labor, total)
- `notes`: Additional notes
- `isOverdue`: Boolean indicating if job is overdue
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp
- `owner`: Owner information
- `createdBy`: Creator information
- `lastUpdatedBy`: Last updater information

## Error Responses

**403 Forbidden:**

```json
{
  "status": "error",
  "message": "Only technicians can access their jobs"
}
```

**500 Internal Server Error:**

```json
{
  "status": "error",
  "message": "Failed to retrieve [my/active/overdue] jobs"
}
```

## Usage Examples

### Get all my jobs

```bash
GET /api/technicians/my-jobs
Authorization: Bearer <technician_token>
```

### Get active jobs with filtering

```bash
GET /api/technicians/active-jobs?jobType=Electrical&priority=High&page=1&limit=20
Authorization: Bearer <technician_token>
```

### Get overdue jobs with search

```bash
GET /api/technicians/overdue-jobs?search=electrical&sortBy=dueDate&sortOrder=asc
Authorization: Bearer <technician_token>
```

### Get completed jobs with performance metrics

```bash
GET /api/technicians/completed-jobs?startDate=2024-01-01&endDate=2024-12-31&sortBy=completedAt&sortOrder=desc
Authorization: Bearer <technician_token>
```

## Frontend Integration

These routes are ready for frontend integration. The paginated response structure makes it easy to implement:

1. **Job Tables**: Display jobs in paginated tables
2. **Dashboard Widgets**: Use statistics for dashboard cards
3. **Filtering**: Implement filters using query parameters
4. **Search**: Add search functionality
5. **Sorting**: Allow sorting by different fields

The routes provide all necessary data for a complete job management interface for technicians.
