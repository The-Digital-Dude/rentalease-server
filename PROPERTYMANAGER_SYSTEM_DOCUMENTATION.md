# PropertyManager System Documentation

## Overview

The PropertyManager system is a comprehensive role-based access control system that allows property managers to manage assigned properties while maintaining strict security boundaries. PropertyManagers are owned by Agencies and can only access data related to their assigned properties.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Models](#models)
3. [Authentication & Authorization](#authentication--authorization)
4. [Security & Access Control](#security--access-control)
5. [API Endpoints](#api-endpoints)
6. [Database Indexes](#database-indexes)
7. [Testing](#testing)
8. [Security Best Practices](#security-best-practices)

## System Architecture

### Core Components

1. **PropertyManager Model** - Central entity for property manager data
2. **Authentication System** - JWT-based authentication with role-based access
3. **Security Middleware** - Comprehensive access control and validation
4. **Property Assignment System** - Manages property-to-manager relationships
5. **Notification System** - Job-related notifications for PropertyManagers
6. **Database Indexes** - Optimized queries for performance

### Data Flow

```
Agency/SuperUser → Creates PropertyManager → Assigns Properties → PropertyManager manages assigned properties
```

## Models

### PropertyManager Model

**Location**: `src/models/PropertyManager.js`

**Key Fields**:

- `firstName`, `lastName` - Personal identification
- `email`, `phone` - Contact information
- `password` - Hashed authentication
- `assignedProperties` - Array of property assignments with roles
- `owner` - Polymorphic reference to Agency (only)
- `status` - Account status (Active, Inactive, Suspended, Pending)
- `availabilityStatus` - Current availability (Available, Busy, Unavailable, On Leave)

**Key Methods**:

- `assignProperty(propertyId, role)` - Assign a property with role
- `removePropertyAssignment(propertyId)` - Remove property assignment
- `getPropertyAssignmentSummary()` - Get assignment statistics
- `comparePassword(password)` - Password verification
- `isActive()`, `isAvailable()` - Status checks

### Property Model Updates

**Location**: `src/models/Property.js`

**New Field**:

```javascript
assignedPropertyManager: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "PropertyManager"
}
```

### Notification Model Updates

**Location**: `src/models/Notification.js`

**Updated Fields**:

```javascript
recipient: {
  recipientType: {
    type: String,
    enum: ["SuperUser", "Agency", "Technician", "PropertyManager"]
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "recipient.recipientType"
  }
}
```

## Authentication & Authorization

### Authentication Routes

**Location**: `src/routes/propertyManager.auth.routes.js`

**Endpoints**:

- `POST /register` - Create PropertyManager (Agency/SuperUser only)
- `POST /login` - PropertyManager login
- `POST /forgot-password` - Password reset request
- `POST /reset-password` - Password reset with OTP
- `POST /verify-otp` - OTP verification
- `GET /profile` - Get PropertyManager profile
- `PATCH /profile` - Update PropertyManager profile

### Authentication Middleware

**Location**: `src/middleware/auth.middleware.js`

**Key Functions**:

- `authenticate` - Generic authentication with PropertyManager support
- `authenticatePropertyManager` - Dedicated PropertyManager authentication

**Request Object Additions**:

```javascript
req.propertyManager = {
  id: propertyManager._id,
  fullName: propertyManager.fullName,
  email: propertyManager.email,
  status: propertyManager.status,
  availabilityStatus: propertyManager.availabilityStatus,
  assignedProperties: propertyManager.assignedProperties,
};
```

## Security & Access Control

### Security Utilities

**Location**: `src/utils/propertyManagerSecurity.js`

**Key Functions**:

- `validatePropertyAssignment()` - Check if PropertyManager is assigned to property
- `validateResourceAccess()` - Validate access to specific resources
- `createAccessFilter()` - Create database query filters
- `canPerformAction()` - Check action permissions
- `auditAccess()` - Log access attempts
- `checkRateLimit()` - Rate limiting implementation

### Security Middleware

**Location**: `src/middleware/propertyManagerSecurity.middleware.js`

**Available Middleware**:

- `validatePropertyManagerAccess(resourceType)` - Validate resource access
- `validatePropertyManagerAction(action, resourceType)` - Validate action permissions
- `propertyManagerRateLimit(action)` - Apply rate limiting
- `validatePropertyAssignment()` - Validate property assignment
- `createPropertyManagerFilter(resourceType)` - Create access filters
- `propertyManagerSecurity(options)` - Comprehensive security middleware

### Permission Matrix

| Resource     | Read | Write | Delete |
| ------------ | ---- | ----- | ------ |
| Property     | ✅   | ✅    | ❌     |
| Job          | ✅   | ❌    | ❌     |
| Contact      | ✅   | ❌    | ❌     |
| Notification | ✅   | ❌    | ❌     |

### Access Control Rules

1. **Property Access**: Only assigned properties
2. **Job Access**: Jobs related to assigned properties (read-only)
3. **Contact Access**: Contacts from agencies that own assigned properties (read-only)
4. **Notification Access**: Notifications sent to PropertyManager (read-only)
5. **Data Isolation**: PropertyManagers cannot access other PropertyManagers' data

## API Endpoints

### Property Management

**Location**: `src/routes/property.routes.js`

**PropertyManager-Specific Endpoints**:

- `POST /` - Create property (becomes assigned manager)
- `GET /` - View assigned properties only
- `GET /:id` - View specific assigned property
- `PUT /:id` - Update assigned property
- `POST /:id/assign-property-manager` - Assign PropertyManager (Agency/SuperUser)
- `DELETE /:id/assign-property-manager` - Unassign PropertyManager (Agency/SuperUser)
- `GET /available-property-managers` - List available PropertyManagers (Agency/SuperUser)
- `GET /:id/assignment-summary` - Get assignment details (Agency/SuperUser)

### Contact Management

**Location**: `src/routes/contacts.routes.js`

**PropertyManager Access**:

- `GET /` - View contacts (filtered by assigned properties' agencies)
- `GET /:id` - View specific contact (if related to assigned properties)
- All other operations: 403 Forbidden (read-only access)

## Database Indexes

### PropertyManager Indexes

```javascript
// Basic indexes
propertyManagerSchema.index({ email: 1 });
propertyManagerSchema.index({ "owner.ownerType": 1, "owner.ownerId": 1 });
propertyManagerSchema.index({ status: 1, availabilityStatus: 1 });
propertyManagerSchema.index({ "assignedProperties.propertyId": 1 });

// Compound indexes
propertyManagerSchema.index({
  "assignedProperties.propertyId": 1,
  "assignedProperties.status": 1,
});
propertyManagerSchema.index({
  "owner.ownerType": 1,
  "owner.ownerId": 1,
  status: 1,
});
propertyManagerSchema.index({ status: 1, "assignedProperties.propertyId": 1 });
```

### Property Indexes

```javascript
// Basic indexes
propertySchema.index({ agency: 1 });
propertySchema.index({ assignedPropertyManager: 1 });

// Compound indexes
propertySchema.index({ assignedPropertyManager: 1, isActive: 1 });
propertySchema.index({ agency: 1, assignedPropertyManager: 1 });
```

### Notification Indexes

```javascript
// Basic indexes
notificationSchema.index({
  "recipient.recipientType": 1,
  "recipient.recipientId": 1,
});

// Compound indexes
notificationSchema.index({
  "recipient.recipientType": 1,
  "recipient.recipientId": 1,
  status: 1,
});
notificationSchema.index({ "recipient.recipientType": 1, createdAt: -1 });
notificationSchema.index({ type: 1, "recipient.recipientType": 1, status: 1 });
```

## Testing

### Test Suite

**Location**: `src/examples/testPropertyManager.js`

**Test Categories**:

1. **Authentication Tests**

   - Password hashing
   - JWT token generation
   - Account status methods

2. **Property Assignment Tests**

   - Property assignment functionality
   - Duplicate assignment prevention
   - Assignment summary calculation
   - Assignment removal

3. **Access Control Tests**

   - Initial access control (no properties)
   - Assigned property access
   - Data isolation between PropertyManagers

4. **Notification System Tests**

   - Job creation notifications
   - Compliance notifications
   - Unread count retrieval

5. **Database Index Tests**
   - PropertyManager indexes
   - Property indexes
   - Notification indexes

### Running Tests

```bash
# Run the complete test suite
node src/examples/testPropertyManager.js

# Expected output
🚀 Starting PropertyManager Test Suite...
✅ Connected to test database
✅ Cleaned up test data
✅ Created test data

🧪 Testing PropertyManager Authentication...
✅ Password hashing works correctly
✅ JWT token generation works
✅ Account status methods work correctly

🧪 Testing Property Assignment...
✅ Property assignment works correctly
✅ Duplicate assignment prevention works
✅ Property assignment summary works correctly
✅ Property assignment removal works correctly

🧪 Testing Access Control...
✅ PropertyManager starts with no assigned properties
✅ PropertyManager can access assigned property
✅ PropertyManager cannot access other PropertyManagers' data

🧪 Testing Notification System...
✅ PropertyManager received job creation notification
✅ PropertyManager received compliance notification
✅ Unread count retrieval works

🧪 Testing Database Indexes...
✅ All PropertyManager indexes are present
✅ All Property indexes are present
✅ All Notification indexes are present

📊 Test Results Summary:
==================================================
✅ 1. Password Hashing
✅ 2. JWT Token Generation
✅ 3. Account Status Methods
✅ 4. Property Assignment
✅ 5. Duplicate Assignment Prevention
✅ 6. Property Assignment Summary
✅ 7. Property Assignment Removal
✅ 8. Initial Access Control
✅ 9. Assigned Property Access
✅ 10. Data Isolation
✅ 11. Job Creation Notification
✅ 12. Compliance Notification
✅ 13. Unread Count
✅ 14. PropertyManager Indexes
✅ 15. Property Indexes
✅ 16. Notification Indexes

==================================================
Total Tests: 16
Passed: 16
Failed: 0
Success Rate: 100.0%

🎉 All tests passed! PropertyManager system is working correctly.
```

## Security Best Practices

### Implementation Guidelines

1. **Always Validate Property Assignment**

   ```javascript
   const isAssigned = await PropertyManagerSecurity.validatePropertyAssignment(
     propertyManagerId,
     propertyId
   );
   ```

2. **Use Access Filters for Queries**

   ```javascript
   const accessFilter = await PropertyManagerSecurity.createAccessFilter(
     propertyManagerId,
     "property"
   );
   const properties = await Property.find(accessFilter);
   ```

3. **Check Action Permissions**

   ```javascript
   const canWrite = await PropertyManagerSecurity.canPerformAction(
     propertyManagerId,
     "write",
     "property"
   );
   ```

4. **Audit All Access Attempts**
   ```javascript
   await PropertyManagerSecurity.auditAccess(
     propertyManagerId,
     "GET",
     "property",
     propertyId,
     success
   );
   ```

### Security Middleware Usage

```javascript
// Basic access validation
router.get(
  "/properties/:id",
  authenticatePropertyManager,
  validatePropertyManagerAccess("property"),
  getProperty
);

// Action-based validation
router.put(
  "/properties/:id",
  authenticatePropertyManager,
  validatePropertyManagerAction("write", "property"),
  updateProperty
);

// Comprehensive security
router.get(
  "/properties",
  authenticatePropertyManager,
  propertyManagerSecurity({
    resourceType: "property",
    action: "read",
    rateLimitAction: "property_read",
  }),
  getProperties
);
```

### Rate Limiting

The system implements rate limiting for PropertyManager actions:

- Property reads: 100 per minute
- Property writes: 10 per minute
- Job reads: 50 per minute
- Contact reads: 30 per minute

### Data Isolation

PropertyManagers are completely isolated from each other:

1. **No Cross-Access**: PropertyManagers cannot access other PropertyManagers' data
2. **Agency-Bound**: PropertyManagers can only access data related to their owning agency
3. **Property-Specific**: Access is limited to assigned properties only

### Audit Trail

All PropertyManager access attempts are logged with:

- PropertyManager ID
- Action performed
- Resource type and ID
- Success/failure status
- Timestamp
- IP address (when available)
- User agent (when available)

## Integration Points

### Notification System

PropertyManagers receive notifications for:

1. **Job Creation** - When jobs are created for their assigned properties
2. **Job Assignment** - When jobs are assigned to technicians
3. **Job Completion** - When jobs are completed
4. **Compliance Jobs** - When compliance jobs are created

### Property Assignment System

The property assignment system provides:

1. **Assignment Management** - Agency/SuperUser can assign/unassign PropertyManagers
2. **Role-Based Assignment** - Primary, Secondary, Backup roles
3. **Status Tracking** - Active, Inactive, Suspended assignment status
4. **Assignment History** - Track assignment dates and changes

### Contact Management

PropertyManagers have read-only access to contacts:

1. **Filtered Access** - Only contacts from agencies that own their assigned properties
2. **No Modification** - Cannot create, update, or delete contacts
3. **Agency Relationship** - Access based on property-to-agency relationships

## Error Handling

### Common Error Responses

```javascript
// Authentication required
{
  "success": false,
  "message": "Access denied. PropertyManager authentication required."
}

// Resource access denied
{
  "success": false,
  "message": "Access denied. You don't have permission to access this property."
}

// Action not allowed
{
  "success": false,
  "message": "Access denied. PropertyManagers cannot delete properties."
}

// Property not assigned
{
  "success": false,
  "message": "Access denied. You are not assigned to this property."
}

// Rate limit exceeded
{
  "success": false,
  "message": "Rate limit exceeded. Please try again later."
}
```

## Performance Considerations

### Database Optimization

1. **Indexed Queries** - All PropertyManager queries use indexed fields
2. **Compound Indexes** - Optimized for common query patterns
3. **Selective Population** - Only populate necessary fields
4. **Query Filtering** - Use access filters to limit result sets

### Caching Strategy

Consider implementing caching for:

1. **Property Assignments** - Cache PropertyManager's assigned properties
2. **Access Permissions** - Cache permission checks
3. **Agency Relationships** - Cache property-to-agency mappings

### Monitoring

Monitor the following metrics:

1. **Access Attempts** - Track successful vs failed access
2. **Query Performance** - Monitor database query execution times
3. **Rate Limiting** - Track rate limit violations
4. **Error Rates** - Monitor authentication and authorization failures

## Future Enhancements

### Potential Improvements

1. **Advanced Role System** - More granular roles and permissions
2. **Bulk Operations** - Batch property assignments and updates
3. **Real-time Notifications** - WebSocket-based real-time updates
4. **Audit Dashboard** - Web interface for access audit logs
5. **API Rate Limiting** - More sophisticated rate limiting with Redis
6. **Multi-factor Authentication** - Enhanced security with 2FA
7. **Session Management** - Advanced session tracking and management

### Scalability Considerations

1. **Database Sharding** - For large-scale deployments
2. **Microservices** - Split PropertyManager system into separate services
3. **Caching Layer** - Implement Redis for caching
4. **Load Balancing** - Distribute requests across multiple servers
5. **Database Replication** - Read replicas for improved performance

## Conclusion

The PropertyManager system provides a secure, scalable, and well-tested solution for property management with comprehensive access control. The system ensures data isolation, implements proper security measures, and provides detailed audit trails for compliance and monitoring purposes.

The modular design allows for easy extension and maintenance, while the comprehensive test suite ensures reliability and correctness of the implementation.
