# Property Manager Access to Contacts Route

## Overview

The contacts route (`/api/v1/contacts`) now supports Property Managers with read-only access and email capabilities. Property Managers can view and send emails to contacts related to properties they are assigned to manage.

## Access Control

### Property Manager Permissions

Property Managers can access contacts with full visibility:

1. **All contacts** in the system (no filtering based on property assignments)

### Authentication

Property Managers use the same authentication middleware as other user types:

- JWT token with `userType: "PropertyManager"`
- Token must be valid and not expired
- Property Manager account must be `Active`

## API Endpoints

### 1. Get All Contacts

```
GET /api/v1/contacts
```

**Property Manager Access:**

- ✅ Can fetch all contacts in the system
- ✅ Can see contacts from all agencies
- ✅ Can see contacts from all property owners

**Example Response:**

```json
{
  "status": "success",
  "data": {
    "contacts": [
      {
        "_id": "contact_id",
        "name": "John Doe",
        "role": "Tenant",
        "email": "john.doe@example.com",
        "phone": "+61412345678",
        "notes": "Contact notes",
        "preferredContact": "Email",
        "owner": {
          "ownerType": "Agency",
          "ownerId": "agency_id"
        },
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

### 2. Get Single Contact

```
GET /api/v1/contacts/:id
```

**Property Manager Access:**

- ✅ Can view all contacts in the system
- ✅ Can view contacts from all agencies
- ✅ Can view contacts from all property owners

### 3. Create Contact

```
POST /api/v1/contacts
```

**Property Manager Access:**

- ❌ **Cannot create contacts** (read-only access)

**Error Response:**

```json
{
  "status": "error",
  "message": "Property Managers have read-only access to contacts"
}
```

### 4. Update Contact

```
PUT /api/v1/contacts/:id
```

**Property Manager Access:**

- ❌ **Cannot update contacts** (read-only access)

**Error Response:**

```json
{
  "status": "error",
  "message": "Property Managers have read-only access to contacts"
}
```

### 5. Delete Contact

```
DELETE /api/v1/contacts/:id
```

**Property Manager Access:**

- ❌ **Cannot delete contacts** (read-only access)

**Error Response:**

```json
{
  "status": "error",
  "message": "Property Managers have read-only access to contacts"
}
```

### 6. Send Email to Contact

```
POST /api/v1/contacts/:id/send-email
```

**Property Manager Access:**

- ✅ Can send emails to any contact in the system
- ✅ Can send emails to contacts from all agencies

**Request Body:**

```json
{
  "subject": "Email Subject",
  "html": "<p>Email content in HTML format</p>"
}
```

**Example Response:**

```json
{
  "status": "success",
  "message": "Email sent successfully"
}
```

## How It Works

### Contact Access Logic

When a Property Manager requests contacts, the system:

1. **No filtering applied:** Property Managers can see all contacts in the system
2. **Full visibility:** Returns all contacts regardless of property assignments
3. **Universal access:** Can view and email any contact

### Code Implementation

```javascript
// PropertyManager: can see all contacts (no filtering)
// No query filter needed - will return all contacts
```

## Security Considerations

### Access Control

- Property Managers can access all contacts in the system
- They can view and email any contact regardless of property assignments
- Email permissions are available for all contacts

### Data Validation

- All input data is validated before processing
- Email formats are verified for sending emails
- Contact ownership is verified before any operations

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
  "message": "Property Managers have read-only access to contacts"
}
```

**404 Not Found:**

```json
{
  "status": "error",
  "message": "Contact not found"
}
```

**500 Internal Server Error:**

```json
{
  "status": "error",
  "message": "Unable to fetch contacts"
}
```

## Testing

Use the provided test file `src/examples/testPropertyManagerContacts.js` to verify functionality:

```javascript
import { testPropertyManagerContacts } from "./src/examples/testPropertyManagerContacts.js";

// Run the tests
await testPropertyManagerContacts();
```

## Migration Notes

### Changes Made

1. Removed contact filtering for Property Managers - they can see all contacts
2. Added Property Manager support for email sending to any contact
3. Maintained read-only access for Property Managers (no create/update/delete)
4. Added proper permission checks for all contact operations

### Backward Compatibility

- All existing Agency and SuperUser functionality remains unchanged
- Existing API contracts are preserved
- No breaking changes to response formats

## Usage Examples

### Frontend Integration

```javascript
// Fetch contacts as Property Manager
const fetchContacts = async (token) => {
  const response = await fetch("/api/v1/contacts", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return response.json();
};

// Send email to contact as Property Manager
const sendEmailToContact = async (token, contactId, subject, html) => {
  const response = await fetch(`/api/v1/contacts/${contactId}/send-email`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ subject, html }),
  });
  return response.json();
};

// Try to create contact (will be denied)
const createContact = async (token, contactData) => {
  const response = await fetch("/api/v1/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(contactData),
  });
  return response.json();
};
```

## Troubleshooting

### Empty Contacts List

If Property Managers are getting an empty contacts list:

1. **Check System Contacts:** Verify that there are contacts in the system
2. **Check Authentication:** Ensure the Property Manager token is valid
3. **Check Database:** Verify the contacts collection has data

### Access Denied Errors

If Property Managers get access denied errors:

1. **Verify Token:** Ensure the JWT token is valid and for a Property Manager
2. **Check Permissions:** Verify the Property Manager account is active
3. **Check Contact Existence:** Ensure the contact exists in the system

## Conclusion

Property Managers now have read-only access to contacts with email capabilities. They can view and send emails to any contact in the system, but cannot create, update, or delete contacts. This provides Property Managers with full visibility of all contacts while maintaining appropriate access controls.
