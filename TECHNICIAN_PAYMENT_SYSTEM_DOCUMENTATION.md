# Technician Payment System Documentation

## Overview

The Technician Payment System automatically creates payment records for technicians when they complete jobs. Each job type has a fixed payment amount that is automatically calculated and stored in the database.

## Payment Rates

| Job Type           | Payment Amount |
| ------------------ | -------------- |
| Gas                | $50            |
| Electrical         | $80            |
| Smoke              | $60            |
| Repairs            | $70            |
| Routine Inspection | $70            |

## Database Schema

### TechnicianPayment Model

```javascript
{
  paymentNumber: String,        // Auto-generated unique payment number (TP-XXXXXX)
  technicianId: ObjectId,       // Reference to Technician
  jobId: ObjectId,             // Reference to completed Job
  agencyId: ObjectId,          // Reference to Agency
  jobType: String,             // Type of job completed
  amount: Number,              // Payment amount based on job type
  jobCompletedAt: Date,        // When the job was completed
  status: String,              // "Pending", "Paid", "Cancelled"
  paymentDate: Date,           // When payment was made (null if pending)
  notes: String,               // Optional notes
  createdBy: {                 // Who created the payment record
    userType: String,          // "SuperUser", "Agency", "System"
    userId: ObjectId
  },
  createdAt: Date,             // Auto-generated timestamp
  updatedAt: Date              // Auto-generated timestamp
}
```

## API Endpoints

### Base URL: `/api/v1/technician-payments`

### 1. Get All Technician Payments

**GET** `/api/v1/technician-payments`

**Query Parameters:**

- `technicianId` (optional): Filter by specific technician
- `agencyId` (optional): Filter by specific agency (SuperUser only)
- `status` (optional): Filter by payment status
- `jobType` (optional): Filter by job type
- `startDate` (optional): Filter payments from this date
- `endDate` (optional): Filter payments until this date
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response:**

```json
{
  "status": "success",
  "data": {
    "payments": [
      {
        "id": "payment_id",
        "paymentNumber": "TP-123456",
        "technicianId": "technician_id",
        "jobId": "job_id",
        "jobType": "Electrical",
        "amount": 80,
        "status": "Pending",
        "jobCompletedAt": "2024-01-15T10:30:00Z",
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100,
      "hasNextPage": true,
      "hasPrevPage": false,
      "limit": 20
    }
  }
}
```

### 2. Get Technician Payment by ID

**GET** `/api/v1/technician-payments/:id`

**Response:**

```json
{
  "status": "success",
  "data": {
    "payment": {
      "id": "payment_id",
      "paymentNumber": "TP-123456",
      "technicianId": {
        "id": "technician_id",
        "fullName": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890"
      },
      "jobId": {
        "id": "job_id",
        "job_id": "J-123456",
        "property": "property_id",
        "jobType": "Electrical",
        "dueDate": "2024-01-15T10:30:00Z"
      },
      "agencyId": {
        "id": "agency_id",
        "name": "ABC Agency",
        "email": "contact@abcagency.com"
      },
      "jobType": "Electrical",
      "amount": 80,
      "jobCompletedAt": "2024-01-15T10:30:00Z",
      "status": "Pending",
      "paymentDate": null,
      "notes": "",
      "createdBy": {
        "userType": "System",
        "userId": "system_id"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### 3. Update Payment Status

**PATCH** `/api/v1/technician-payments/:id/status`

**Request Body:**

```json
{
  "status": "Paid",
  "notes": "Payment processed via bank transfer"
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Payment status updated successfully",
  "data": {
    "payment": {
      // Full payment details with updated status
    }
  }
}
```

### 4. Get Payments for Specific Technician

**GET** `/api/v1/technician-payments/technician/:technicianId`

**Query Parameters:**

- `status` (optional): Filter by payment status
- `startDate` (optional): Filter payments from this date
- `endDate` (optional): Filter payments until this date
- `page` (optional): Page number for pagination
- `limit` (optional): Items per page

## Automatic Payment Creation

### When Jobs Are Completed

When a technician marks a job as completed, the system automatically:

1. **Calculates Payment Amount**: Based on the job type using the predefined rates
2. **Creates Payment Record**: Generates a new `TechnicianPayment` document
3. **Links References**: Connects the payment to the technician, job, and agency
4. **Sets Status**: Payment status is set to "Pending" by default

### Job Completion Flow

```javascript
// When job is completed via PATCH /api/v1/jobs/:id/complete
// The system automatically creates a technician payment:

const paymentAmount = TechnicianPayment.getPaymentAmountByJobType(job.jobType);

const technicianPayment = new TechnicianPayment({
  technicianId: job.assignedTechnician,
  jobId: job._id,
  agencyId: agencyId, // From job owner or property
  jobType: job.jobType,
  amount: paymentAmount,
  jobCompletedAt: new Date(),
  createdBy: {
    userType: "System",
    userId: job.assignedTechnician,
  },
});

await technicianPayment.save();
```

## Access Control

### Agency Users

- Can view payments for their own agency only
- Can update payment status (mark as paid/cancelled)
- Cannot view payments from other agencies

### Super Users

- Can view all payments across all agencies
- Can filter payments by agency
- Can update payment status for any payment

### Technicians

- Can view their own payments only
- Cannot update payment status
- Cannot view payments from other technicians

## Payment Status Management

### Status Transitions

1. **Pending** (default): Payment created but not yet processed
2. **Paid**: Payment has been processed and paid to technician
3. **Cancelled**: Payment has been cancelled (e.g., job was invalid)

### Status Update Rules

- Only agencies can update payment status
- When marking as "Paid", the `paymentDate` is automatically set
- Status changes are logged with timestamps

## Error Handling

### Payment Creation Errors

If payment creation fails during job completion:

- The error is logged but doesn't fail the job completion
- The job is still marked as completed
- Payment can be created manually later if needed

### Common Error Scenarios

1. **Missing Agency**: If job has no associated agency
2. **Invalid Job Type**: If job type doesn't match predefined types
3. **Database Errors**: Connection issues or validation errors

## Testing

### Run Test Script

```bash
node src/examples/testTechnicianPayment.js
```

This will test:

- Payment rate calculations
- Payment creation
- Summary and full details methods
- Model validation

## Integration with Existing Systems

### Job Completion Integration

- Automatically triggers payment creation
- Maintains transaction integrity
- Logs errors without failing job completion

### Notification System

- Can be extended to send payment notifications
- Email alerts for new payments
- In-app notifications for payment status changes

### Invoice System

- Separate from customer invoices
- Internal payment tracking for technicians
- Can be used for payroll processing

## Future Enhancements

### Potential Features

1. **Bulk Payment Processing**: Pay multiple pending payments at once
2. **Payment Reports**: Generate payment summaries and reports
3. **Payment History**: Track payment method and transaction details
4. **Automated Payments**: Integration with payment gateways
5. **Payment Scheduling**: Schedule payments for specific dates
6. **Tax Calculations**: Include tax calculations in payment amounts
7. **Payment Export**: Export payment data for accounting systems

### Database Indexes

The system includes optimized indexes for:

- `technicianId` + `status` for technician payment queries
- `agencyId` + `status` for agency payment queries
- `jobCompletedAt` for date-based filtering
- `paymentNumber` for quick lookups

## Security Considerations

1. **Access Control**: Strict role-based access to payment data
2. **Data Validation**: All payment amounts and data are validated
3. **Audit Trail**: All payment changes are logged with timestamps
4. **Transaction Safety**: Payment creation uses database transactions
5. **Error Logging**: Comprehensive error logging for debugging
