# Property Assignment Synchronization Documentation

## Overview

This document describes the fix implemented to ensure proper synchronization between the `Property.assignedPropertyManager` field and the `PropertyManager.assignedProperties` array when creating properties or assigning property managers to properties.

## Problem Description

Previously, when creating a property with a property manager assignment or when assigning a property manager to an existing property, the system was only setting the `Property.assignedPropertyManager` field but not updating the `PropertyManager.assignedProperties` array. This created an inconsistency where:

1. The property knew which property manager was assigned to it
2. But the property manager didn't have the property in their `assignedProperties` array

## Solution Implemented

### 1. Property Creation with Assignment

**File:** `src/routes/property.routes.js` (lines 341-347)

When creating a property with a property manager assignment, the system now:

1. Sets `propertyData.assignedPropertyManager = assignedPropertyManagerId`
2. Creates and saves the property
3. **NEW:** Calls `propertyManager.assignProperty(property._id, "Primary")` to add the property to the property manager's `assignedProperties` array

```javascript
// If property manager is assigned, add property to their assignedProperties array
if (assignedPropertyManagerId) {
  const propertyManager = await PropertyManager.findById(
    assignedPropertyManagerId
  );
  if (propertyManager) {
    await propertyManager.assignProperty(property._id, "Primary");
  }
}
```

### 2. Property Assignment to Existing Property

**File:** `src/routes/property.routes.js` (lines 1052-1054)

When assigning a property manager to an existing property, the system already correctly:

1. Sets `property.assignedPropertyManager = propertyManagerId`
2. Saves the property
3. Calls `await propertyManager.assignProperty(id, role)` to add the property to the property manager's `assignedProperties` array

### 3. Property Unassignment

**File:** `src/routes/property.routes.js` (lines 1170-1172)

When unassigning a property manager from a property, the system correctly:

1. Sets `property.assignedPropertyManager = null`
2. Saves the property
3. Calls `await propertyManager.removePropertyAssignment(id)` to remove the property from the property manager's `assignedProperties` array

## PropertyManager Model Methods

The PropertyManager model provides the following methods for managing property assignments:

### `assignProperty(propertyId, role = "Primary")`

Adds a property to the property manager's `assignedProperties` array.

**Parameters:**

- `propertyId`: The ID of the property to assign
- `role`: The role of the property manager for this property (Primary, Secondary, Backup)

**Returns:** Updated PropertyManager instance

### `removePropertyAssignment(propertyId)`

Removes a property from the property manager's `assignedProperties` array.

**Parameters:**

- `propertyId`: The ID of the property to remove

**Returns:** Updated PropertyManager instance

### `updatePropertyAssignmentStatus(propertyId, status)`

Updates the status of a property assignment.

**Parameters:**

- `propertyId`: The ID of the property
- `status`: The new status (Active, Inactive, Suspended)

**Returns:** Updated PropertyManager instance

## Data Structure

### Property Model

```javascript
{
  assignedPropertyManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PropertyManager",
  }
}
```

### PropertyManager Model

```javascript
{
  assignedProperties: [
    {
      propertyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
        required: true,
      },
      assignedDate: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: ["Active", "Inactive", "Suspended"],
        default: "Active",
      },
      role: {
        type: String,
        enum: ["Primary", "Secondary", "Backup"],
        default: "Primary",
      },
    },
  ];
}
```

## Testing

A comprehensive test suite has been created in `src/examples/testPropertyAssignmentSync.js` that verifies:

1. Property creation with property manager assignment
2. Property assignment to existing properties
3. Property unassignment
4. Synchronization between both data structures

To run the test:

```bash
node src/examples/testPropertyAssignmentSync.js
```

## Benefits

1. **Data Consistency**: Both the Property and PropertyManager models now maintain consistent assignment information
2. **Better Querying**: Property managers can efficiently query their assigned properties using the `assignedProperties` array
3. **Role Management**: The system supports different roles (Primary, Secondary, Backup) for property assignments
4. **Status Tracking**: Property assignments can have different statuses (Active, Inactive, Suspended)
5. **Audit Trail**: Assignment dates are automatically tracked

## Migration Notes

For existing data where properties have `assignedPropertyManager` but the property manager doesn't have the property in their `assignedProperties` array, you may need to run a migration script to synchronize the data.

## Related Files

- `src/routes/property.routes.js` - Main property routes with assignment logic
- `src/models/PropertyManager.js` - PropertyManager model with assignment methods
- `src/models/Property.js` - Property model
- `src/examples/testPropertyAssignmentSync.js` - Test suite for verification
