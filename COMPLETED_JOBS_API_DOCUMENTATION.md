# Completed Jobs API Documentation

This document describes the completed-jobs endpoint for technicians to view their completed job history with performance metrics.

## Endpoint Overview

### GET `/api/technicians/completed-jobs`

**Description:** Retrieve all completed jobs for the authenticated technician with comprehensive performance analytics.

**Authentication:** Required - Technician only

**Base URL:** `http://localhost:4000/api/v1/technicians/completed-jobs`

## Query Parameters

| Parameter   | Type   | Required | Default     | Description                                                                           |
| ----------- | ------ | -------- | ----------- | ------------------------------------------------------------------------------------- |
| `jobType`   | string | No       | -           | Filter by job type (Gas, Electrical, Smoke, Repairs, Pool Safety, Routine Inspection) |
| `priority`  | string | No       | -           | Filter by priority (Low, Medium, High, Urgent)                                        |
| `search`    | string | No       | -           | Search in description, notes, and job type                                            |
| `startDate` | string | No       | -           | Filter jobs completed from this date (YYYY-MM-DD)                                     |
| `endDate`   | string | No       | -           | Filter jobs completed until this date (YYYY-MM-DD)                                    |
| `page`      | number | No       | 1           | Page number for pagination                                                            |
| `limit`     | number | No       | 10          | Number of items per page (max: 100)                                                   |
| `sortBy`    | string | No       | completedAt | Field to sort by (completedAt, dueDate, jobType, priority)                            |
| `sortOrder` | string | No       | desc        | Sort order (asc, desc)                                                                |

## Request Headers

```
Authorization: Bearer <technician_jwt_token>
Content-Type: application/json
```

## Response Structure

### Success Response (200)

```json
{
  "status": "success",
  "message": "Completed jobs retrieved successfully",
  "data": {
    "jobs": [
      {
        "id": "507f1f77bcf86cd799439011",
        "job_id": "J-123456",
        "property": {
          "id": "507f1f77bcf86cd799439012",
          "address": "123 Main St, City, State",
          "propertyType": "Residential",
          "region": "North",
          "status": "Active"
        },
        "jobType": "Electrical",
        "dueDate": "2024-01-15T00:00:00.000Z",
        "completedAt": "2024-01-14T10:30:00.000Z",
        "status": "Completed",
        "description": "Electrical safety inspection",
        "priority": "High",
        "estimatedDuration": 2,
        "actualDuration": 1.5,
        "cost": {
          "material": 50,
          "labor": 75,
          "total": 125
        },
        "notes": "All electrical systems checked and certified",
        "reportFile": "reports/electrical_inspection_2024_01_14.pdf",
        "hasInvoice": true,
        "invoice": "507f1f77bcf86cd799439013"
      }
    ],
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
        "Completed": 50
      },
      "totalJobs": 50
    }
  }
}
```

## Statistics Explanation

### `statistics` Object

- **`statusCounts`**: Object containing count of jobs by status (for completed jobs, this will only show "Completed" count)
- **`totalJobs`**: Total number of completed jobs

## Error Responses

### 401 Unauthorized

```json
{
  "status": "error",
  "message": "Access token is required"
}
```

### 403 Forbidden

```json
{
  "status": "error",
  "message": "Only technicians can access their completed jobs"
}
```

### 500 Internal Server Error

```json
{
  "status": "error",
  "message": "Failed to retrieve completed jobs"
}
```

## Usage Examples

### Get All Completed Jobs

```bash
curl -X GET "http://localhost:4000/api/v1/technicians/completed-jobs" \
  -H "Authorization: Bearer <technician_token>"
```

### Get Completed Jobs with Filtering

```bash
curl -X GET "http://localhost:3000/api/technicians/completed-jobs?jobType=Electrical&priority=High&limit=20" \
  -H "Authorization: Bearer <technician_token>"
```

### Get Completed Jobs with Date Range

```bash
curl -X GET "http://localhost:3000/api/technicians/completed-jobs?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer <technician_token>"
```

### Get Completed Jobs with Search

```bash
curl -X GET "http://localhost:3000/api/technicians/completed-jobs?search=electrical&sortBy=completedAt&sortOrder=desc" \
  -H "Authorization: Bearer <technician_token>"
```

### Get Completed Jobs Statistics

```bash
curl -X GET "http://localhost:3000/api/technicians/completed-jobs?limit=1" \
  -H "Authorization: Bearer <technician_token>"
```

## Frontend Integration

### React Example

```javascript
import { useState, useEffect } from "react";
import axios from "axios";

const CompletedJobs = () => {
  const [completedJobs, setCompletedJobs] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompletedJobs = async () => {
      try {
        const response = await axios.get("/api/technicians/completed-jobs", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        setCompletedJobs(response.data.data.jobs);
        setStatistics(response.data.data.statistics);
      } catch (error) {
        console.error("Error fetching completed jobs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedJobs();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Completed Jobs</h2>

      {/* Statistics */}
      {statistics.statusCounts && (
        <div className="metrics">
          <h3>Job Statistics</h3>
          <p>Total Completed: {statistics.totalJobs}</p>
          <p>Status Breakdown: {JSON.stringify(statistics.statusCounts)}</p>
        </div>
      )}

      {/* Jobs List */}
      <div className="jobs-list">
        {completedJobs.map((job) => (
          <div key={job.id} className="job-card">
            <h4>
              {job.jobType} - {job.job_id}
            </h4>
            <p>Property: {job.property.address}</p>
            <p>Completed: {new Date(job.completedAt).toLocaleDateString()}</p>
            <p>Duration: {job.actualDuration}h</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompletedJobs;
```

### Vue.js Example

```javascript
<template>
  <div>
    <h2>Completed Jobs</h2>

          <!-- Statistics -->
      <div v-if="statistics.statusCounts" class="metrics">
        <h3>Job Statistics</h3>
        <p>Total Completed: {{ statistics.totalJobs }}</p>
        <p>Status Breakdown: {{ JSON.stringify(statistics.statusCounts) }}</p>
      </div>

    <!-- Jobs List -->
    <div class="jobs-list">
      <div v-for="job in completedJobs" :key="job.id" class="job-card">
        <h4>{{ job.jobType }} - {{ job.job_id }}</h4>
        <p>Property: {{ job.property.address }}</p>
        <p>Completed: {{ formatDate(job.completedAt) }}</p>
        <p>Duration: {{ job.actualDuration }}h</p>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      completedJobs: [],
      statistics: {},
      loading: true
    };
  },
  async mounted() {
    await this.fetchCompletedJobs();
  },
  methods: {
    async fetchCompletedJobs() {
      try {
        const response = await axios.get('/api/technicians/completed-jobs', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        this.completedJobs = response.data.data.jobs;
        this.statistics = response.data.data.statistics;
      } catch (error) {
        console.error('Error fetching completed jobs:', error);
      } finally {
        this.loading = false;
      }
    },
    formatDate(dateString) {
      return new Date(dateString).toLocaleDateString();
    }
  }
};
</script>
```

## Testing

Use the provided test file `src/examples/testCompletedJobs.js` to verify the endpoint functionality:

```bash
# Update the TECHNICIAN_TOKEN in the test file
node src/examples/testCompletedJobs.js
```

## Notes

- The endpoint automatically filters for jobs with `status: "Completed"`
- Date filtering uses the `completedAt` field, not the `dueDate` field
- The endpoint returns the same structure as other job endpoints (my-jobs, active-jobs, overdue-jobs) for component compatibility
- All job details are populated with related property and user information
