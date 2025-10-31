# Property Logs System - Complete Documentation

## Overview
The Property Logs system provides comprehensive audit trail functionality for tracking all changes made to properties in the RentalEase CRM. This includes tracking changes to agencies, tenants, landlords, property managers, and all other property fields.

## Features
- **Automatic Logging**: All property updates are automatically logged
- **Change Detection**: Tracks what fields changed and their old/new values
- **User Tracking**: Records who made each change
- **Detailed History**: View complete history of property changes
- **Previous Data Snapshots**: Stores snapshots of critical data before changes
- **Flexible Querying**: Filter logs by type, date range, and more

## API Endpoints

### 1. Get All Logs for a Property
**Endpoint**: `GET /api/properties/:id/logs`

**Authentication**: Required (SuperUser, TeamMember, Agency, PropertyManager)

**Query Parameters**:
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of logs per page (default: 50)
- `changeType` (optional): Filter by change type (e.g., "agency_changed", "tenant_changed")
- `startDate` (optional): Filter logs from this date (ISO format)
- `endDate` (optional): Filter logs until this date (ISO format)

**Example Request**:
```bash
GET /api/properties/64a1234567890abcdef12345/logs?page=1&limit=20
```

**Example Response**:
```json
{
  "status": "success",
  "message": "Property logs retrieved successfully",
  "data": {
    "property": {
      "id": "64a1234567890abcdef12345",
      "address": "123 Main St, Sydney, NSW 2000"
    },
    "logs": [
      {
        "_id": "64b9876543210fedcba09876",
        "property": "64a1234567890abcdef12345",
        "propertyAddress": "123 Main St, Sydney, NSW 2000",
        "changeType": "tenant_changed",
        "changedBy": {
          "userId": "64c1111111111111111111111",
          "userType": "Agency",
          "userName": "ABC Property Management",
          "userEmail": "contact@abcproperty.com.au"
        },
        "description": "Tenant information updated by ABC Property Management",
        "changes": [
          {
            "field": "currentTenant.name",
            "fieldLabel": "Tenant Name",
            "oldValue": "John Smith",
            "newValue": "Jane Doe",
            "changeCategory": "tenant"
          },
          {
            "field": "currentTenant.email",
            "fieldLabel": "Tenant Email",
            "oldValue": "john.smith@example.com",
            "newValue": "jane.doe@example.com",
            "changeCategory": "tenant"
          },
          {
            "field": "currentTenant.phone",
            "fieldLabel": "Tenant Phone",
            "oldValue": "0412345678",
            "newValue": "0498765432",
            "changeCategory": "tenant"
          }
        ],
        "previousSnapshot": {
          "agency": {
            "id": "64d2222222222222222222222",
            "name": "ABC Property Management",
            "email": "contact@abcproperty.com.au"
          },
          "tenant": {
            "name": "John Smith",
            "email": "john.smith@example.com",
            "phone": "0412345678"
          },
          "landlord": {
            "name": "Robert Williams",
            "email": "robert@example.com",
            "phone": "0411111111"
          },
          "propertyManager": {
            "id": "64e3333333333333333333333",
            "name": "Sarah Johnson",
            "email": "sarah@abcproperty.com.au"
          },
          "status": "Active"
        },
        "metadata": {
          "ipAddress": "203.0.113.42",
          "userAgent": "Mozilla/5.0...",
          "timestamp": "2024-01-15T14:30:00.000Z"
        },
        "createdAt": "2024-01-15T14:30:00.123Z",
        "updatedAt": "2024-01-15T14:30:00.123Z"
      },
      {
        "_id": "64b8765432109876543210fed",
        "property": "64a1234567890abcdef12345",
        "propertyAddress": "123 Main St, Sydney, NSW 2000",
        "changeType": "agency_changed",
        "changedBy": {
          "userId": "64f4444444444444444444444",
          "userType": "SuperUser",
          "userName": "Super User",
          "userEmail": "admin@rentalease.com.au"
        },
        "description": "Agency changed from \"XYZ Realty\" to \"ABC Property Management\" by Super User",
        "changes": [
          {
            "field": "agency",
            "fieldLabel": "Agency",
            "oldValue": "XYZ Realty",
            "newValue": "ABC Property Management",
            "changeCategory": "agency"
          }
        ],
        "previousSnapshot": {
          "agency": {
            "id": "64g5555555555555555555555",
            "name": "XYZ Realty",
            "email": "info@xyzrealty.com.au"
          },
          "tenant": {
            "name": "John Smith",
            "email": "john.smith@example.com",
            "phone": "0412345678"
          },
          "status": "Active"
        },
        "metadata": {
          "ipAddress": "203.0.113.10",
          "userAgent": "Mozilla/5.0...",
          "timestamp": "2024-01-10T09:15:00.000Z"
        },
        "createdAt": "2024-01-10T09:15:00.456Z",
        "updatedAt": "2024-01-10T09:15:00.456Z"
      },
      {
        "_id": "64b7654321098765432109876",
        "property": "64a1234567890abcdef12345",
        "propertyAddress": "123 Main St, Sydney, NSW 2000",
        "changeType": "property_manager_assigned",
        "changedBy": {
          "userId": "64d2222222222222222222222",
          "userType": "Agency",
          "userName": "ABC Property Management",
          "userEmail": "contact@abcproperty.com.au"
        },
        "description": "Property manager assigned: Sarah Johnson by ABC Property Management",
        "changes": [
          {
            "field": "assignedPropertyManager",
            "fieldLabel": "Property Manager",
            "oldValue": "N/A",
            "newValue": "Sarah Johnson",
            "changeCategory": "manager"
          }
        ],
        "previousSnapshot": {
          "agency": {
            "id": "64d2222222222222222222222",
            "name": "ABC Property Management",
            "email": "contact@abcproperty.com.au"
          },
          "status": "Active"
        },
        "metadata": {
          "ipAddress": "203.0.113.42",
          "userAgent": "Mozilla/5.0...",
          "timestamp": "2024-01-05T11:45:00.000Z"
        },
        "createdAt": "2024-01-05T11:45:00.789Z",
        "updatedAt": "2024-01-05T11:45:00.789Z"
      },
      {
        "_id": "64b6543210987654321098765",
        "property": "64a1234567890abcdef12345",
        "propertyAddress": "123 Main St, Sydney, NSW 2000",
        "changeType": "created",
        "changedBy": {
          "userId": "64f4444444444444444444444",
          "userType": "SuperUser",
          "userName": "Super User",
          "userEmail": "admin@rentalease.com.au"
        },
        "description": "Property created by Super User",
        "changes": [],
        "previousSnapshot": {},
        "metadata": {
          "ipAddress": "203.0.113.10",
          "userAgent": "Mozilla/5.0...",
          "timestamp": "2024-01-01T08:00:00.000Z"
        },
        "createdAt": "2024-01-01T08:00:00.000Z",
        "updatedAt": "2024-01-01T08:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalCount": 4,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

### 2. Get Change Summary for a Property
**Endpoint**: `GET /api/properties/:id/logs/summary`

**Authentication**: Required (SuperUser, TeamMember, Agency, PropertyManager)

**Example Request**:
```bash
GET /api/properties/64a1234567890abcdef12345/logs/summary
```

**Example Response**:
```json
{
  "status": "success",
  "message": "Property change summary retrieved successfully",
  "data": {
    "property": {
      "id": "64a1234567890abcdef12345",
      "address": "123 Main St, Sydney, NSW 2000"
    },
    "summary": [
      {
        "changeType": "tenant_changed",
        "count": 5,
        "lastChange": "2024-01-15T14:30:00.123Z"
      },
      {
        "changeType": "landlord_changed",
        "count": 2,
        "lastChange": "2024-01-12T10:20:00.456Z"
      },
      {
        "changeType": "agency_changed",
        "count": 1,
        "lastChange": "2024-01-10T09:15:00.456Z"
      },
      {
        "changeType": "property_manager_assigned",
        "count": 3,
        "lastChange": "2024-01-08T16:45:00.789Z"
      },
      {
        "changeType": "updated",
        "count": 12,
        "lastChange": "2024-01-14T13:30:00.123Z"
      },
      {
        "changeType": "status_changed",
        "count": 2,
        "lastChange": "2024-01-03T11:00:00.000Z"
      },
      {
        "changeType": "created",
        "count": 1,
        "lastChange": "2024-01-01T08:00:00.000Z"
      }
    ],
    "totalChanges": 26
  }
}
```

---

### 3. Get a Specific Log Entry
**Endpoint**: `GET /api/properties/:id/logs/:logId`

**Authentication**: Required (SuperUser, TeamMember, Agency, PropertyManager)

**Example Request**:
```bash
GET /api/properties/64a1234567890abcdef12345/logs/64b9876543210fedcba09876
```

**Example Response**:
```json
{
  "status": "success",
  "message": "Property log retrieved successfully",
  "data": {
    "property": {
      "id": "64a1234567890abcdef12345",
      "address": "123 Main St, Sydney, NSW 2000"
    },
    "log": {
      "_id": "64b9876543210fedcba09876",
      "property": "64a1234567890abcdef12345",
      "propertyAddress": "123 Main St, Sydney, NSW 2000",
      "changeType": "landlord_changed",
      "changedBy": {
        "userId": "64c1111111111111111111111",
        "userType": "Agency",
        "userName": "ABC Property Management",
        "userEmail": "contact@abcproperty.com.au"
      },
      "description": "Landlord information updated by ABC Property Management",
      "changes": [
        {
          "field": "currentLandlord.name",
          "fieldLabel": "Landlord Name",
          "oldValue": "Robert Williams",
          "newValue": "Michael Brown",
          "changeCategory": "landlord"
        },
        {
          "field": "currentLandlord.email",
          "fieldLabel": "Landlord Email",
          "oldValue": "robert@example.com",
          "newValue": "michael.brown@example.com",
          "changeCategory": "landlord"
        },
        {
          "field": "currentLandlord.phone",
          "fieldLabel": "Landlord Phone",
          "oldValue": "0411111111",
          "newValue": "0422222222",
          "changeCategory": "landlord"
        }
      ],
      "previousSnapshot": {
        "agency": {
          "id": "64d2222222222222222222222",
          "name": "ABC Property Management",
          "email": "contact@abcproperty.com.au"
        },
        "tenant": {
          "name": "Jane Doe",
          "email": "jane.doe@example.com",
          "phone": "0498765432"
        },
        "landlord": {
          "name": "Robert Williams",
          "email": "robert@example.com",
          "phone": "0411111111"
        },
        "propertyManager": {
          "id": "64e3333333333333333333333",
          "name": "Sarah Johnson",
          "email": "sarah@abcproperty.com.au"
        },
        "status": "Active"
      },
      "metadata": {
        "ipAddress": "203.0.113.42",
        "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "timestamp": "2024-01-12T10:20:00.456Z"
      },
      "createdAt": "2024-01-12T10:20:00.456Z",
      "updatedAt": "2024-01-12T10:20:00.456Z"
    }
  }
}
```

---

## Change Types

The system automatically categorizes changes into the following types:

- **`created`**: Property was created
- **`updated`**: General property updates
- **`deleted`**: Property was deleted (soft delete)
- **`agency_changed`**: Agency was changed
- **`tenant_changed`**: Tenant information was updated
- **`landlord_changed`**: Landlord information was updated
- **`property_manager_assigned`**: Property manager was assigned
- **`property_manager_removed`**: Property manager was removed
- **`status_changed`**: Property status was changed
- **`compliance_updated`**: Compliance schedule was updated

---

## Change Categories

Each individual field change is categorized for easier filtering:

- **`basic`**: Basic property information (address, type, etc.)
- **`tenant`**: Tenant-related fields
- **`landlord`**: Landlord-related fields
- **`agency`**: Agency-related fields
- **`manager`**: Property manager-related fields
- **`compliance`**: Compliance-related fields
- **`status`**: Status-related fields

---

## Usage Examples

### Example 1: Get Recent Changes to a Property
```javascript
// Fetch the last 10 changes
fetch('/api/properties/64a1234567890abcdef12345/logs?page=1&limit=10', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Recent changes:', data.data.logs);
});
```

### Example 2: Filter by Change Type
```javascript
// Get only agency changes
fetch('/api/properties/64a1234567890abcdef12345/logs?changeType=agency_changed', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Agency changes:', data.data.logs);
});
```

### Example 3: Get Changes Within Date Range
```javascript
// Get changes between two dates
const startDate = '2024-01-01T00:00:00.000Z';
const endDate = '2024-01-31T23:59:59.999Z';

fetch(`/api/properties/64a1234567890abcdef12345/logs?startDate=${startDate}&endDate=${endDate}`, {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Changes in January:', data.data.logs);
});
```

### Example 4: View Previous Agency
```javascript
// Get the most recent agency change to see the previous agency
fetch('/api/properties/64a1234567890abcdef12345/logs?changeType=agency_changed&limit=1', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }
})
.then(response => response.json())
.then(data => {
  const log = data.data.logs[0];
  if (log && log.previousSnapshot.agency) {
    console.log('Previous agency:', log.previousSnapshot.agency.name);
    console.log('New agency:', log.changes.find(c => c.field === 'agency').newValue);
  }
});
```

### Example 5: View Previous Tenant
```javascript
// Get the most recent tenant change to see the previous tenant
fetch('/api/properties/64a1234567890abcdef12345/logs?changeType=tenant_changed&limit=1', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }
})
.then(response => response.json())
.then(data => {
  const log = data.data.logs[0];
  if (log && log.previousSnapshot.tenant) {
    console.log('Previous tenant:', log.previousSnapshot.tenant);
    console.log('New tenant:', {
      name: log.changes.find(c => c.field === 'currentTenant.name')?.newValue,
      email: log.changes.find(c => c.field === 'currentTenant.email')?.newValue,
      phone: log.changes.find(c => c.field === 'currentTenant.phone')?.newValue
    });
  }
});
```

### Example 6: Get Summary Statistics
```javascript
// Get change summary for reporting
fetch('/api/properties/64a1234567890abcdef12345/logs/summary', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Total changes:', data.data.totalChanges);
  console.log('Change breakdown:', data.data.summary);
});
```

---

## Frontend Implementation Tips

### Display Change History Timeline
```javascript
function PropertyChangeTimeline({ propertyId }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    fetchLogs(propertyId);
  }, [propertyId]);

  const fetchLogs = async (id) => {
    const response = await fetch(`/api/properties/${id}/logs`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setLogs(data.data.logs);
  };

  return (
    <div className="timeline">
      {logs.map(log => (
        <div key={log._id} className="timeline-item">
          <div className="timestamp">{new Date(log.createdAt).toLocaleString()}</div>
          <div className="change-type">{log.changeType}</div>
          <div className="description">{log.description}</div>
          <div className="changed-by">
            by {log.changedBy.userName} ({log.changedBy.userType})
          </div>
          <div className="changes">
            {log.changes.map((change, idx) => (
              <div key={idx} className="change-item">
                <strong>{change.fieldLabel}:</strong>
                {change.oldValue} → {change.newValue}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Database Schema

### PropertyLog Model
```javascript
{
  property: ObjectId,                    // Reference to property
  propertyAddress: String,               // Property address for quick reference
  changeType: String,                    // Type of change
  changedBy: {                          // Who made the change
    userId: ObjectId,
    userType: String,
    userName: String,
    userEmail: String
  },
  description: String,                   // Human-readable description
  changes: [{                           // Array of field changes
    field: String,
    fieldLabel: String,
    oldValue: Mixed,
    newValue: Mixed,
    changeCategory: String
  }],
  previousSnapshot: {                   // Snapshot before change
    agency: { id, name, email },
    tenant: { name, email, phone },
    landlord: { name, email, phone },
    propertyManager: { id, name, email },
    status: String
  },
  metadata: {                           // Audit metadata
    ipAddress: String,
    userAgent: String,
    timestamp: Date
  },
  createdAt: Date,                      // Auto-generated
  updatedAt: Date                       // Auto-generated
}
```

---

## Important Notes

1. **Automatic Logging**: All property updates through the API are automatically logged. You don't need to manually create log entries.

2. **Access Control**: Users can only view logs for properties they have access to based on their role and agency.

3. **Previous Data**: The `previousSnapshot` field contains complete information about the property's critical data before the change, allowing you to see exactly what was changed.

4. **Performance**: Logs are indexed on `property`, `createdAt`, and `changeType` for efficient querying.

5. **Pagination**: Always use pagination when fetching logs to avoid performance issues with properties that have many changes.

6. **No Deletion**: Logs are never deleted, even if a property is deleted, maintaining a complete audit trail.

---

## Support

For questions or issues with the Property Logs system, please contact the development team or refer to the main RentalEase CRM documentation.
