# Property Manager Access to Properties Route

## Overview

The properties route (`/api/v1/properties`) now supports Property Managers with full CRUD capabilities. Property Managers can access, create, update, and manage properties within their agency's scope.

## Access Control

### Property Manager Permissions

Property Managers can access properties in one scenario:

1. **Properties they are assigned to** as the `assignedPropertyManager` (via `property.assignedPropertyManager` field)

### Authentication

Property Managers use the same authentication middleware as other user types:

- JWT token with `userType: "PropertyManager"`
- Token must be valid and not expired
- Property Manager account must be `Active`

## API Endpoints

### 1. Get All Properties

```
GET /api/v1/properties
```

**Query Parameters:**

- `page` (default: 1) - Page number for pagination
- `limit` (default: 10) - Number of properties per page
- `propertyType` - Filter by property type
- `region` - Filter by region
- `state` - Filter by state
- `status` - Filter by property status
- `search` - Search across multiple fields
- `sortBy` (default: "createdAt") - Sort field
- `sortOrder` (default: "desc") - Sort order

**Property Manager Access:**

- ✅ Can fetch properties assigned to them as `assignedPropertyManager`
- ❌ Cannot fetch properties from their agency unless assigned
- ✅ Can use all filtering and search options
- ✅ Can use pagination

**Example Response:**

```json
{
  "status": "success",
  "data": {
    "properties": [
      {
        "id": "property_id",
        "address": {...},
        "fullAddress": "123 Test St, Test Suburb, NSW 2000",
        "propertyType": "House",
        "region": "Sydney Metro",
        "status": "Active",
        "agency": {...},
        "assignedPropertyManager": {...},
        "currentTenant": {...},
        "currentLandlord": {...},
        "complianceSchedule": {...},
        "notes": "Property notes",
        "hasOverdueCompliance": false,
        "complianceSummary": {...},
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalCount": 50,
      "hasNext": true,
      "hasPrev": false
    },
    "filters": {
      "applied": {
        "propertyType": "All Types",
        "region": "All Regions",
        "status": "All Status",
        "search": ""
      }
    }
  }
}
```

### 2. Create Property

```
POST /api/v1/properties
```

**Property Manager Access:**

- ✅ Can create new properties
- ✅ Automatically assigned as the `assignedPropertyManager`
- ✅ Property is associated with their owner agency
- ✅ Must provide complete address and tenant/landlord information

**Required Fields:**

```json
{
  "address": {
    "street": "123 Test Street",
    "suburb": "Test Suburb",
    "state": "NSW",
    "postcode": "2000"
  },
  "currentTenant": {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+61412345678"
  },
  "currentLandlord": {
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "phone": "+61487654321"
  },
  "notes": "Optional property notes"
}
```

**Example Response:**

```json
{
  "status": "success",
  "message": "Property created successfully",
  "data": {
    "property": {
      "id": "new_property_id",
      "address": {...},
      "fullAddress": "123 Test St, Test Suburb, NSW 2000",
      "propertyType": "House",
      "assignedPropertyManager": {
        "id": "property_manager_id",
        "fullName": "Property Manager Name",
        "email": "pm@example.com"
      },
      "agency": {...},
      "currentTenant": {...},
      "currentLandlord": {...},
      "complianceSchedule": {...},
      "notes": "Property notes",
      "hasOverdueCompliance": false,
      "complianceSummary": {...},
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 3. Get Single Property

```
GET /api/v1/properties/:id
```

**Property Manager Access:**

- ✅ Can view properties assigned to them as `assignedPropertyManager`
- ❌ Cannot view properties from their agency unless assigned
- ❌ Cannot view properties from other agencies

### 4. Update Property

```
PUT /api/v1/properties/:id
```

**Property Manager Access:**

- ✅ Can update properties assigned to them as `assignedPropertyManager`
- ❌ Cannot update properties from their agency unless assigned
- ✅ Can update address, tenant info, compliance schedule, notes
- ❌ Cannot change agency assignment

**Updatable Fields:**

```json
{
  "address": {...},
  "currentTenant": {...},
  "complianceSchedule": {...},
  "notes": "Updated notes"
}
```

### 5. Delete Property

```
DELETE /api/v1/properties/:id
```

**Property Manager Access:**

- ✅ Can soft delete properties assigned to them as `assignedPropertyManager`
- ❌ Cannot soft delete properties from their agency unless assigned
- ❌ Cannot delete properties from other agencies

### 6. Property Assignment Management

#### Assign Property Manager

```
POST /api/v1/properties/:id/assign-property-manager
```

**Property Manager Access:**

- ✅ Can assign themselves to properties from their agency (if they have access)
- ❌ Cannot assign other property managers
- ❌ Cannot assign to properties from other agencies

**Request Body:**

```json
{
  "propertyManagerId": "property_manager_id",
  "role": "Primary"
}
```

#### Unassign Property Manager

```
DELETE /api/v1/properties/:id/assign-property-manager
```

**Property Manager Access:**

- ✅ Can unassign themselves from properties
- ❌ Cannot unassign other property managers

### 7. View Available Property Managers

```
GET /api/v1/properties/available-property-managers
```

**Property Manager Access:**

- ✅ Can view property managers from their agency (for assignment purposes)
- ❌ Cannot view property managers from other agencies

### 8. Assignment Summary

```
GET /api/v1/properties/:id/assignment-summary
```

**Property Manager Access:**

- ✅ Can view assignment summary for accessible properties

### 9. Filter Options

```
GET /api/v1/properties/filter-options
```

**Property Manager Access:**

- ✅ Can get filter options for accessible properties

### 10. Compliance Information

```
GET /api/v1/properties/:id/compliance
```

**Property Manager Access:**

- ✅ Can view compliance information for accessible properties

## Search Functionality

Property Managers can search across:

- Property address (street, suburb, full address)
- Tenant information (name, email)
- Landlord information (name, email)
- Agency company name
- **NEW:** Assigned Property Manager (name, email)

**Example Search:**

```
GET /api/v1/properties?search=john&page=1&limit=10
```

## Filtering Options

Property Managers can filter by:

- Property Type (House, Apartment, etc.)
- Region (Sydney Metro, Melbourne Metro, etc.)
- State (NSW, VIC, QLD, etc.)
- Status (Active, Inactive, etc.)

**Example Filter:**

```
GET /api/v1/properties?propertyType=House&status=Active&region=Sydney Metro&page=1&limit=10
```

## Security Considerations

### Access Control

- Property Managers can only access properties where they are assigned as `assignedPropertyManager`
- They cannot view or modify properties from their agency unless assigned
- Assignment permissions are restricted to their own agency

### Data Validation

- All input data is validated before processing
- Email formats are verified
- Phone numbers are validated
- Address information is required and validated

### Audit Trail

- All property operations are logged
- Creator information is tracked in the `createdBy` field
- Timestamps are maintained for all operations

## Error Handling

### Common Error Responses

**401 Unauthorized:**

```json
{
  "status": "error",
  "message": "Authorization header is required"
}
```

**403 Forbidden:**

```json
{
  "status": "error",
  "message": "Access denied. Property Managers can only assign themselves to properties from their agency."
}
```

**404 Not Found:**

```json
{
  "status": "error",
  "message": "Property not found"
}
```

**400 Bad Request:**

```json
{
  "status": "error",
  "message": "Complete address (street, suburb, state, postcode) is required"
}
```

## Testing

Use the provided test file `src/examples/testPropertyManagerAccess.js` to verify functionality:

```javascript
import { testPropertyManagerAccess } from "./src/examples/testPropertyManagerAccess.js";

// Run the tests
await testPropertyManagerAccess();
```

## Migration Notes

### Changes Made

1. Updated `getAgencyFilter` function to support Property Managers
2. Enhanced search functionality to include Property Manager fields
3. Updated assignment routes to allow Property Manager self-assignment
4. Added proper permission checks for all CRUD operations
5. Maintained backward compatibility with existing Agency and SuperUser access

### Backward Compatibility

- All existing Agency and SuperUser functionality remains unchanged
- Existing API contracts are preserved
- No breaking changes to response formats

## Usage Examples

### Frontend Integration

```javascript
// Fetch properties as Property Manager
const fetchProperties = async (token) => {
  const response = await fetch("/api/v1/properties?page=1&limit=1000", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return response.json();
};

// Create new property as Property Manager
const createProperty = async (token, propertyData) => {
  const response = await fetch("/api/v1/properties", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(propertyData),
  });
  return response.json();
};

// Assign self to property
const assignSelfToProperty = async (token, propertyId) => {
  const response = await fetch(
    `/api/v1/properties/${propertyId}/assign-property-manager`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        propertyManagerId: "self", // Will be replaced with actual ID
        role: "Primary",
      }),
    }
  );
  return response.json();
};
```

## Conclusion

Property Managers now have comprehensive access to the properties route with appropriate security controls. They can perform all CRUD operations on properties where they are assigned as `assignedPropertyManager`, manage their own assignments, and utilize all search and filtering capabilities. They can only see and manage properties that are specifically assigned to them.
