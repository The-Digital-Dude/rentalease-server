# Invoice System API Documentation

## Overview

The Invoice System API provides comprehensive functionality for creating, managing, and sending invoices for completed jobs. The system includes automatic cost calculations, validation, and notification features.

## Invoice Model

### Schema Fields

| Field              | Type     | Description                 | Required | Validation        |
| ------------------ | -------- | --------------------------- | -------- | ----------------- |
| `id`               | ObjectId | Unique invoice identifier   | Auto     | MongoDB ObjectId  |
| `jobId`            | ObjectId | Reference to the job        | Yes      | Must exist        |
| `technicianId`     | ObjectId | Reference to the technician | Yes      | Must exist        |
| `agencyId`         | ObjectId | Reference to the agency     | Yes      | Must exist        |
| `invoiceNumber`    | String   | Unique invoice number       | Auto     | Auto-generated    |
| `description`      | String   | Invoice description         | Yes      | Max 1000 chars    |
| `items`            | Array    | Invoice line items          | Yes      | At least 1 item   |
| `subtotal`         | Number   | Sum of all items            | Auto     | Calculated        |
| `tax`              | Number   | Tax amount                  | No       | Default 0         |
| `totalCost`        | Number   | Total invoice amount        | Auto     | Subtotal + Tax    |
| `status`           | String   | Invoice status              | Auto     | Pending/Sent/Paid |
| `createdAt`        | Date     | Creation timestamp          | Auto     | Auto-set          |
| `sentAt`           | Date     | Sent timestamp              | Auto     | Set when sent     |
| `paidAt`           | Date     | Paid timestamp              | Auto     | Set when paid     |
| `notes`            | String   | Additional notes            | No       | Max 2000 chars    |
| `paymentMethod`    | String   | Payment method              | No       | Enum values       |
| `paymentReference` | String   | Payment reference           | No       | Max 100 chars     |

### Invoice Item Schema

| Field      | Type   | Description   | Required | Validation      |
| ---------- | ------ | ------------- | -------- | --------------- |
| `name`     | String | Item name     | Yes      | Max 200 chars   |
| `quantity` | Number | Item quantity | Yes      | > 0             |
| `rate`     | Number | Item rate     | Yes      | >= 0            |
| `amount`   | Number | Item total    | Auto     | Quantity × Rate |

### Status Values

- **Pending**: Invoice created but not sent
- **Sent**: Invoice sent to agency
- **Paid**: Invoice paid by agency

## API Endpoints

### 1. Create Invoice

**POST** `/v1/invoices`

Creates a new invoice for a completed job.

#### Authentication

- **Required**: Yes
- **Type**: Bearer Token
- **User Types**: SuperUser, Agency, Technician

#### Request Body

```json
{
  "jobId": "507f1f77bcf86cd799439011",
  "technicianId": "507f1f77bcf86cd799439012",
  "agencyId": "507f1f77bcf86cd799439013",
  "description": "Gas safety inspection and certification",
  "items": [
    {
      "name": "Gas Safety Inspection",
      "quantity": 1,
      "rate": 150.0
    },
    {
      "name": "Safety Certificate",
      "quantity": 1,
      "rate": 50.0
    },
    {
      "name": "Travel Time",
      "quantity": 0.5,
      "rate": 80.0
    }
  ],
  "tax": 24.0,
  "notes": "Standard gas safety inspection completed successfully."
}
```

#### Validation Rules

- Job must exist and be in "Completed" status
- Technician must exist
- Agency must exist
- At least one item is required
- All items must have valid name, quantity, and rate
- No duplicate invoice for the same job

#### Response

```json
{
  "status": "success",
  "message": "Invoice created successfully",
  "data": {
    "invoice": {
      "id": "507f1f77bcf86cd799439014",
      "invoiceNumber": "INV-1733123456789-123",
      "jobId": {
        "id": "507f1f77bcf86cd799439011",
        "job_id": "J-123456",
        "jobType": "Gas",
        "property": {
          "id": "507f1f77bcf86cd799439015",
          "address": {
            "fullAddress": "123 Test Street, Test City, NSW 2000"
          }
        }
      },
      "technicianId": {
        "id": "507f1f77bcf86cd799439012",
        "firstName": "John",
        "lastName": "Technician",
        "email": "john@example.com"
      },
      "agencyId": {
        "id": "507f1f77bcf86cd799439013",
        "companyName": "Test Agency",
        "contactPerson": "Jane Doe",
        "email": "jane@testagency.com"
      },
      "description": "Gas safety inspection and certification",
      "items": [
        {
          "name": "Gas Safety Inspection",
          "quantity": 1,
          "rate": 150.0,
          "amount": 150.0
        },
        {
          "name": "Safety Certificate",
          "quantity": 1,
          "rate": 50.0,
          "amount": 50.0
        },
        {
          "name": "Travel Time",
          "quantity": 0.5,
          "rate": 80.0,
          "amount": 40.0
        }
      ],
      "subtotal": 240.0,
      "tax": 24.0,
      "totalCost": 264.0,
      "status": "Pending",
      "notes": "Standard gas safety inspection completed successfully.",
      "paymentMethod": null,
      "paymentReference": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "sentAt": null,
      "paidAt": null,
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### 2. Get Invoice for Job

**GET** `/v1/invoices/job/{jobId}`

Retrieves the invoice for a specific job.

#### Authentication

- **Required**: Yes
- **Type**: Bearer Token
- **User Types**: SuperUser, Agency, Technician

#### URL Parameters

| Parameter | Type   | Description                 | Required |
| --------- | ------ | --------------------------- | -------- |
| jobId     | String | MongoDB ObjectId of the job | Yes      |

#### Response

```json
{
  "status": "success",
  "message": "Invoice retrieved successfully",
  "data": {
    "invoice": {
      "id": "507f1f77bcf86cd799439014",
      "invoiceNumber": "INV-1733123456789-123",
      "jobId": {
        "id": "507f1f77bcf86cd799439011",
        "job_id": "J-123456",
        "jobType": "Gas",
        "property": {
          "id": "507f1f77bcf86cd799439015",
          "address": {
            "fullAddress": "123 Test Street, Test City, NSW 2000"
          }
        },
        "dueDate": "2024-01-15T00:00:00.000Z",
        "status": "Completed"
      },
      "technicianId": {
        "id": "507f1f77bcf86cd799439012",
        "firstName": "John",
        "lastName": "Technician",
        "email": "john@example.com",
        "phone": "0412345678"
      },
      "agencyId": {
        "id": "507f1f77bcf86cd799439013",
        "companyName": "Test Agency",
        "contactPerson": "Jane Doe",
        "email": "jane@testagency.com",
        "phone": "0298765432"
      },
      "description": "Gas safety inspection and certification",
      "items": [...],
      "subtotal": 240.00,
      "tax": 24.00,
      "totalCost": 264.00,
      "status": "Pending",
      "notes": "Standard gas safety inspection completed successfully.",
      "paymentMethod": null,
      "paymentReference": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "sentAt": null,
      "paidAt": null,
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### 3. Send Invoice

**PATCH** `/v1/invoices/{invoiceId}/send`

Sends an invoice to the agency and updates its status to "Sent".

#### Authentication

- **Required**: Yes
- **Type**: Bearer Token
- **User Types**: SuperUser, Technician (assigned to invoice)

#### URL Parameters

| Parameter | Type   | Description                     | Required |
| --------- | ------ | ------------------------------- | -------- |
| invoiceId | String | MongoDB ObjectId of the invoice | Yes      |

#### Validation Rules

- Invoice must exist
- Invoice status must be "Pending"
- Only super users or the assigned technician can send invoices

#### Response

```json
{
  "status": "success",
  "message": "Invoice sent successfully",
  "data": {
    "invoice": {
      "id": "507f1f77bcf86cd799439014",
      "invoiceNumber": "INV-1733123456789-123",
      "jobId": {...},
      "technicianId": {...},
      "agencyId": {...},
      "description": "Gas safety inspection and certification",
      "items": [...],
      "subtotal": 240.00,
      "tax": 24.00,
      "totalCost": 264.00,
      "status": "Sent",
      "notes": "Standard gas safety inspection completed successfully.",
      "paymentMethod": null,
      "paymentReference": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "sentAt": "2024-01-15T11:00:00.000Z",
      "paidAt": null,
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  }
}
```

### 4. Get All Invoices

**GET** `/v1/invoices`

Retrieves all invoices with filtering and pagination.

#### Authentication

- **Required**: Yes
- **Type**: Bearer Token
- **User Types**: SuperUser, Agency, Technician

#### Query Parameters

| Parameter    | Type   | Description           | Default   |
| ------------ | ------ | --------------------- | --------- |
| status       | String | Filter by status      | All       |
| technicianId | String | Filter by technician  | All       |
| agencyId     | String | Filter by agency      | All       |
| startDate    | String | Filter by start date  | All       |
| endDate      | String | Filter by end date    | All       |
| page         | Number | Page number           | 1         |
| limit        | Number | Items per page        | 10        |
| sortBy       | String | Sort field            | createdAt |
| sortOrder    | String | Sort order (asc/desc) | desc      |

#### Response

```json
{
  "status": "success",
  "message": "Invoices retrieved successfully",
  "data": {
    "invoices": [
      {
        "id": "507f1f77bcf86cd799439014",
        "invoiceNumber": "INV-1733123456789-123",
        "jobId": {
          "id": "507f1f77bcf86cd799439011",
          "job_id": "J-123456",
          "jobType": "Gas",
          "property": {...}
        },
        "technicianId": {
          "id": "507f1f77bcf86cd799439012",
          "firstName": "John",
          "lastName": "Technician",
          "email": "john@example.com"
        },
        "agencyId": {
          "id": "507f1f77bcf86cd799439013",
          "companyName": "Test Agency",
          "contactPerson": "Jane Doe"
        },
        "description": "Gas safety inspection and certification",
        "totalCost": 264.00,
        "status": "Sent",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "sentAt": "2024-01-15T11:00:00.000Z"
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
        "Pending": 10,
        "Sent": 25,
        "Paid": 15
      },
      "totalInvoices": 50
    }
  }
}
```

### 5. Get Specific Invoice

**GET** `/v1/invoices/{id}`

Retrieves a specific invoice by ID.

#### Authentication

- **Required**: Yes
- **Type**: Bearer Token
- **User Types**: SuperUser, Agency, Technician

#### URL Parameters

| Parameter | Type   | Description                     | Required |
| --------- | ------ | ------------------------------- | -------- |
| id        | String | MongoDB ObjectId of the invoice | Yes      |

#### Response

Same format as "Get Invoice for Job" response.

## Business Logic

### Invoice Creation Rules

1. **Job Status**: Invoice can only be created for completed jobs
2. **Unique Invoice**: Only one invoice per job
3. **Required References**: Job, technician, and agency must exist
4. **Item Validation**: At least one item with valid data required
5. **Cost Calculation**: Automatic calculation of subtotal and total cost

### Invoice Status Flow

```
Pending → Sent → Paid
   ↓        ↓      ↓
Created   Sent   Paid
```

### Access Control

- **Super Users**: Can view and manage all invoices
- **Agencies**: Can only view their own invoices
- **Technicians**: Can only view invoices they created

### Cost Calculations

```javascript
// Item amount calculation
item.amount = item.quantity × item.rate

// Invoice totals
subtotal = sum of all item amounts
totalCost = subtotal + tax
```

## Notifications

### Invoice Created Notification

- **Recipients**: Agency, All Super Users
- **Type**: `INVOICE_CREATED`
- **Data**: Invoice details, job info, technician info

### Invoice Sent Notification

- **Recipients**: Agency, All Super Users
- **Type**: `INVOICE_SENT`
- **Data**: Invoice details, sent timestamp, sender info

## Email Integration

### Invoice Email Template

When an invoice is sent, an email is automatically sent to the agency containing:

- Invoice number and details
- Item breakdown
- Cost calculations
- Payment instructions
- Contact information

## Error Handling

### Common Error Responses

#### 400 Bad Request - Validation Error

```json
{
  "status": "error",
  "message": "Please check the form for errors",
  "details": {
    "jobId": "Job ID is required",
    "items": "At least one item is required"
  }
}
```

#### 400 Bad Request - Business Rule Violation

```json
{
  "status": "error",
  "message": "Invoice can only be created for completed jobs",
  "details": {
    "jobStatus": "Scheduled",
    "requiredStatus": "Completed"
  }
}
```

#### 409 Conflict - Duplicate Invoice

```json
{
  "status": "error",
  "message": "Invoice already exists for this job",
  "details": {
    "existingInvoiceId": "507f1f77bcf86cd799439014",
    "existingInvoiceNumber": "INV-1733123456789-123"
  }
}
```

#### 403 Forbidden - Access Denied

```json
{
  "status": "error",
  "message": "Access denied. You do not have permission to view this invoice."
}
```

## Testing

A test file is available at `src/examples/testInvoiceSystem.js` that validates:

1. ✅ Invoice data validation
2. ✅ Item validation
3. ✅ Status validation
4. ✅ Invoice number generation
5. ✅ Business rules validation

To run the test:

```bash
node src/examples/testInvoiceSystem.js
```

## Security Considerations

1. **Authentication Required**: All endpoints require valid authentication
2. **Authorization**: Role-based access control for invoice operations
3. **Input Validation**: Comprehensive validation of all inputs
4. **Data Integrity**: Automatic calculations and status management
5. **Audit Trail**: Timestamps for all status changes

## Related Endpoints

- `GET /v1/jobs` - List jobs
- `GET /v1/jobs/{id}` - Get specific job
- `PATCH /v1/jobs/{id}/complete` - Complete job
- `GET /v1/notifications` - Get notifications

## Changelog

- **v1.0.0** - Initial implementation of Invoice System API
  - Created Invoice model with comprehensive validation
  - Implemented all requested API endpoints
  - Added notification and email integration
  - Created test scenarios and documentation
  - Added cost calculation and business logic
