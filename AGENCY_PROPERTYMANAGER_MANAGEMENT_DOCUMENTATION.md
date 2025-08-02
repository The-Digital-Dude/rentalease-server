# Agency PropertyManager Management Documentation

## Overview

Agencies can add and manage PropertyManagers through the RentalEase CRM system. PropertyManagers are employees or contractors who manage specific properties on behalf of the agency. This documentation covers the complete process of adding, managing, and assigning PropertyManagers.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Adding a PropertyManager](#adding-a-propertymanager)
3. [PropertyManager Assignment](#propertymanager-assignment)
4. [Managing PropertyManagers](#managing-propertymanagers)
5. [API Reference](#api-reference)
6. [Usage Examples](#usage-examples)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### Agency Requirements

- Agency must have an active account
- Agency must be authenticated with valid JWT token
- Agency must have proper permissions to manage PropertyManagers

### PropertyManager Requirements

- Valid email address
- Strong password (minimum 8 characters)
- Contact information (phone, address)
- Must be assigned to at least one property

## Adding a PropertyManager

### Step 1: Register PropertyManager

**Endpoint**: `POST /api/property-manager/auth/register`

**Headers**:

```http
Authorization: Bearer <agency_jwt_token>
Content-Type: application/json
```

**Request Body**:

```json
{
  "firstName": "John",
  "lastName": "PropertyManager",
  "email": "john.propertymanager@agency.com",
  "phone": "+61412345678",
  "password": "securepassword123",
  "address": {
    "street": "123 Manager Street",
    "suburb": "Manager Suburb",
    "state": "NSW",
    "postcode": "2000"
  }
}
```

**Response**:

```json
{
  "success": true,
  "message": "PropertyManager registered successfully",
  "data": {
    "propertyManager": {
      "id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "PropertyManager",
      "fullName": "John PropertyManager",
      "email": "john.propertymanager@agency.com",
      "phone": "+61412345678",
      "status": "Active",
      "availabilityStatus": "Available",
      "assignedProperties": [],
      "owner": {
        "ownerType": "Agency",
        "ownerId": "507f1f77bcf86cd799439012"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "credentials": {
      "email": "john.propertymanager@agency.com",
      "password": "securepassword123"
    }
  }
}
```

### Step 2: Assign Properties to PropertyManager

**Endpoint**: `POST /api/properties/:propertyId/assign-property-manager`

**Headers**:

```http
Authorization: Bearer <agency_jwt_token>
Content-Type: application/json
```

**Request Body**:

```json
{
  "propertyManagerId": "507f1f77bcf86cd799439011",
  "role": "Primary"
}
```

**Response**:

```json
{
  "success": true,
  "message": "PropertyManager assigned successfully",
  "data": {
    "property": {
      "id": "507f1f77bcf86cd799439013",
      "address": {
        "street": "456 Property Street",
        "suburb": "Property Suburb",
        "state": "NSW",
        "postcode": "2001"
      },
      "assignedPropertyManager": {
        "id": "507f1f77bcf86cd799439011",
        "fullName": "John PropertyManager",
        "email": "john.propertymanager@agency.com"
      }
    },
    "propertyManager": {
      "id": "507f1f77bcf86cd799439011",
      "fullName": "John PropertyManager",
      "assignedProperties": [
        {
          "propertyId": "507f1f77bcf86cd799439013",
          "assignedDate": "2024-01-15T11:00:00.000Z",
          "status": "Active",
          "role": "Primary"
        }
      ]
    }
  }
}
```

## PropertyManager Assignment

### Available Roles

| Role          | Description                           | Permissions                               |
| ------------- | ------------------------------------- | ----------------------------------------- |
| **Primary**   | Main PropertyManager for the property | Full access to property management        |
| **Secondary** | Backup PropertyManager                | Limited access, backup responsibilities   |
| **Backup**    | Emergency contact                     | Read-only access, emergency notifications |

### Assignment Status

| Status        | Description                                              |
| ------------- | -------------------------------------------------------- |
| **Active**    | PropertyManager is actively managing the property        |
| **Inactive**  | PropertyManager is temporarily not managing the property |
| **Suspended** | PropertyManager assignment is suspended                  |

### Bulk Property Assignment

**Endpoint**: `POST /api/properties/bulk-assign-property-manager`

**Request Body**:

```json
{
  "propertyManagerId": "507f1f77bcf86cd799439011",
  "propertyIds": [
    "507f1f77bcf86cd799439013",
    "507f1f77bcf86cd799439014",
    "507f1f77bcf86cd799439015"
  ],
  "role": "Primary"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Bulk assignment completed",
  "data": {
    "assignedProperties": 3,
    "failedAssignments": 0,
    "propertyManager": {
      "id": "507f1f77bcf86cd799439011",
      "fullName": "John PropertyManager",
      "totalAssignedProperties": 3
    }
  }
}
```

## Managing PropertyManagers

### View All PropertyManagers

**Endpoint**: `GET /api/property-managers`

**Headers**:

```http
Authorization: Bearer <agency_jwt_token>
```

**Query Parameters**:

- `status` - Filter by status (Active, Inactive, Suspended, Pending)
- `availabilityStatus` - Filter by availability (Available, Busy, Unavailable, On Leave)
- `page` - Page number for pagination
- `limit` - Number of items per page

**Response**:

```json
{
  "success": true,
  "data": {
    "propertyManagers": [
      {
        "id": "507f1f77bcf86cd799439011",
        "firstName": "John",
        "lastName": "PropertyManager",
        "fullName": "John PropertyManager",
        "email": "john.propertymanager@agency.com",
        "phone": "+61412345678",
        "status": "Active",
        "availabilityStatus": "Available",
        "assignedPropertiesCount": 3,
        "activePropertiesCount": 3,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "lastLogin": "2024-01-15T12:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

### View PropertyManager Details

**Endpoint**: `GET /api/property-managers/:id`

**Response**:

```json
{
  "success": true,
  "data": {
    "propertyManager": {
      "id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "PropertyManager",
      "fullName": "John PropertyManager",
      "email": "john.propertymanager@agency.com",
      "phone": "+61412345678",
      "address": {
        "street": "123 Manager Street",
        "suburb": "Manager Suburb",
        "state": "NSW",
        "postcode": "2000",
        "fullAddress": "123 Manager Street, Manager Suburb NSW 2000"
      },
      "status": "Active",
      "availabilityStatus": "Available",
      "assignedProperties": [
        {
          "propertyId": "507f1f77bcf86cd799439013",
          "assignedDate": "2024-01-15T11:00:00.000Z",
          "status": "Active",
          "role": "Primary",
          "property": {
            "address": {
              "street": "456 Property Street",
              "suburb": "Property Suburb",
              "state": "NSW",
              "postcode": "2001"
            }
          }
        }
      ],
      "assignmentSummary": {
        "totalProperties": 1,
        "activeProperties": 1,
        "inactiveProperties": 0,
        "primaryAssignments": 1,
        "secondaryAssignments": 0
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T12:30:00.000Z",
      "lastLogin": "2024-01-15T12:30:00.000Z",
      "lastActive": "2024-01-15T12:30:00.000Z"
    }
  }
}
```

### Update PropertyManager Status

**Endpoint**: `PATCH /api/property-managers/:id/status`

**Request Body**:

```json
{
  "status": "Active|Inactive|Suspended"
}
```

### Update PropertyManager Availability

**Endpoint**: `PATCH /api/property-managers/:id/availability`

**Request Body**:

```json
{
  "availabilityStatus": "Available|Busy|Unavailable|On Leave"
}
```

### Remove PropertyManager Assignment

**Endpoint**: `DELETE /api/properties/:propertyId/assign-property-manager`

**Headers**:

```http
Authorization: Bearer <agency_jwt_token>
```

**Response**:

```json
{
  "success": true,
  "message": "PropertyManager assignment removed successfully",
  "data": {
    "property": {
      "id": "507f1f77bcf86cd799439013",
      "assignedPropertyManager": null
    },
    "propertyManager": {
      "id": "507f1f77bcf86cd799439011",
      "assignedPropertiesCount": 0
    }
  }
}
```

## API Reference

### PropertyManager Management Endpoints

| Endpoint                                       | Method | Description                        |
| ---------------------------------------------- | ------ | ---------------------------------- |
| `/api/property-manager/auth/register`          | POST   | Register new PropertyManager       |
| `/api/property-managers`                       | GET    | List all PropertyManagers          |
| `/api/property-managers/:id`                   | GET    | Get PropertyManager details        |
| `/api/property-managers/:id/status`            | PATCH  | Update PropertyManager status      |
| `/api/property-managers/:id/availability`      | PATCH  | Update availability status         |
| `/api/properties/:id/assign-property-manager`  | POST   | Assign PropertyManager to property |
| `/api/properties/:id/assign-property-manager`  | DELETE | Remove PropertyManager assignment  |
| `/api/properties/bulk-assign-property-manager` | POST   | Bulk assign properties             |
| `/api/properties/available-property-managers`  | GET    | List available PropertyManagers    |

### Response Codes

| Code  | Description                          |
| ----- | ------------------------------------ |
| `200` | Success                              |
| `201` | Created successfully                 |
| `400` | Bad request (validation error)       |
| `401` | Unauthorized                         |
| `403` | Forbidden (insufficient permissions) |
| `404` | PropertyManager not found            |
| `409` | Conflict (already assigned)          |
| `500` | Server error                         |

## Usage Examples

### JavaScript/Node.js

```javascript
// Register a new PropertyManager
const registerPropertyManager = async (propertyManagerData) => {
  try {
    const response = await fetch("/api/property-manager/auth/register", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${agencyToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(propertyManagerData),
    });

    const data = await response.json();

    if (data.success) {
      console.log("PropertyManager registered:", data.data.propertyManager);
      return data.data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error("Registration failed:", error);
    throw error;
  }
};

// Assign PropertyManager to property
const assignPropertyManager = async (
  propertyId,
  propertyManagerId,
  role = "Primary"
) => {
  try {
    const response = await fetch(
      `/api/properties/${propertyId}/assign-property-manager`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${agencyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyManagerId,
          role,
        }),
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Assignment failed:", error);
    throw error;
  }
};

// Get all PropertyManagers
const getPropertyManagers = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams(filters);
    const response = await fetch(`/api/property-managers?${queryParams}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${agencyToken}`,
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch PropertyManagers:", error);
    throw error;
  }
};

// Bulk assign properties
const bulkAssignProperties = async (
  propertyManagerId,
  propertyIds,
  role = "Primary"
) => {
  try {
    const response = await fetch(
      "/api/properties/bulk-assign-property-manager",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${agencyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyManagerId,
          propertyIds,
          role,
        }),
      }
    );

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Bulk assignment failed:", error);
    throw error;
  }
};
```

### cURL Examples

#### Register PropertyManager

```bash
curl -X POST http://localhost:3000/api/property-manager/auth/register \
  -H "Authorization: Bearer YOUR_AGENCY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "PropertyManager",
    "email": "john.propertymanager@agency.com",
    "phone": "+61412345678",
    "password": "securepassword123",
    "address": {
      "street": "123 Manager Street",
      "suburb": "Manager Suburb",
      "state": "NSW",
      "postcode": "2000"
    }
  }'
```

#### Assign PropertyManager to Property

```bash
curl -X POST http://localhost:3000/api/properties/PROPERTY_ID/assign-property-manager \
  -H "Authorization: Bearer YOUR_AGENCY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyManagerId": "PROPERTY_MANAGER_ID",
    "role": "Primary"
  }'
```

#### Get All PropertyManagers

```bash
curl -X GET "http://localhost:3000/api/property-managers?status=Active&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_AGENCY_TOKEN"
```

#### Bulk Assign Properties

```bash
curl -X POST http://localhost:3000/api/properties/bulk-assign-property-manager \
  -H "Authorization: Bearer YOUR_AGENCY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyManagerId": "PROPERTY_MANAGER_ID",
    "propertyIds": ["PROPERTY_ID_1", "PROPERTY_ID_2", "PROPERTY_ID_3"],
    "role": "Primary"
  }'
```

### React Component Example

```jsx
import React, { useState, useEffect } from "react";

const PropertyManagerManagement = () => {
  const [propertyManagers, setPropertyManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch PropertyManagers
  const fetchPropertyManagers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/property-managers", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("agencyToken")}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setPropertyManagers(data.data.propertyManagers);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Failed to fetch PropertyManagers");
    } finally {
      setLoading(false);
    }
  };

  // Register new PropertyManager
  const handleRegister = async (formData) => {
    try {
      const response = await fetch("/api/property-manager/auth/register", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("agencyToken")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        // Refresh the list
        fetchPropertyManagers();
        return data.data;
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  useEffect(() => {
    fetchPropertyManagers();
  }, []);

  return (
    <div className="property-manager-management">
      <h2>PropertyManager Management</h2>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div>Loading PropertyManagers...</div>
      ) : (
        <div className="property-managers-list">
          {propertyManagers.map((pm) => (
            <div key={pm.id} className="property-manager-card">
              <h3>{pm.fullName}</h3>
              <p>Email: {pm.email}</p>
              <p>Phone: {pm.phone}</p>
              <p>Status: {pm.status}</p>
              <p>Availability: {pm.availabilityStatus}</p>
              <p>Assigned Properties: {pm.assignedPropertiesCount}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertyManagerManagement;
```

## Best Practices

### PropertyManager Registration

1. **Verify Contact Information**

   - Ensure email and phone are valid and accessible
   - Confirm address details for local property management

2. **Strong Password Requirements**

   - Minimum 8 characters
   - Include uppercase, lowercase, numbers, and symbols
   - Avoid common passwords

3. **Role Assignment Strategy**
   - Assign Primary role to main PropertyManager
   - Use Secondary role for backup coverage
   - Limit Backup role to emergency situations

### Property Assignment

1. **Workload Distribution**

   - Don't overload PropertyManagers with too many properties
   - Consider property complexity and location
   - Balance workload across team members

2. **Geographic Considerations**

   - Assign properties in similar areas to reduce travel time
   - Consider PropertyManager's location relative to properties

3. **Specialization**
   - Match PropertyManager skills to property types
   - Consider experience with specific property categories

### Management and Monitoring

1. **Regular Status Updates**

   - Monitor PropertyManager availability status
   - Track assignment changes and performance

2. **Communication Channels**

   - Establish clear communication protocols
   - Provide PropertyManagers with agency contact information

3. **Performance Tracking**
   - Monitor property management outcomes
   - Track response times and issue resolution

## Troubleshooting

### Common Issues

#### 1. "PropertyManager already exists" Error

- **Cause**: Email address is already registered
- **Solution**: Use a different email or contact existing PropertyManager
- **Prevention**: Check existing PropertyManagers before registration

#### 2. "Property already assigned" Error

- **Cause**: Property is already assigned to another PropertyManager
- **Solution**: Remove existing assignment first, then assign to new PropertyManager
- **Prevention**: Check property assignment status before assigning

#### 3. "Invalid PropertyManager ID" Error

- **Cause**: PropertyManager doesn't exist or belongs to different agency
- **Solution**: Verify PropertyManager ID and agency ownership
- **Prevention**: Use agency's PropertyManager list for assignments

#### 4. "Permission denied" Error

- **Cause**: Agency doesn't have permission to manage PropertyManagers
- **Solution**: Contact system administrator for proper permissions
- **Prevention**: Ensure agency account has proper role assignments

### Debug Mode

Enable debug logging for PropertyManager management:

```bash
DEBUG=propertymanager:management
```

### Health Check

Verify PropertyManager management service:

```bash
curl -X GET http://localhost:3000/api/health/property-manager-management
```

Expected response:

```json
{
  "status": "ok",
  "service": "property-manager-management",
  "features": {
    "registration": "enabled",
    "assignment": "enabled",
    "bulk_operations": "enabled"
  }
}
```

## Support

For assistance with PropertyManager management:

- **Email**: support@rentalease.com
- **Documentation**: https://docs.rentalease.com/agency/property-manager-management
- **API Status**: https://status.rentalease.com

---

_This documentation is for Agency PropertyManager Management system v1.0.0_
