# Staff CRUD System Documentation

## Overview

This document provides comprehensive information about the Staff CRUD system implemented for the RentalEase CRM. The system allows both Super Users and Property Managers to manage their staff members with full CRUD operations, file uploads, and advanced search capabilities.

## Database Design

### Polymorphic Reference Pattern

The Staff system uses a **polymorphic reference pattern** to allow staff members to be owned by either Super Users or Property Managers. This design ensures:

- **Data Integrity**: Each staff member belongs to exactly one owner
- **Scalability**: Easy to add new owner types in the future
- **Flexibility**: Different owners can have different access levels and permissions
- **Efficient Queries**: Optimized indexes for fast data retrieval

### Staff Model Schema

```javascript
{
  // Basic Information
  fullName: String (required),
  tradeType: String (required, enum),
  phone: String (required),
  email: String (required, unique per owner),
  
  // Availability and Schedule
  availabilityStatus: String (enum: Available, Unavailable, Busy, On Leave),
  startDate: Date (required),
  
  // Service Regions
  serviceRegions: [String] (enum: North, South, East, West, Central),
  
  // Documents
  licensingDocuments: [DocumentSchema],
  insuranceDocuments: [DocumentSchema],
  
  // Polymorphic Owner Reference
  owner: {
    ownerType: String (enum: SuperUser, PropertyManager),
    ownerId: ObjectId (refPath: owner.ownerType)
  },
  
  // Status and Metadata
  status: String (enum: Active, Inactive, Suspended, Terminated),
  rating: Number (0-5),
  totalJobs: Number,
  completedJobs: Number,
  notes: String,
  hourlyRate: Number,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  lastActiveDate: Date
}
```

## API Endpoints

### Base URL: `/api/v1/staff`

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### 1. Create Staff Member

**POST** `/api/v1/staff`

Creates a new staff member with optional file uploads.

**Content-Type**: `multipart/form-data`

**Body Parameters**:
```javascript
{
  "fullName": "John Doe",
  "tradeType": "Plumber",
  "phone": "+1234567890",
  "email": "john.doe@example.com",
  "availabilityStatus": "Available",
  "startDate": "2024-01-15",
  "serviceRegions": ["North", "Central"],
  "notes": "Experienced plumber with 10 years experience",
  "hourlyRate": 75
}
```

**File Fields**:
- `licensingDocuments`: Array of licensing documents (max 3 files)
- `insuranceDocuments`: Array of insurance documents (max 3 files)

**Response**:
```javascript
{
  "status": "success",
  "message": "Staff member created successfully",
  "data": {
    "staff": {
      "id": "64abc123...",
      "fullName": "John Doe",
      "tradeType": "Plumber",
      // ... other fields
    }
  }
}
```

### 2. Get All Staff Members

**GET** `/api/v1/staff`

Retrieves all staff members for the authenticated user with pagination and filtering.

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `tradeType`: Filter by trade type
- `availabilityStatus`: Filter by availability
- `serviceRegion`: Filter by service region
- `status`: Filter by status
- `search`: Search by name, email, or phone
- `sortBy`: Sort field (default: createdAt)
- `sortOrder`: Sort order (asc/desc, default: desc)

**Example Request**:
```
GET /api/v1/staff?page=1&limit=10&tradeType=Plumber&availabilityStatus=Available&search=john
```

**Response**:
```javascript
{
  "status": "success",
  "message": "Staff members retrieved successfully",
  "data": {
    "staff": [
      {
        "id": "64abc123...",
        "fullName": "John Doe",
        "tradeType": "Plumber",
        // ... other fields
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 25,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### 3. Get Single Staff Member

**GET** `/api/v1/staff/:id`

Retrieves a specific staff member by ID.

**Response**:
```javascript
{
  "status": "success",
  "message": "Staff member retrieved successfully",
  "data": {
    "staff": {
      "id": "64abc123...",
      "fullName": "John Doe",
      "tradeType": "Plumber",
      // ... complete staff details
    }
  }
}
```

### 4. Update Staff Member

**PUT** `/api/v1/staff/:id`

Updates an existing staff member.

**Body Parameters**: Same as create, all fields optional

**Response**:
```javascript
{
  "status": "success",
  "message": "Staff member updated successfully",
  "data": {
    "staff": {
      // ... updated staff details
    }
  }
}
```

### 5. Delete Staff Member

**DELETE** `/api/v1/staff/:id`

Deletes a staff member permanently.

**Response**:
```javascript
{
  "status": "success",
  "message": "Staff member deleted successfully",
  "data": {
    "deletedStaff": {
      "id": "64abc123...",
      "fullName": "John Doe",
      "email": "john.doe@example.com"
    }
  }
}
```

## File Upload Endpoints

### 6. Upload Documents

**POST** `/api/v1/staff/:id/documents`

Uploads additional documents for an existing staff member.

**Content-Type**: `multipart/form-data`

**File Fields**:
- `licensingDocuments`: Array of licensing documents
- `insuranceDocuments`: Array of insurance documents

**Response**:
```javascript
{
  "status": "success",
  "message": "Documents uploaded successfully",
  "data": {
    "staff": {
      // ... updated staff details with new documents
    },
    "uploadedFiles": {
      "licensingDocuments": [
        {
          "filename": "license-1234567890.pdf",
          "originalName": "plumber-license.pdf",
          "mimetype": "application/pdf",
          "size": 1024000,
          "uploadDate": "2024-01-15T10:30:00Z"
        }
      ]
    }
  }
}
```

### 7. Delete Document

**DELETE** `/api/v1/staff/:staffId/documents/:documentId?documentType=licensing`

Deletes a specific document from a staff member's profile.

**Query Parameters**:
- `documentType`: Type of document ('licensing' or 'insurance')

**Response**:
```javascript
{
  "status": "success",
  "message": "Document deleted successfully",
  "data": {
    "deletedDocument": {
      "id": "64abc123...",
      "filename": "license-1234567890.pdf",
      "originalName": "plumber-license.pdf"
    }
  }
}
```

### 8. Download Document

**GET** `/api/v1/staff/:staffId/documents/:documentId/download?documentType=licensing`

Downloads a specific document from a staff member's profile.

**Query Parameters**:
- `documentType`: Type of document ('licensing' or 'insurance')

**Response**: File download with appropriate headers

## Advanced Features

### 9. Bulk Update Availability

**PATCH** `/api/v1/staff/bulk/availability`

Updates availability status for multiple staff members.

**Body Parameters**:
```javascript
{
  "staffIds": ["64abc123...", "64def456..."],
  "availabilityStatus": "Unavailable"
}
```

**Response**:
```javascript
{
  "status": "success",
  "message": "Updated 2 staff members",
  "data": {
    "modifiedCount": 2,
    "matchedCount": 2
  }
}
```

### 10. Staff Analytics

**GET** `/api/v1/staff/analytics/overview`

Provides comprehensive analytics about staff members.

**Response**:
```javascript
{
  "status": "success",
  "message": "Staff analytics retrieved successfully",
  "data": {
    "overview": {
      "totalStaff": 25,
      "activeStaff": 22,
      "availableStaff": 18,
      "inactiveStaff": 3,
      "busyStaff": 4
    },
    "breakdown": {
      "byTrade": [
        { "_id": "Plumber", "count": 8 },
        { "_id": "Electrician", "count": 6 },
        { "_id": "Painter", "count": 5 }
      ],
      "byRegion": [
        { "_id": "North", "count": 12 },
        { "_id": "Central", "count": 10 },
        { "_id": "South", "count": 8 }
      ],
      "byStatus": [
        { "_id": "Active", "count": 22 },
        { "_id": "Inactive", "count": 3 }
      ]
    }
  }
}
```

### 11. Advanced Search

**POST** `/api/v1/staff/search`

Advanced search with multiple filters.

**Body Parameters**:
```javascript
{
  "searchTerm": "john",
  "tradeTypes": ["Plumber", "Electrician"],
  "serviceRegions": ["North", "Central"],
  "availabilityStatuses": ["Available"],
  "minRating": 3,
  "maxHourlyRate": 100,
  "minHourlyRate": 50,
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  }
}
```

**Response**:
```javascript
{
  "status": "success",
  "message": "Search completed successfully",
  "data": {
    "staff": [
      // ... matching staff members
    ],
    "count": 5
  }
}
```

## Email Notifications

The system automatically sends email notifications for:

1. **Welcome Email**: When a new staff member is created
2. **Status Update Email**: When a staff member's status changes
3. **Document Reminder Email**: When documents need to be updated

### Email Templates

- **Staff Welcome**: Professional welcome email with next steps
- **Status Update**: Notification about status changes with reason
- **Document Reminder**: Reminder about missing or expired documents

## File Upload Configuration

### Supported File Types

- **Documents**: PDF, DOC, DOCX
- **Images**: JPG, JPEG, PNG

### File Size Limits

- **Maximum file size**: 10MB per file
- **Maximum files per upload**: 5 files
- **Maximum files per document type**: 3 files

### File Storage

Files are stored in the `uploads/staff-documents/` directory with unique filenames to prevent conflicts.

## Security Features

### Authentication & Authorization

- **JWT Token Required**: All endpoints require valid authentication
- **Owner Validation**: Users can only access their own staff members
- **Role-Based Access**: Different permissions for Super Users vs Property Managers

### Data Validation

- **Input Validation**: All inputs are validated for type and format
- **Email Uniqueness**: Email addresses are unique per owner
- **File Type Validation**: Only approved file types are accepted
- **Size Limits**: File upload size limits prevent abuse

## Error Handling

The API returns consistent error responses:

```javascript
{
  "status": "error",
  "message": "Detailed error message",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Error Codes

- **400**: Bad Request - Invalid input data
- **401**: Unauthorized - Invalid or missing token
- **403**: Forbidden - Access denied
- **404**: Not Found - Resource not found
- **500**: Internal Server Error - Server error

## Usage Examples

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

// Create a new staff member
const createStaff = async (token, staffData) => {
  const formData = new FormData();
  
  // Add text fields
  Object.keys(staffData).forEach(key => {
    if (key !== 'licensingDocuments' && key !== 'insuranceDocuments') {
      formData.append(key, staffData[key]);
    }
  });
  
  // Add files
  staffData.licensingDocuments?.forEach(file => {
    formData.append('licensingDocuments', file);
  });
  
  const response = await axios.post('/api/v1/staff', formData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data'
    }
  });
  
  return response.data;
};

// Get all staff with filtering
const getStaff = async (token, filters = {}) => {
  const params = new URLSearchParams(filters);
  
  const response = await axios.get(`/api/v1/staff?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return response.data;
};
```

### cURL Examples

```bash
# Create staff member
curl -X POST \
  http://localhost:3000/api/v1/staff \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "fullName=John Doe" \
  -F "tradeType=Plumber" \
  -F "phone=+1234567890" \
  -F "email=john.doe@example.com" \
  -F "startDate=2024-01-15" \
  -F "serviceRegions=North" \
  -F "serviceRegions=Central" \
  -F "licensingDocuments=@license.pdf" \
  -F "insuranceDocuments=@insurance.pdf"

# Get all staff
curl -X GET \
  "http://localhost:3000/api/v1/staff?page=1&limit=10&tradeType=Plumber" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Update staff member
curl -X PUT \
  http://localhost:3000/api/v1/staff/64abc123456 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "availabilityStatus": "Unavailable",
    "notes": "Updated availability status"
  }'
```

## Best Practices

### 1. Database Optimization

- **Use Indexes**: The system includes optimized indexes for common queries
- **Pagination**: Always use pagination for large datasets
- **Filtering**: Use filters to reduce data transfer and improve performance

### 2. File Management

- **Regular Cleanup**: Implement regular cleanup of unused files
- **Backup Strategy**: Backup uploaded documents regularly
- **File Validation**: Always validate file types and sizes on the frontend

### 3. Security

- **Input Validation**: Validate all inputs on both frontend and backend
- **Authentication**: Always verify JWT tokens and user permissions
- **File Security**: Scan uploaded files for malware when possible

### 4. Error Handling

- **Graceful Degradation**: Handle errors gracefully in the UI
- **Logging**: Log all errors for debugging and monitoring
- **User Feedback**: Provide clear error messages to users

## Troubleshooting

### Common Issues

1. **File Upload Fails**
   - Check file size limits
   - Verify file types are supported
   - Ensure multipart/form-data content type

2. **Authentication Errors**
   - Verify JWT token is valid and not expired
   - Check user permissions and access rights

3. **Search Not Working**
   - Ensure search terms are properly encoded
   - Check filter parameters are valid
   - Verify user has staff members to search

### Performance Optimization

- Use pagination for large datasets
- Implement caching for frequently accessed data
- Optimize database queries with proper indexes
- Use compression for file uploads

## Conclusion

This Staff CRUD system provides a comprehensive solution for managing staff members in the RentalEase CRM. The polymorphic design ensures flexibility and scalability, while the rich API provides all necessary functionality for a complete staff management system.

The system is designed to be secure, performant, and user-friendly, with extensive documentation and examples to help developers integrate it into their applications. 