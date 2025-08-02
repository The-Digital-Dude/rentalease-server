# PropertyManager Property & Job Management Documentation

## Overview

PropertyManagers can view and manage their assigned properties and associated jobs through the RentalEase CRM system. This documentation covers how PropertyManagers can access their property list, view jobs for their assigned properties, and manage job information.

## Table of Contents

1. [Property Management](#property-management)
2. [Job Management](#job-management)
3. [API Reference](#api-reference)
4. [Usage Examples](#usage-examples)
5. [Frontend Integration](#frontend-integration)
6. [Access Control](#access-control)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Property Management

### View Assigned Properties

PropertyManagers can view all properties they are assigned to manage.

**Endpoint**: `GET /api/properties`

**Headers**:

```http
Authorization: Bearer <propertymanager_jwt_token>
Content-Type: application/json
```

**Query Parameters**:

- `status` - Filter by property status (Active, Inactive)
- `region` - Filter by region
- `propertyType` - Filter by property type (House, Apartment, Townhouse, Commercial, Other)
- `page` - Page number for pagination
- `limit` - Number of items per page
- `sortBy` - Sort field (createdAt, address, region)
- `sortOrder` - Sort order (asc, desc)

**Response**:

```json
{
  "success": true,
  "data": {
    "properties": [
      {
        "id": "507f1f77bcf86cd799439013",
        "address": {
          "street": "456 Property Street",
          "suburb": "Property Suburb",
          "state": "NSW",
          "postcode": "2001",
          "fullAddress": "456 Property Street, Property Suburb NSW 2001"
        },
        "propertyType": "House",
        "region": "Sydney Metro",
        "currentTenant": {
          "name": "John Tenant",
          "email": "tenant@example.com",
          "phone": "+61412345678"
        },
        "currentLandlord": {
          "name": "Jane Landlord",
          "email": "landlord@example.com",
          "phone": "+61412345679"
        },
        "complianceSchedule": {
          "gasCompliance": {
            "nextInspection": "2024-06-15T00:00:00.000Z",
            "status": "Due Soon"
          },
          "electricalSafety": {
            "nextInspection": "2024-07-20T00:00:00.000Z",
            "status": "Compliant"
          },
          "smokeAlarms": {
            "nextInspection": "2024-05-10T00:00:00.000Z",
            "status": "Overdue"
          }
        },
        "isActive": true,
        "assignedPropertyManager": {
          "id": "507f1f77bcf86cd799439011",
          "fullName": "John PropertyManager",
          "email": "john.propertymanager@agency.com"
        },
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T12:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    },
    "summary": {
      "totalProperties": 1,
      "activeProperties": 1,
      "inactiveProperties": 0,
      "overdueCompliance": 1,
      "dueSoonCompliance": 1
    }
  }
}
```

### View Single Property Details

**Endpoint**: `GET /api/properties/:id`

**Response**:

```json
{
  "success": true,
  "data": {
    "property": {
      "id": "507f1f77bcf86cd799439013",
      "address": {
        "street": "456 Property Street",
        "suburb": "Property Suburb",
        "state": "NSW",
        "postcode": "2001",
        "fullAddress": "456 Property Street, Property Suburb NSW 2001"
      },
      "propertyType": "House",
      "region": "Sydney Metro",
      "currentTenant": {
        "name": "John Tenant",
        "email": "tenant@example.com",
        "phone": "+61412345678"
      },
      "currentLandlord": {
        "name": "Jane Landlord",
        "email": "landlord@example.com",
        "phone": "+61412345679"
      },
      "complianceSchedule": {
        "gasCompliance": {
          "nextInspection": "2024-06-15T00:00:00.000Z",
          "required": true,
          "status": "Due Soon"
        },
        "electricalSafety": {
          "nextInspection": "2024-07-20T00:00:00.000Z",
          "required": true,
          "status": "Compliant"
        },
        "smokeAlarms": {
          "nextInspection": "2024-05-10T00:00:00.000Z",
          "required": true,
          "status": "Overdue"
        },
        "poolSafety": {
          "nextInspection": null,
          "required": false,
          "status": "Not Required"
        }
      },
      "complianceSummary": {
        "total": 3,
        "compliant": 1,
        "dueSoon": 1,
        "overdue": 1,
        "complianceScore": 33
      },
      "isActive": true,
      "assignedPropertyManager": {
        "id": "507f1f77bcf86cd799439011",
        "fullName": "John PropertyManager",
        "email": "john.propertymanager@agency.com"
      },
      "notes": "Property requires regular maintenance due to age",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T12:30:00.000Z"
    }
  }
}
```

### Update Property Information

PropertyManagers can update certain property information for their assigned properties.

**Endpoint**: `PUT /api/properties/:id`

**Request Body** (only updatable fields):

```json
{
  "currentTenant": {
    "name": "Updated Tenant Name",
    "email": "updated.tenant@example.com",
    "phone": "+61412345680"
  },
  "currentLandlord": {
    "name": "Updated Landlord Name",
    "email": "updated.landlord@example.com",
    "phone": "+61412345681"
  },
  "notes": "Updated property notes and observations"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Property updated successfully",
  "data": {
    "property": {
      "id": "507f1f77bcf86cd799439013",
      "currentTenant": {
        "name": "Updated Tenant Name",
        "email": "updated.tenant@example.com",
        "phone": "+61412345680"
      },
      "currentLandlord": {
        "name": "Updated Landlord Name",
        "email": "updated.landlord@example.com",
        "phone": "+61412345681"
      },
      "notes": "Updated property notes and observations",
      "updatedAt": "2024-01-15T14:30:00.000Z"
    }
  }
}
```

## Job Management

### View Jobs for Assigned Properties

PropertyManagers can view all jobs related to their assigned properties.

**Endpoint**: `GET /api/jobs`

**Headers**:

```http
Authorization: Bearer <propertymanager_jwt_token>
Content-Type: application/json
```

**Query Parameters**:

- `status` - Filter by job status (Pending, In Progress, Completed, Cancelled)
- `priority` - Filter by priority (Low, Medium, High, Urgent)
- `jobType` - Filter by job type (Maintenance, Repair, Inspection, Compliance)
- `propertyId` - Filter by specific property
- `dueDate` - Filter by due date (YYYY-MM-DD)
- `page` - Page number for pagination
- `limit` - Number of items per page
- `sortBy` - Sort field (createdAt, dueDate, priority, status)
- `sortOrder` - Sort order (asc, desc)

**Response**:

```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "id": "507f1f77bcf86cd799439020",
        "job_id": "JOB-2024-001",
        "title": "Fix leaking tap in kitchen",
        "description": "Kitchen tap is leaking and needs repair",
        "jobType": "Repair",
        "priority": "Medium",
        "status": "In Progress",
        "dueDate": "2024-01-20T00:00:00.000Z",
        "estimatedDuration": "2 hours",
        "property": {
          "id": "507f1f77bcf86cd799439013",
          "address": {
            "street": "456 Property Street",
            "suburb": "Property Suburb",
            "state": "NSW",
            "postcode": "2001"
          }
        },
        "assignedTechnician": {
          "id": "507f1f77bcf86cd799439025",
          "fullName": "Mike Technician",
          "email": "mike.technician@agency.com"
        },
        "createdBy": {
          "userType": "Agency",
          "userId": "507f1f77bcf86cd799439012"
        },
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T12:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    },
    "summary": {
      "totalJobs": 1,
      "pendingJobs": 0,
      "inProgressJobs": 1,
      "completedJobs": 0,
      "overdueJobs": 0,
      "urgentJobs": 0
    }
  }
}
```

### View Single Job Details

**Endpoint**: `GET /api/jobs/:id`

**Response**:

```json
{
  "success": true,
  "data": {
    "job": {
      "id": "507f1f77bcf86cd799439020",
      "job_id": "JOB-2024-001",
      "title": "Fix leaking tap in kitchen",
      "description": "Kitchen tap is leaking and needs repair. Tenant reported water damage to cabinet below sink.",
      "jobType": "Repair",
      "priority": "Medium",
      "status": "In Progress",
      "dueDate": "2024-01-20T00:00:00.000Z",
      "estimatedDuration": "2 hours",
      "actualDuration": null,
      "property": {
        "id": "507f1f77bcf86cd799439013",
        "address": {
          "street": "456 Property Street",
          "suburb": "Property Suburb",
          "state": "NSW",
          "postcode": "2001",
          "fullAddress": "456 Property Street, Property Suburb NSW 2001"
        },
        "currentTenant": {
          "name": "John Tenant",
          "email": "tenant@example.com",
          "phone": "+61412345678"
        }
      },
      "assignedTechnician": {
        "id": "507f1f77bcf86cd799439025",
        "fullName": "Mike Technician",
        "email": "mike.technician@agency.com",
        "phone": "+61412345682"
      },
      "jobDetails": {
        "location": "Kitchen",
        "accessInstructions": "Tenant will be home between 9 AM and 5 PM",
        "specialRequirements": "Bring replacement tap and sealant",
        "photos": [
          "https://example.com/photos/leaking-tap-1.jpg",
          "https://example.com/photos/leaking-tap-2.jpg"
        ]
      },
      "progress": {
        "currentStep": "Technician assigned",
        "completedSteps": ["Job created", "Technician assigned"],
        "pendingSteps": [
          "Technician arrival",
          "Work completion",
          "Quality check",
          "Job closure"
        ]
      },
      "communications": [
        {
          "id": "507f1f77bcf86cd799439030",
          "type": "Comment",
          "message": "Tenant confirmed availability for tomorrow",
          "createdBy": {
            "userType": "PropertyManager",
            "userId": "507f1f77bcf86cd799439011"
          },
          "createdAt": "2024-01-15T14:00:00.000Z"
        }
      ],
      "createdBy": {
        "userType": "Agency",
        "userId": "507f1f77bcf86cd799439012"
      },
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T14:00:00.000Z"
    }
  }
}
```

### Add Comments to Jobs

PropertyManagers can add comments and updates to jobs for their assigned properties.

**Endpoint**: `POST /api/jobs/:id/comments`

**Request Body**:

```json
{
  "message": "Tenant has confirmed they will be available for the technician visit tomorrow between 9 AM and 5 PM.",
  "type": "Comment"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "comment": {
      "id": "507f1f77bcf86cd799439031",
      "message": "Tenant has confirmed they will be available for the technician visit tomorrow between 9 AM and 5 PM.",
      "type": "Comment",
      "createdBy": {
        "userType": "PropertyManager",
        "userId": "507f1f77bcf86cd799439011",
        "fullName": "John PropertyManager"
      },
      "createdAt": "2024-01-15T15:00:00.000Z"
    }
  }
}
```

### View Job History

**Endpoint**: `GET /api/jobs/:id/history`

**Response**:

```json
{
  "success": true,
  "data": {
    "jobHistory": [
      {
        "id": "507f1f77bcf86cd799439040",
        "action": "Job Created",
        "description": "Job JOB-2024-001 was created by Agency",
        "timestamp": "2024-01-15T10:00:00.000Z",
        "user": {
          "userType": "Agency",
          "userId": "507f1f77bcf86cd799439012",
          "fullName": "Test Agency"
        }
      },
      {
        "id": "507f1f77bcf86cd799439041",
        "action": "Technician Assigned",
        "description": "Mike Technician was assigned to the job",
        "timestamp": "2024-01-15T12:00:00.000Z",
        "user": {
          "userType": "Agency",
          "userId": "507f1f77bcf86cd799439012",
          "fullName": "Test Agency"
        }
      },
      {
        "id": "507f1f77bcf86cd799439042",
        "action": "Comment Added",
        "description": "PropertyManager added a comment about tenant availability",
        "timestamp": "2024-01-15T14:00:00.000Z",
        "user": {
          "userType": "PropertyManager",
          "userId": "507f1f77bcf86cd799439011",
          "fullName": "John PropertyManager"
        }
      }
    ]
  }
}
```

## API Reference

### Property Management Endpoints

| Endpoint              | Method | Description                 |
| --------------------- | ------ | --------------------------- |
| `/api/properties`     | GET    | List assigned properties    |
| `/api/properties/:id` | GET    | Get property details        |
| `/api/properties/:id` | PUT    | Update property information |

### Job Management Endpoints

| Endpoint                 | Method | Description                       |
| ------------------------ | ------ | --------------------------------- |
| `/api/jobs`              | GET    | List jobs for assigned properties |
| `/api/jobs/:id`          | GET    | Get job details                   |
| `/api/jobs/:id/comments` | POST   | Add comment to job                |
| `/api/jobs/:id/history`  | GET    | Get job history                   |

### Response Codes

| Code  | Description                          |
| ----- | ------------------------------------ |
| `200` | Success                              |
| `400` | Bad request (validation error)       |
| `401` | Unauthorized                         |
| `403` | Forbidden (not assigned to property) |
| `404` | Property/Job not found               |
| `500` | Server error                         |

## Usage Examples

### JavaScript/Node.js

```javascript
// Get assigned properties
const getAssignedProperties = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters);
    const response = await fetch(`/api/properties?${queryParams}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${propertyManagerToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch properties:", error);
    throw error;
  }
};

// Get property details
const getPropertyDetails = async (propertyId) => {
  try {
    const response = await fetch(`/api/properties/${propertyId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${propertyManagerToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch property details:", error);
    throw error;
  }
};

// Update property information
const updateProperty = async (propertyId, updateData) => {
  try {
    const response = await fetch(`/api/properties/${propertyId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${propertyManagerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to update property:", error);
    throw error;
  }
};

// Get jobs for assigned properties
const getJobs = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters);
    const response = await fetch(`/api/jobs?${queryParams}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${propertyManagerToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    throw error;
  }
};

// Get job details
const getJobDetails = async (jobId) => {
  try {
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${propertyManagerToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch job details:", error);
    throw error;
  }
};

// Add comment to job
const addJobComment = async (jobId, message) => {
  try {
    const response = await fetch(`/api/jobs/${jobId}/comments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${propertyManagerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, type: "Comment" }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to add comment:", error);
    throw error;
  }
};
```

### cURL Examples

#### Get Assigned Properties

```bash
curl -X GET "http://localhost:3000/api/properties?status=Active&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_PROPERTYMANAGER_TOKEN"
```

#### Get Property Details

```bash
curl -X GET http://localhost:3000/api/properties/PROPERTY_ID \
  -H "Authorization: Bearer YOUR_PROPERTYMANAGER_TOKEN"
```

#### Update Property

```bash
curl -X PUT http://localhost:3000/api/properties/PROPERTY_ID \
  -H "Authorization: Bearer YOUR_PROPERTYMANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentTenant": {
      "name": "Updated Tenant Name",
      "email": "updated.tenant@example.com",
      "phone": "+61412345680"
    },
    "notes": "Updated property notes"
  }'
```

#### Get Jobs

```bash
curl -X GET "http://localhost:3000/api/jobs?status=In Progress&priority=Medium" \
  -H "Authorization: Bearer YOUR_PROPERTYMANAGER_TOKEN"
```

#### Get Job Details

```bash
curl -X GET http://localhost:3000/api/jobs/JOB_ID \
  -H "Authorization: Bearer YOUR_PROPERTYMANAGER_TOKEN"
```

#### Add Job Comment

```bash
curl -X POST http://localhost:3000/api/jobs/JOB_ID/comments \
  -H "Authorization: Bearer YOUR_PROPERTYMANAGER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tenant confirmed availability for technician visit",
    "type": "Comment"
  }'
```

## Frontend Integration

### React Dashboard Component

```jsx
import React, { useState, useEffect } from "react";

const PropertyManagerDashboard = () => {
  const [properties, setProperties] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch assigned properties
  const fetchProperties = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/properties", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(
            "propertyManagerToken"
          )}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setProperties(data.data.properties);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Failed to fetch properties");
    } finally {
      setLoading(false);
    }
  };

  // Fetch jobs for assigned properties
  const fetchJobs = async () => {
    try {
      const response = await fetch("/api/jobs", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(
            "propertyManagerToken"
          )}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setJobs(data.data.jobs);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    }
  };

  // Add comment to job
  const addJobComment = async (jobId, message) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/comments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem(
            "propertyManagerToken"
          )}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, type: "Comment" }),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh jobs to show new comment
        fetchJobs();
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  useEffect(() => {
    fetchProperties();
    fetchJobs();
  }, []);

  return (
    <div className="property-manager-dashboard">
      <h2>PropertyManager Dashboard</h2>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div>Loading properties...</div>
      ) : (
        <div className="dashboard-content">
          {/* Properties Section */}
          <div className="properties-section">
            <h3>My Assigned Properties ({properties.length})</h3>
            <div className="properties-grid">
              {properties.map((property) => (
                <div key={property.id} className="property-card">
                  <h4>{property.address.fullAddress}</h4>
                  <p>Type: {property.propertyType}</p>
                  <p>Region: {property.region}</p>
                  <p>Tenant: {property.currentTenant.name}</p>
                  <p>
                    Compliance Score:{" "}
                    {property.complianceSummary?.complianceScore || 0}%
                  </p>
                  <button
                    onClick={() =>
                      (window.location.href = `/properties/${property.id}`)
                    }
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Jobs Section */}
          <div className="jobs-section">
            <h3>Active Jobs ({jobs.length})</h3>
            <div className="jobs-list">
              {jobs.map((job) => (
                <div key={job.id} className="job-card">
                  <h4>{job.title}</h4>
                  <p>Property: {job.property.address.fullAddress}</p>
                  <p>Status: {job.status}</p>
                  <p>Priority: {job.priority}</p>
                  <p>Due: {new Date(job.dueDate).toLocaleDateString()}</p>
                  <button
                    onClick={() => (window.location.href = `/jobs/${job.id}`)}
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyManagerDashboard;
```

### Property Details Component

```jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const PropertyDetails = () => {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      try {
        const response = await fetch(`/api/properties/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "propertyManagerToken"
            )}`,
          },
        });
        const data = await response.json();

        if (data.success) {
          setProperty(data.data.property);
        } else {
          setError(data.message);
        }
      } catch (error) {
        setError("Failed to fetch property details");
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyDetails();
  }, [id]);

  if (loading) return <div>Loading property details...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!property) return <div>Property not found</div>;

  return (
    <div className="property-details">
      <h2>Property Details</h2>

      <div className="property-info">
        <h3>{property.address.fullAddress}</h3>

        <div className="info-section">
          <h4>Property Information</h4>
          <p>
            <strong>Type:</strong> {property.propertyType}
          </p>
          <p>
            <strong>Region:</strong> {property.region}
          </p>
          <p>
            <strong>Status:</strong> {property.isActive ? "Active" : "Inactive"}
          </p>
        </div>

        <div className="info-section">
          <h4>Tenant Information</h4>
          <p>
            <strong>Name:</strong> {property.currentTenant.name}
          </p>
          <p>
            <strong>Email:</strong> {property.currentTenant.email}
          </p>
          <p>
            <strong>Phone:</strong> {property.currentTenant.phone}
          </p>
        </div>

        <div className="info-section">
          <h4>Landlord Information</h4>
          <p>
            <strong>Name:</strong> {property.currentLandlord.name}
          </p>
          <p>
            <strong>Email:</strong> {property.currentLandlord.email}
          </p>
          <p>
            <strong>Phone:</strong> {property.currentLandlord.phone}
          </p>
        </div>

        <div className="info-section">
          <h4>Compliance Status</h4>
          <div className="compliance-grid">
            {Object.entries(property.complianceSchedule).map(
              ([key, compliance]) => (
                <div
                  key={key}
                  className={`compliance-item ${compliance.status.toLowerCase()}`}
                >
                  <h5>{key.replace(/([A-Z])/g, " $1").trim()}</h5>
                  <p>Status: {compliance.status}</p>
                  {compliance.nextInspection && (
                    <p>
                      Next Inspection:{" "}
                      {new Date(compliance.nextInspection).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )
            )}
          </div>
          <p>
            <strong>Overall Compliance Score:</strong>{" "}
            {property.complianceSummary.complianceScore}%
          </p>
        </div>

        {property.notes && (
          <div className="info-section">
            <h4>Notes</h4>
            <p>{property.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyDetails;
```

## Access Control

### Property Access Rules

1. **Assigned Properties Only**: PropertyManagers can only access properties they are assigned to
2. **Read Access**: Can view all property details and compliance information
3. **Limited Write Access**: Can update tenant/landlord information and notes
4. **No Delete Access**: Cannot delete properties

### Job Access Rules

1. **Assigned Property Jobs**: Can only view jobs for their assigned properties
2. **Read Access**: Can view all job details, history, and communications
3. **Comment Access**: Can add comments and updates to jobs
4. **No Job Creation**: Cannot create new jobs
5. **No Status Changes**: Cannot change job status or assign technicians

### Security Features

- **JWT Token Validation**: All requests require valid PropertyManager token
- **Property Assignment Validation**: System validates PropertyManager assignment before allowing access
- **Audit Logging**: All PropertyManager actions are logged for security monitoring
- **Rate Limiting**: API requests are rate-limited to prevent abuse

## Best Practices

### Property Management

1. **Regular Monitoring**

   - Check compliance status regularly
   - Monitor tenant and landlord information
   - Update property notes as needed

2. **Communication**

   - Keep tenant and landlord information current
   - Document important property observations
   - Report issues promptly

3. **Compliance Tracking**
   - Monitor upcoming compliance deadlines
   - Track overdue inspections
   - Maintain compliance documentation

### Job Management

1. **Active Monitoring**

   - Regularly check job status and progress
   - Monitor job communications
   - Track technician assignments

2. **Communication**

   - Add relevant comments and updates
   - Provide context for job requirements
   - Coordinate with tenants and technicians

3. **Documentation**
   - Keep detailed job notes
   - Document tenant availability
   - Record special requirements

## Troubleshooting

### Common Issues

#### 1. "Property not found" Error

- **Cause**: PropertyManager not assigned to the property
- **Solution**: Contact agency to verify assignment
- **Prevention**: Check property assignment status

#### 2. "Job not found" Error

- **Cause**: Job doesn't exist or not related to assigned properties
- **Solution**: Verify job exists and property assignment
- **Prevention**: Use job list from assigned properties

#### 3. "Access denied" Error

- **Cause**: Invalid or expired token
- **Solution**: Re-login to get new token
- **Prevention**: Implement token refresh logic

#### 4. "No properties assigned" Error

- **Cause**: PropertyManager has no property assignments
- **Solution**: Contact agency for property assignments
- **Prevention**: Regular assignment monitoring

### Debug Mode

Enable debug logging for PropertyManager operations:

```bash
DEBUG=propertymanager:properties,propertymanager:jobs
```

### Health Check

Verify PropertyManager services:

```bash
curl -X GET http://localhost:3000/api/health/property-manager-services
```

Expected response:

```json
{
  "status": "ok",
  "services": {
    "property_management": "enabled",
    "job_management": "enabled",
    "access_control": "enabled"
  }
}
```

## Support

For assistance with PropertyManager property and job management:

- **Email**: support@rentalease.com
- **Documentation**: https://docs.rentalease.com/property-manager/properties-jobs
- **API Status**: https://status.rentalease.com

---

_This documentation is for PropertyManager Property & Job Management system v1.0.0_
