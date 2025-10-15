# Property Manager Invoice API Documentation

Base URL: `/api/property-manager-invoices`

## Overview
This API manages invoices for property managers. Invoices are automatically linked to properties, property managers, and agencies based on the property's assignments.

---

## Endpoints

### 1. Create Property Manager Invoice

**POST** `/`

Creates a new invoice for a property manager. The system automatically derives the property manager and agency from the property.

#### Request Body
```json
{
  "propertyId": "string (required)",
  "description": "string (required)",
  "amount": "number (required)",
  "dueDate": "string (required, ISO date format)",
  "notes": "string (optional)"
}
```

#### Field Validations
- `propertyId`: Valid MongoDB ObjectId
- `description`: Required string
- `amount`: Non-negative number
- `dueDate`: Valid date string (e.g., "2025-12-31" or "2025-12-31T00:00:00Z")
- `notes`: Optional string

#### Success Response
**Code:** `201 Created`

```json
{
  "status": "success",
  "message": "Property Manager Invoice created successfully",
  "data": {
    "invoice": {
      "id": "string",
      "propertyId": {
        "_id": "string",
        "address": {
          "street": "string",
          "suburb": "string",
          "state": "string",
          "postcode": "string",
          "fullAddress": "string"
        },
        "propertyType": "string",
        "region": "string"
      },
      "propertyManagerId": {
        "_id": "string",
        "firstName": "string",
        "lastName": "string",
        "email": "string",
        "phone": "string"
      },
      "agencyId": {
        "_id": "string",
        "companyName": "string",
        "contactPerson": "string",
        "email": "string"
      },
      "description": "string",
      "amount": "number",
      "dueDate": "string",
      "status": "string",
      "notes": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  }
}
```

#### Error Responses

**Code:** `400 Bad Request`
```json
{
  "status": "error",
  "message": "Please provide all required fields",
  "details": {
    "propertyId": "Property ID is required",
    "description": "Description is required",
    "amount": "Amount is required",
    "dueDate": "Due date is required"
  }
}
```

**Code:** `404 Not Found`
```json
{
  "status": "error",
  "message": "Property not found"
}
```

**Code:** `400 Bad Request`
```json
{
  "status": "error",
  "message": "Property does not have a property manager assigned"
}
```

---

### 2. Get All Property Manager Invoices

**GET** `/`

Retrieves all property manager invoices with filtering, pagination, and statistics.

#### Query Parameters
- `status` (optional): Filter by invoice status (`Pending`, `Sent`, `Paid`)
- `propertyId` (optional): Filter by property ID
- `startDate` (optional): Filter invoices due after this date (ISO format)
- `endDate` (optional): Filter invoices due before this date (ISO format)
- `page` (optional, default: 1): Page number for pagination
- `limit` (optional, default: 10): Number of items per page
- `sortBy` (optional, default: "createdAt"): Field to sort by
- `sortOrder` (optional, default: "desc"): Sort order (`asc` or `desc`)

#### Example Request
```
GET /api/property-manager-invoices?status=Pending&page=1&limit=20&sortBy=dueDate&sortOrder=asc
```

#### Success Response
**Code:** `200 OK`

```json
{
  "status": "success",
  "message": "Property Manager Invoices retrieved successfully",
  "data": {
    "invoices": [
      {
        "id": "string",
        "propertyId": "string",
        "propertyManagerId": "string",
        "agencyId": "string",
        "description": "string",
        "amount": "number",
        "dueDate": "string",
        "status": "string",
        "notes": "string"
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
        "Pending": 20,
        "Sent": 15,
        "Paid": 15
      },
      "totalInvoices": 50,
      "totalAmount": 50000,
      "paidAmount": 15000,
      "pendingAmount": 35000
    }
  }
}
```

---

### 3. Get Invoices by Property Manager

**GET** `/property-manager/:propertyManagerId`

Retrieves all invoices for a specific property manager.

#### URL Parameters
- `propertyManagerId` (required): Valid MongoDB ObjectId

#### Query Parameters
Same as "Get All Property Manager Invoices" endpoint, except `propertyId` is optional for additional filtering.

#### Example Request
```
GET /api/property-manager-invoices/property-manager/68e841fbf01601e10519d938?status=Pending
```

#### Success Response
**Code:** `200 OK`

Same structure as "Get All Property Manager Invoices" response.

#### Error Responses

**Code:** `400 Bad Request`
```json
{
  "status": "error",
  "message": "Invalid property manager ID format"
}
```

---

### 4. Get Invoices by Agency

**GET** `/agency/:agencyId`

Retrieves all invoices for a specific agency.

#### URL Parameters
- `agencyId` (required): Valid MongoDB ObjectId

#### Query Parameters
Same as "Get All Property Manager Invoices" endpoint, with optional additional filtering.

#### Example Request
```
GET /api/property-manager-invoices/agency/68e83e813de1ac7262da1854?status=Paid
```

#### Success Response
**Code:** `200 OK`

Same structure as "Get All Property Manager Invoices" response.

---

### 5. Get Invoice by ID

**GET** `/:id`

Retrieves a specific property manager invoice by its ID.

#### URL Parameters
- `id` (required): Valid MongoDB ObjectId of the invoice

#### Example Request
```
GET /api/property-manager-invoices/68e84391f01601e10519dc5b
```

#### Success Response
**Code:** `200 OK`

```json
{
  "status": "success",
  "message": "Property Manager Invoice retrieved successfully",
  "data": {
    "invoice": {
      "id": "string",
      "propertyId": {
        "_id": "string",
        "address": { /* full address object */ },
        "propertyType": "string",
        "region": "string",
        "agency": "string"
      },
      "propertyManagerId": {
        "_id": "string",
        "firstName": "string",
        "lastName": "string",
        "email": "string",
        "phone": "string"
      },
      "agencyId": {
        "_id": "string",
        "companyName": "string",
        "contactPerson": "string",
        "email": "string",
        "phone": "string"
      },
      "description": "string",
      "amount": "number",
      "dueDate": "string",
      "status": "string",
      "notes": "string",
      "sentAt": "string (nullable)",
      "paidAt": "string (nullable)",
      "paymentMethod": "string (nullable)",
      "paymentReference": "string (nullable)",
      "createdAt": "string",
      "updatedAt": "string"
    }
  }
}
```

#### Error Responses

**Code:** `404 Not Found`
```json
{
  "status": "error",
  "message": "Property Manager Invoice not found"
}
```

---

### 6. Update Invoice

**PUT** `/:id`

Updates an existing property manager invoice.

#### URL Parameters
- `id` (required): Valid MongoDB ObjectId of the invoice

#### Request Body
All fields are optional. Only include fields you want to update.

```json
{
  "description": "string (optional)",
  "amount": "number (optional)",
  "dueDate": "string (optional, ISO date format)",
  "notes": "string (optional)",
  "status": "string (optional, one of: Pending, Sent, Paid)"
}
```

#### Example Request
```json
{
  "amount": 350,
  "status": "Sent",
  "notes": "Updated invoice amount"
}
```

#### Success Response
**Code:** `200 OK`

```json
{
  "status": "success",
  "message": "Property Manager Invoice updated successfully",
  "data": {
    "invoice": { /* full invoice object */ }
  }
}
```

#### Error Responses

**Code:** `400 Bad Request`
```json
{
  "status": "error",
  "message": "Amount must be a non-negative number"
}
```

**Code:** `404 Not Found`
```json
{
  "status": "error",
  "message": "Property Manager Invoice not found"
}
```

---

### 7. Update Invoice Status

**PATCH** `/:id/status`

Updates only the status of an invoice. Automatically updates timestamps (`sentAt`, `paidAt`) based on status changes.

#### URL Parameters
- `id` (required): Valid MongoDB ObjectId of the invoice

#### Request Body
```json
{
  "status": "string (required, one of: Pending, Sent, Paid)",
  "paymentMethod": "string (optional, required when status is Paid)",
  "paymentReference": "string (optional)"
}
```

#### Example Request
```json
{
  "status": "Paid",
  "paymentMethod": "Bank Transfer",
  "paymentReference": "TXN123456789"
}
```

#### Success Response
**Code:** `200 OK`

```json
{
  "status": "success",
  "message": "Property Manager Invoice status updated successfully",
  "data": {
    "invoice": { /* full invoice object with updated timestamps */ }
  }
}
```

#### Automatic Timestamp Updates
- When status changes to `Sent`: Sets `sentAt` to current timestamp (if not already set)
- When status changes to `Paid`: Sets `paidAt` to current timestamp (if not already set)

#### Error Responses

**Code:** `400 Bad Request`
```json
{
  "status": "error",
  "message": "Valid status is required (Pending, Sent, Paid)"
}
```

---

### 8. Delete Invoice

**DELETE** `/:id`

Deletes a property manager invoice. Paid invoices cannot be deleted.

#### URL Parameters
- `id` (required): Valid MongoDB ObjectId of the invoice

#### Example Request
```
DELETE /api/property-manager-invoices/68e84391f01601e10519dc5b
```

#### Success Response
**Code:** `200 OK`

```json
{
  "status": "success",
  "message": "Property Manager Invoice deleted successfully"
}
```

#### Error Responses

**Code:** `400 Bad Request`
```json
{
  "status": "error",
  "message": "Cannot delete paid invoices"
}
```

**Code:** `404 Not Found`
```json
{
  "status": "error",
  "message": "Property Manager Invoice not found"
}
```

---

## Invoice Status Values

The invoice status can be one of the following:
- `Pending`: Invoice created but not sent
- `Sent`: Invoice sent to property manager
- `Paid`: Invoice has been paid

---

## Data Models

### Invoice Object (Summary)
```typescript
{
  id: string;
  propertyId: string;
  propertyManagerId: string;
  agencyId: string;
  description: string;
  amount: number;
  dueDate: string;
  status: "Pending" | "Sent" | "Paid";
  notes?: string;
}
```

### Invoice Object (Full Details)
```typescript
{
  id: string;
  propertyId: Property;
  propertyManagerId: PropertyManager;
  agencyId: Agency;
  description: string;
  amount: number;
  dueDate: string;
  status: "Pending" | "Sent" | "Paid";
  notes?: string;
  sentAt?: string;
  paidAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Common Error Codes

- `400 Bad Request`: Invalid input or validation error
- `403 Forbidden`: Access denied due to permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Notes

1. **Authentication**: All routes currently have authentication commented out for testing purposes. In production, uncomment the `authenticateUserTypes` middleware.

2. **Automatic Derivation**: The `propertyManagerId` and `agencyId` are automatically derived from the property when creating an invoice. You only need to provide the `propertyId`.

3. **Pagination**: Default pagination is 10 items per page. Maximum recommended limit is 100 items per page.

4. **Date Filtering**: When using date filters, use ISO 8601 format (e.g., "2025-12-31" or "2025-12-31T23:59:59Z").

5. **Statistics**: The GET all invoices endpoint includes useful statistics like total amounts, status counts, and payment summaries.

6. **Paid Invoice Protection**: Paid invoices cannot be deleted to maintain financial record integrity.

---

## Example Use Cases

### Create Invoice for a Property
```bash
curl -X POST http://localhost:3000/api/property-manager-invoices \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "68e84391f01601e10519dc5b",
    "description": "Monthly property management fee",
    "amount": 250,
    "dueDate": "2025-11-30",
    "notes": "November management fee"
  }'
```

### Get All Pending Invoices
```bash
curl -X GET "http://localhost:3000/api/property-manager-invoices?status=Pending&sortBy=dueDate&sortOrder=asc"
```

### Mark Invoice as Paid
```bash
curl -X PATCH http://localhost:3000/api/property-manager-invoices/68e84391f01601e10519dc5b/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Paid",
    "paymentMethod": "Bank Transfer",
    "paymentReference": "TXN123456"
  }'
```

### Get Invoices for a Specific Property Manager
```bash
curl -X GET "http://localhost:3000/api/property-manager-invoices/property-manager/68e841fbf01601e10519d938?page=1&limit=20"
```
