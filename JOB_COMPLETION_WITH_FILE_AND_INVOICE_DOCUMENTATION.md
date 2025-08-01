# Job Completion with File Upload and Invoice Creation - API Documentation

## Overview

The enhanced Job Completion API now supports uploading report files (PDF) to Cloudinary and creating invoices during job completion. This provides a complete workflow for technicians to finish jobs with proper documentation and billing.

## New Features Added

### 1. Report File Upload
- **File Type**: PDF files only
- **Storage**: Cloudinary cloud storage
- **Organization**: Files stored in `job-reports` folder with job-specific naming

### 2. Invoice Creation
- **Automatic Creation**: Invoices can be created during job completion
- **Data Validation**: Comprehensive validation of invoice data
- **Agency Association**: Automatically associates invoice with the correct agency

### 3. Enhanced Job Model
Three new fields added to the Job schema:
- `reportFile`: URL to the uploaded PDF report
- `hasInvoice`: Boolean indicating if job has an associated invoice
- `invoice`: Reference to the created Invoice document

## API Endpoint

### Complete Job with File and Invoice

**PATCH** `/v1/jobs/{jobId}/complete`

#### Authentication
- **Required**: Yes
- **Type**: Bearer Token
- **User Types**: Technician, SuperUser

#### Content-Type
```
multipart/form-data
```

#### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reportFile` | File | No | PDF report file to upload |
| `hasInvoice` | String | Yes | "true" or "false" |
| `invoiceData` | String | Conditional | JSON string of invoice data (required if hasInvoice="true") |

#### Request Body Structure

```javascript
// Form Data
{
  reportFile: File, // PDF file (optional)
  hasInvoice: "true" | "false",
  invoiceData: JSON.stringify({
    description: "Service description",
    items: [
      {
        id: "1",
        name: "Service Item",
        quantity: 1,
        rate: 100.0,
        amount: 100.0
      }
    ],
    subtotal: 100.0,
    tax: 10.0,
    taxPercentage: 10,
    totalCost: 110.0,
    notes: "Additional notes"
  })
}
```

#### Invoice Data Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `description` | String | Yes | Invoice description (max 1000 chars) |
| `items` | Array | Yes | Array of invoice items |
| `subtotal` | Number | Yes | Sum of all items |
| `tax` | Number | No | Tax amount (default: 0) |
| `taxPercentage` | Number | No | Tax percentage |
| `totalCost` | Number | Yes | Total invoice amount |
| `notes` | String | No | Additional notes (max 2000 chars) |

#### Invoice Item Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | String | Yes | Unique item identifier |
| `name` | String | Yes | Item name (max 200 chars) |
| `quantity` | Number | Yes | Item quantity (> 0) |
| `rate` | Number | Yes | Item rate (>= 0) |
| `amount` | Number | Yes | Item total (quantity × rate) |

## Validation Rules

### File Upload Validation
- ✅ Only PDF files allowed
- ✅ Maximum file size: 10MB
- ✅ File must be valid PDF format

### Invoice Data Validation
- ✅ `description` is required and not empty
- ✅ At least one item is required
- ✅ All items must have valid name, quantity, and rate
- ✅ Quantity must be > 0
- ✅ Rate must be >= 0
- ✅ Amount should equal quantity × rate

### Business Rules
- ✅ Job must exist and be assigned to the technician
- ✅ Job status must be "Scheduled" or "In Progress"
- ✅ Job due date must be today or in the past
- ✅ Only one invoice per job allowed
- ✅ Agency must be associated with the job

## Response Format

### Success Response (200 OK)

```json
{
  "status": "success",
  "message": "Job completed successfully",
  "data": {
    "job": {
      "id": "507f1f77bcf86cd799439011",
      "job_id": "J-123456",
      "status": "Completed",
      "reportFile": "https://res.cloudinary.com/your-cloud/raw/upload/v123/job-reports/job-507f1f77bcf86cd799439011-1234567890.pdf",
      "hasInvoice": true,
      "invoice": {
        "id": "507f1f77bcf86cd799439012",
        "invoiceNumber": "INV-1733123456789-123",
        "description": "Gas safety inspection and certification",
        "totalCost": 264.0,
        "status": "Pending"
      },
      "completedAt": "2024-01-15T14:30:00.000Z",
      // ... other job fields
    },
    "technician": {
      "id": "507f1f77bcf86cd799439013",
      "fullName": "John Technician",
      "currentJobs": 2,
      "availabilityStatus": "Available"
    },
    "completionDetails": {
      "completedAt": "2024-01-15T14:30:00.000Z",
      "completedBy": {
        "userType": "Technician",
        "userId": "507f1f77bcf86cd799439013",
        "name": "John Technician"
      },
      "dueDate": "2024-01-15T00:00:00.000Z",
      "reportFile": "https://res.cloudinary.com/your-cloud/raw/upload/v123/job-reports/job-507f1f77bcf86cd799439011-1234567890.pdf",
      "invoiceCreated": true,
      "invoiceId": "507f1f77bcf86cd799439012"
    }
  }
}
```

## Error Responses

### 400 Bad Request - File Upload Error

```json
{
  "status": "error",
  "message": "Failed to upload report file",
  "details": "Invalid file type. Only PDF files are allowed."
}
```

### 400 Bad Request - Invalid Invoice Data

```json
{
  "status": "error",
  "message": "Invalid invoice data. Description and items are required."
}
```

### 400 Bad Request - No Agency Associated

```json
{
  "status": "error",
  "message": "Cannot create invoice: No agency associated with this job"
}
```

### 409 Conflict - Invoice Already Exists

```json
{
  "status": "error",
  "message": "Invoice already exists for this job",
  "details": {
    "existingInvoiceId": "507f1f77bcf86cd799439012",
    "existingInvoiceNumber": "INV-1733123456789-123"
  }
}
```

## Example Usage

### cURL Example - Complete Job with File and Invoice

```bash
curl -X PATCH \
  http://localhost:3000/v1/jobs/507f1f77bcf86cd799439011/complete \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
  -F 'reportFile=@/path/to/report.pdf' \
  -F 'hasInvoice=true' \
  -F 'invoiceData={
    "description": "Gas safety inspection and certification",
    "items": [
      {
        "id": "1",
        "name": "Gas Safety Inspection",
        "quantity": 1,
        "rate": 150.0,
        "amount": 150.0
      },
      {
        "id": "2",
        "name": "Safety Certificate",
        "quantity": 1,
        "rate": 50.0,
        "amount": 50.0
      }
    ],
    "subtotal": 200.0,
    "tax": 20.0,
    "totalCost": 220.0,
    "notes": "Standard gas safety inspection completed successfully."
  }'
```

### JavaScript Example

```javascript
const completeJobWithFileAndInvoice = async (jobId, technicianToken, reportFile, invoiceData) => {
  const formData = new FormData();
  
  // Add report file if provided
  if (reportFile) {
    formData.append('reportFile', reportFile);
  }
  
  // Add invoice data if provided
  if (invoiceData) {
    formData.append('hasInvoice', 'true');
    formData.append('invoiceData', JSON.stringify(invoiceData));
  } else {
    formData.append('hasInvoice', 'false');
  }
  
  const response = await fetch(`/v1/jobs/${jobId}/complete`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${technicianToken}`,
    },
    body: formData,
  });
  
  return await response.json();
};

// Usage
const invoiceData = {
  description: "Gas safety inspection and certification",
  items: [
    {
      id: "1",
      name: "Gas Safety Inspection",
      quantity: 1,
      rate: 150.0,
      amount: 150.0
    }
  ],
  subtotal: 150.0,
  tax: 15.0,
  totalCost: 165.0,
  notes: "Standard gas safety inspection completed successfully."
};

const result = await completeJobWithFileAndInvoice(
  "507f1f77bcf86cd799439011",
  "technician_jwt_token",
  reportFileBlob,
  invoiceData
);
```

## Business Logic

### What Happens During Job Completion

1. **File Upload Processing**:
   - PDF file is uploaded to Cloudinary
   - File is stored in `job-reports` folder
   - Unique filename generated: `job-{jobId}-{timestamp}.pdf`

2. **Invoice Creation** (if requested):
   - Invoice data is validated
   - Agency is determined from job owner or property
   - Invoice is created with unique invoice number
   - Invoice is linked to the job

3. **Job Updates**:
   - Status changed to "Completed"
   - `completedAt` timestamp set
   - `reportFile` URL saved
   - `hasInvoice` flag updated
   - `invoice` reference saved

4. **Technician Updates**:
   - Job count decreased
   - Availability status updated

5. **Notifications**:
   - Job completion notifications sent
   - Invoice creation notifications (if applicable)

### File Storage Structure

```
Cloudinary Organization:
├── job-reports/
│   ├── job-507f1f77bcf86cd799439011-1234567890.pdf
│   ├── job-507f1f77bcf86cd799439012-1234567891.pdf
│   └── ...
```

### Database Relationships

```
Job (1) ←→ (1) Invoice
Job (1) ←→ (1) ReportFile (URL)
Job (1) ←→ (1) Technician
Job (1) ←→ (1) Agency
```

## Security Considerations

1. **File Upload Security**:
   - File type validation (PDF only)
   - File size limits (10MB)
   - Secure Cloudinary storage
   - Unique file naming to prevent conflicts

2. **Data Validation**:
   - Comprehensive invoice data validation
   - Business rule enforcement
   - Transaction safety for all operations

3. **Access Control**:
   - Authentication required
   - Authorization (only assigned technicians)
   - Agency association validation

## Testing

A comprehensive test file is available at `src/examples/testJobCompletionWithFileAndInvoice.js` that tests:

1. ✅ Complete job with report file only
2. ✅ Complete job with invoice only
3. ✅ Complete job with both file and invoice
4. ✅ Complete job without file or invoice
5. ✅ File upload validation
6. ✅ Invoice data validation
7. ✅ Error handling scenarios

To run the tests:

```bash
# Run all tests
node src/examples/testJobCompletionWithFileAndInvoice.js

# Run specific test scenario
node src/examples/testJobCompletionWithFileAndInvoice.js 0
```

## Migration Notes

### For Existing Jobs
- Existing jobs will have `reportFile: null`
- Existing jobs will have `hasInvoice: false`
- Existing jobs will have `invoice: null`

### Backward Compatibility
- The API remains backward compatible
- All existing job completion functionality still works
- New fields are optional and have default values

## Related Endpoints

- `GET /v1/jobs/{id}` - Get job details (now includes report file and invoice info)
- `GET /v1/invoices/{id}` - Get invoice details
- `PATCH /v1/invoices/{id}/send` - Send invoice
- `GET /v1/jobs` - List jobs (now includes hasInvoice flag)

## Changelog

- **v2.0.0** - Enhanced job completion with file upload and invoice creation
  - Added PDF report file upload to Cloudinary
  - Added automatic invoice creation during job completion
  - Added three new fields to Job model: `reportFile`, `hasInvoice`, `invoice`
  - Enhanced validation and error handling
  - Added comprehensive test scenarios
  - Updated documentation and examples 