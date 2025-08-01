# Technician Dashboard API Documentation

## Overview

The Technician Dashboard API provides comprehensive statistics and visualizations for technicians to monitor their job performance, payment status, and weekly progress. This API aggregates data from jobs and payments to create a complete dashboard view.

## Endpoint

### GET `/api/technicians/dashboard`

**Description:** Get comprehensive dashboard statistics for the authenticated technician

**Authentication:** Required - Technician only

**Base URL:** `http://localhost:4000/api/v1/technicians/dashboard`

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
  "message": "Dashboard data retrieved successfully",
  "data": {
    "quickStats": {
      "totalJobs": 50,
      "activeJobs": 15,
      "scheduledJobs": 10,
      "completedJobs": 20,
      "overdueJobs": 5
    },
    "jobStatusDistribution": [
      {
        "status": "Completed",
        "count": 20,
        "percentage": 40
      },
      {
        "status": "Active",
        "count": 10,
        "percentage": 20
      },
      {
        "status": "Scheduled",
        "count": 10,
        "percentage": 20
      },
      {
        "status": "Overdue",
        "count": 5,
        "percentage": 20
      }
    ],
    "weeklyProgress": [
      {
        "day": "Sun",
        "completed": 2,
        "scheduled": 1
      },
      {
        "day": "Mon",
        "completed": 3,
        "scheduled": 2
      },
      {
        "day": "Tue",
        "completed": 5,
        "scheduled": 1
      },
      {
        "day": "Wed",
        "completed": 2,
        "scheduled": 4
      },
      {
        "day": "Thu",
        "completed": 4,
        "scheduled": 3
      },
      {
        "day": "Fri",
        "completed": 6,
        "scheduled": 2
      },
      {
        "day": "Sat",
        "completed": 1,
        "scheduled": 0
      }
    ],
    "recentJobs": [
      {
        "id": "507f1f77bcf86cd799439011",
        "job_id": "J-123456",
        "jobType": "Electrical",
        "status": "Completed",
        "dueDate": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z",
        "property": "123 Main St, City, State"
      }
    ],
    "paymentStats": {
      "totalPayments": 25,
      "pendingPayments": 8,
      "totalAmount": 1850,
      "pendingAmount": 640
    },
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

## Data Structure Explanation

### `quickStats` Object

Provides a quick overview of job counts:

- **`totalJobs`**: Total number of jobs assigned to the technician
- **`activeJobs`**: Jobs that are Pending or Scheduled with due dates not passed
- **`scheduledJobs`**: Jobs with status "Scheduled"
- **`completedJobs`**: Jobs with status "Completed"
- **`overdueJobs`**: Jobs that are not completed and have passed their due date

### `jobStatusDistribution` Array

Data for the pie chart showing job status distribution:

- **`status`**: Job status (Completed, Active, Scheduled, Overdue)
- **`count`**: Number of jobs in this status
- **`percentage`**: Percentage of total jobs (rounded to nearest integer)

### `weeklyProgress` Array

Data for the weekly progress bar chart showing daily activity:

- **`day`**: Day of the week (Sun, Mon, Tue, Wed, Thu, Fri, Sat)
- **`completed`**: Number of jobs completed on this day
- **`scheduled`**: Number of jobs scheduled for this day

### `recentJobs` Array

List of the 5 most recently updated jobs:

- **`id`**: Job ID
- **`job_id`**: Job reference number
- **`jobType`**: Type of job
- **`status`**: Current job status
- **`dueDate`**: Job due date
- **`updatedAt`**: Last update timestamp
- **`property`**: Property address

### `paymentStats` Object

Payment-related statistics:

- **`totalPayments`**: Total number of payments
- **`pendingPayments`**: Number of pending payments
- **`totalAmount`**: Total amount of all payments
- **`pendingAmount`**: Total amount of pending payments

## Usage Examples

### Get Dashboard Data

```bash
curl -X GET "http://localhost:4000/api/v1/technicians/dashboard" \
  -H "Authorization: Bearer <technician_token>"
```

### Frontend Integration (React)

```javascript
import { useState, useEffect } from "react";
import axios from "axios";

const TechnicianDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await axios.get("/api/v1/technicians/dashboard", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        setDashboardData(response.data.data);
      } catch (error) {
        console.error("Error fetching dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (!dashboardData) return <div>No data available</div>;

  return (
    <div className="dashboard">
      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-card">
          <h3>Total Jobs</h3>
          <p>{dashboardData.quickStats.totalJobs}</p>
        </div>
        <div className="stat-card">
          <h3>Active Jobs</h3>
          <p>{dashboardData.quickStats.activeJobs}</p>
        </div>
        <div className="stat-card">
          <h3>Completed</h3>
          <p>{dashboardData.quickStats.completedJobs}</p>
        </div>
        <div className="stat-card">
          <h3>Overdue</h3>
          <p>{dashboardData.quickStats.overdueJobs}</p>
        </div>
      </div>

      {/* Job Status Distribution Chart */}
      <div className="chart-container">
        <h3>Job Status Distribution</h3>
        {/* Use your preferred charting library */}
        <PieChart data={dashboardData.jobStatusDistribution} />
      </div>

      {/* Weekly Progress Chart */}
      <div className="chart-container">
        <h3>Weekly Progress</h3>
        <BarChart data={dashboardData.weeklyProgress} />
      </div>

      {/* Recent Jobs */}
      <div className="recent-jobs">
        <h3>Recent Activity</h3>
        {dashboardData.recentJobs.map((job) => (
          <div key={job.id} className="job-item">
            <span>{job.job_id}</span>
            <span>{job.jobType}</span>
            <span className={`status ${job.status.toLowerCase()}`}>
              {job.status}
            </span>
          </div>
        ))}
      </div>

      {/* Payment Stats */}
      <div className="payment-stats">
        <h3>Payment Overview</h3>
        <p>Total Payments: {dashboardData.paymentStats.totalPayments}</p>
        <p>Pending: {dashboardData.paymentStats.pendingPayments}</p>
        <p>Total Amount: ${dashboardData.paymentStats.totalAmount}</p>
        <p>Pending Amount: ${dashboardData.paymentStats.pendingAmount}</p>
      </div>
    </div>
  );
};

export default TechnicianDashboard;
```

### Chart Integration Examples

#### Pie Chart (Job Status Distribution)

```javascript
// Using Chart.js
import { Pie } from "react-chartjs-2";

const PieChart = ({ data }) => {
  const chartData = {
    labels: data.map((item) => item.status),
    datasets: [
      {
        data: data.map((item) => item.count),
        backgroundColor: [
          "#4CAF50", // Green for Completed
          "#FF9800", // Orange for Active
          "#2196F3", // Blue for Scheduled
          "#F44336", // Red for Overdue
        ],
      },
    ],
  };

  return <Pie data={chartData} />;
};
```

#### Bar Chart (Weekly Progress)

```javascript
// Using Chart.js
import { Bar } from "react-chartjs-2";

const BarChart = ({ data }) => {
  const chartData = {
    labels: data.map((item) => item.day),
    datasets: [
      {
        label: "Completed",
        data: data.map((item) => item.completed),
        backgroundColor: "#4CAF50",
      },
      {
        label: "Scheduled",
        data: data.map((item) => item.scheduled),
        backgroundColor: "#2196F3",
      },
    ],
  };

  return <Bar data={chartData} />;
};
```

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
  "message": "Only technicians can access their dashboard"
}
```

### 500 Internal Server Error

```json
{
  "status": "error",
  "message": "Failed to retrieve dashboard data"
}
```

## Performance Considerations

1. **Caching**: Consider caching dashboard data for 5-10 minutes to reduce database load
2. **Pagination**: Recent jobs are limited to 5 items for performance
3. **Aggregation**: Uses MongoDB aggregation for efficient data processing
4. **Indexing**: Ensure proper indexes on `assignedTechnician`, `status`, `dueDate`, and `completedAt` fields

## Data Refresh Strategy

- **Real-time**: Dashboard data is fetched fresh on each request
- **Auto-refresh**: Consider implementing auto-refresh every 5 minutes
- **Manual refresh**: Provide a refresh button for users to get latest data

## Security

- **Authentication**: Requires valid technician JWT token
- **Authorization**: Only technicians can access their own dashboard data
- **Data Isolation**: All data is filtered by technician ID
- **No sensitive data**: Only job and payment summaries are returned

## Testing

Use the provided test file to verify dashboard functionality:

```bash
node src/examples/testTechnicianDashboard.js
```

## Notes

- All dates are returned in ISO 8601 format
- Percentages are rounded to the nearest integer
- Weekly progress shows data for the last 7 days
- Recent jobs are sorted by `updatedAt` in descending order
- Payment amounts are in the base currency units
