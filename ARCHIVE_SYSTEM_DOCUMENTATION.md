# Archive System API Documentation

This document describes the archive/restore functionality for Agencies and Property Managers. Instead of permanently deleting records, the system now archives them, allowing for restoration later.

## Overview

- **Archive**: When you "delete" an agency or property manager, they are marked as archived instead of being permanently removed from the database.
- **Restore**: Archived items can be restored to active status.
- **Viewing**: By default, archived items are excluded from list views, but can be included or viewed exclusively using query parameters.

## Database Schema Changes

Both `Agency` and `PropertyManager` models now include:

- `isArchived` (Boolean, default: `false`) - Indicates if the record is archived
- `archivedAt` (Date, nullable) - Timestamp when the record was archived

## Agency Archive API

### Archive an Agency

**Endpoint:** `DELETE /api/agency/:id`

**Authentication:** SuperUser, TeamMember

**Description:** Archives an agency instead of deleting it permanently.

**Request:**

```bash
DELETE /api/agency/507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "status": "success",
  "message": "Agency archived successfully",
  "data": {
    "archivedAgency": {
      "id": "507f1f77bcf86cd799439011",
      "companyName": "ABC Realty",
      "contactPerson": "John Doe",
      "email": "john@abcrealty.com",
      "abn": "12345678901",
      "region": "Sydney Metro",
      "status": "Active"
    },
    "archivedBy": "Admin User",
    "archivedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

- `404`: Agency not found
- `400`: Agency is already archived
- `500`: Server error

### Restore an Archived Agency

**Endpoint:** `POST /api/agency/:id/restore`

**Authentication:** SuperUser, TeamMember

**Description:** Restores an archived agency to active status.

**Request:**

```bash
POST /api/agency/507f1f77bcf86cd799439011/restore
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "status": "success",
  "message": "Agency restored successfully",
  "data": {
    "agency": {
      "id": "507f1f77bcf86cd799439011",
      "companyName": "ABC Realty",
      "contactPerson": "John Doe",
      "email": "john@abcrealty.com",
      "status": "Active"
    },
    "restoredBy": "Admin User",
    "restoredAt": "2024-01-15T11:00:00.000Z"
  }
}
```

**Error Responses:**

- `404`: Agency not found
- `400`: Agency is not archived
- `500`: Server error

### List Agencies (with Archive Filtering)

**Endpoint:** `GET /api/agency/all`

**Authentication:** SuperUser, TeamMember

**Query Parameters:**

- `includeArchived` (boolean, default: `false`) - Include archived agencies in results
- `onlyArchived` (boolean, default: `false`) - Show only archived agencies
- `status` (string, optional) - Filter by status
- `region` (string, optional) - Filter by region
- `complianceType` (string, optional) - Filter by compliance subscription type
- `page` (number, default: 1) - Page number
- `limit` (number, default: 10) - Items per page

**Description:** Lists agencies with optional archive filtering. By default, archived agencies are excluded.

**Request Examples:**

Get all active agencies (default):

```bash
GET /api/agency/all
Authorization: Bearer <token>
```

Include archived agencies in results:

```bash
GET /api/agency/all?includeArchived=true
Authorization: Bearer <token>
```

Show only archived agencies:

```bash
GET /api/agency/all?onlyArchived=true
Authorization: Bearer <token>
```

Get active agencies with filters:

```bash
GET /api/agency/all?status=Active&region=Sydney Metro&page=1&limit=20
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "status": "success",
  "data": {
    "agencies": [
      {
        "id": "507f1f77bcf86cd799439011",
        "companyName": "ABC Realty",
        "contactPerson": "John Doe",
        "email": "john@abcrealty.com",
        "phone": "+61 2 1234 5678",
        "region": "Sydney Metro",
        "complianceSubscriptions": ["Gas", "Smoke Alarm"],
        "status": "Active",
        "abn": "12345678901",
        "subscriptionAmount": 199,
        "outstandingAmount": 0,
        "totalProperties": 45,
        "lastLogin": "2024-01-14T08:30:00.000Z",
        "joinedDate": "2023-06-01T00:00:00.000Z",
        "createdAt": "2023-06-01T00:00:00.000Z",
        "isArchived": false,
        "archivedAt": null
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 50,
      "hasNext": true,
      "hasPrev": false
    },
    "complianceStats": [
      {
        "type": "Gas",
        "count": 25
      },
      {
        "type": "Smoke Alarm",
        "count": 30
      }
    ]
  }
}
```

## Property Manager Archive API

### Archive a Property Manager

**Endpoint:** `DELETE /api/property-manager/:id`

**Authentication:** SuperUser, TeamMember, Agency

**Description:** Archives a property manager instead of deleting it permanently.

**Request:**

```bash
DELETE /api/property-manager/507f1f77bcf86cd799439012
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "PropertyManager archived successfully",
  "data": {
    "propertyManagerId": "507f1f77bcf86cd799439012",
    "archivedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

- `404`: PropertyManager not found
- `400`: PropertyManager is already archived
- `403`: Access denied (Agency can only archive their own property managers)
- `500`: Server error

**Note:** Unlike the previous implementation, archived property managers can have active property assignments. The archive operation no longer requires removing all assignments first.

### Restore an Archived Property Manager

**Endpoint:** `POST /api/property-manager/:id/restore`

**Authentication:** SuperUser, TeamMember, Agency

**Description:** Restores an archived property manager to active status.

**Request:**

```bash
POST /api/property-manager/507f1f77bcf86cd799439012/restore
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "PropertyManager restored successfully",
  "data": {
    "propertyManager": {
      "id": "507f1f77bcf86cd799439012",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane.smith@example.com",
      "status": "Active"
    },
    "restoredAt": "2024-01-15T11:00:00.000Z"
  }
}
```

**Error Responses:**

- `404`: PropertyManager not found
- `400`: PropertyManager is not archived
- `403`: Access denied (Agency can only restore their own property managers)
- `500`: Server error

### List Property Managers (with Archive Filtering)

**Endpoint:** `GET /api/property-manager`

**Authentication:** SuperUser, TeamMember, Agency, PropertyManager

**Query Parameters:**

- `includeArchived` (boolean, default: `false`) - Include archived property managers in results
- `onlyArchived` (boolean, default: `false`) - Show only archived property managers
- `status` (string, optional) - Filter by status (Active, Inactive, Suspended, Pending)
- `availabilityStatus` (string, optional) - Filter by availability (Available, Busy, Unavailable, On Leave)
- `search` (string, optional) - Search by first name, last name, or email
- `agencyId` (string, optional) - Filter by agency ID (SuperUser/TeamMember only)
- `sortBy` (string, default: "createdAt") - Field to sort by
- `sortOrder` (string, default: "desc") - Sort order (asc/desc)
- `page` (number, default: 1) - Page number
- `limit` (number, default: 10) - Items per page

**Description:** Lists property managers with optional archive filtering. By default, archived property managers are excluded.

**Request Examples:**

Get all active property managers (default):

```bash
GET /api/property-manager
Authorization: Bearer <token>
```

Include archived property managers in results:

```bash
GET /api/property-manager?includeArchived=true
Authorization: Bearer <token>
```

Show only archived property managers:

```bash
GET /api/property-manager?onlyArchived=true
Authorization: Bearer <token>
```

Get active property managers with filters:

```bash
GET /api/property-manager?status=Active&availabilityStatus=Available&page=1&limit=20
Authorization: Bearer <token>
```

Search with archive filter:

```bash
GET /api/property-manager?search=john&includeArchived=true
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "propertyManagers": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "firstName": "Jane",
        "lastName": "Smith",
        "fullName": "Jane Smith",
        "email": "jane.smith@example.com",
        "phone": "+61 2 9876 5432",
        "assignedProperties": [],
        "availabilityStatus": "Available",
        "status": "Active",
        "owner": {
          "ownerType": "Agency",
          "ownerId": {
            "_id": "507f1f77bcf86cd799439011",
            "companyName": "ABC Realty",
            "email": "contact@abcrealty.com",
            "phone": "+61 2 1234 5678"
          }
        },
        "address": {
          "street": "123 Main St",
          "suburb": "Sydney",
          "state": "NSW",
          "postcode": "2000",
          "fullAddress": "123 Main St, Sydney, NSW 2000"
        },
        "createdAt": "2023-06-01T00:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z",
        "lastLogin": "2024-01-14T08:30:00.000Z",
        "lastActive": "2024-01-14T08:30:00.000Z",
        "isArchived": false,
        "archivedAt": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "pages": 3
    },
    "summary": {
      "total": 25,
      "active": 20,
      "inactive": 3,
      "available": 18,
      "busy": 2,
      "unavailable": 5,
      "archived": 2
    }
  }
}
```

## Usage Examples

### Example 1: Archive an Agency

```bash
# Archive an agency
curl -X DELETE \
  https://api.example.com/api/agency/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 2: View Archived Agencies

```bash
# Get only archived agencies
curl -X GET \
  "https://api.example.com/api/agency/all?onlyArchived=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 3: Restore an Archived Agency

```bash
# Restore an archived agency
curl -X POST \
  https://api.example.com/api/agency/507f1f77bcf86cd799439011/restore \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 4: Archive a Property Manager

```bash
# Archive a property manager
curl -X DELETE \
  https://api.example.com/api/property-manager/507f1f77bcf86cd799439012 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 5: List All Property Managers (Including Archived)

```bash
# Get all property managers including archived ones
curl -X GET \
  "https://api.example.com/api/property-manager?includeArchived=true&page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Example 6: Restore an Archived Property Manager

```bash
# Restore an archived property manager
curl -X POST \
  https://api.example.com/api/property-manager/507f1f77bcf86cd799439012/restore \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## JavaScript/TypeScript Examples

### Archive an Agency

```javascript
const archiveAgency = async (agencyId) => {
  const response = await fetch(`/api/agency/${agencyId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  return data;
};
```

### Restore an Agency

```javascript
const restoreAgency = async (agencyId) => {
  const response = await fetch(`/api/agency/${agencyId}/restore`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  return data;
};
```

### List Agencies with Archive Filter

```javascript
const getAgencies = async (includeArchived = false, onlyArchived = false) => {
  const params = new URLSearchParams();
  if (includeArchived) params.append("includeArchived", "true");
  if (onlyArchived) params.append("onlyArchived", "true");

  const response = await fetch(`/api/agency/all?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data;
};
```

### Archive a Property Manager

```javascript
const archivePropertyManager = async (propertyManagerId) => {
  const response = await fetch(`/api/property-manager/${propertyManagerId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  return data;
};
```

### Restore a Property Manager

```javascript
const restorePropertyManager = async (propertyManagerId) => {
  const response = await fetch(
    `/api/property-manager/${propertyManagerId}/restore`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const data = await response.json();
  return data;
};
```

### List Property Managers with Archive Filter

```javascript
const getPropertyManagers = async (options = {}) => {
  const {
    includeArchived = false,
    onlyArchived = false,
    status,
    availabilityStatus,
    search,
    page = 1,
    limit = 10,
  } = options;

  const params = new URLSearchParams();
  if (includeArchived) params.append("includeArchived", "true");
  if (onlyArchived) params.append("onlyArchived", "true");
  if (status) params.append("status", status);
  if (availabilityStatus)
    params.append("availabilityStatus", availabilityStatus);
  if (search) params.append("search", search);
  params.append("page", page);
  params.append("limit", limit);

  const response = await fetch(`/api/property-manager?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  return data;
};
```

## Important Notes

1. **Default Behavior**: By default, archived items are excluded from list endpoints. Use `includeArchived=true` to include them or `onlyArchived=true` to show only archived items.

2. **Access Control**:

   - Agencies can only archive/restore their own property managers
   - SuperUsers and TeamMembers can archive/restore any agency or property manager

3. **Archive vs Delete**: The system now uses soft delete (archive) instead of hard delete. Records are never permanently removed from the database.

4. **Property Assignments**: Property managers can be archived even if they have active property assignments. The archive operation no longer requires removing assignments first.

5. **Status Field**: The `status` field (Active, Inactive, Suspended, Pending) is separate from `isArchived`. An archived item can have any status.

6. **Summary Statistics**: The summary statistics in property manager list responses now include an `archived` count showing the total number of archived property managers.

## Migration Notes

If you have existing data:

- All existing agencies and property managers will have `isArchived: false` and `archivedAt: null`
- No migration script is required as these fields have default values
- The system will work seamlessly with existing data
