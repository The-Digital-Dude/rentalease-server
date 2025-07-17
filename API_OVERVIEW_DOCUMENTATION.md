# RentalEase CRM - Complete API Documentation

## Overview

This document provides a comprehensive overview of all API endpoints available in the RentalEase CRM system. The API is built using Node.js, Express, and MongoDB, following RESTful principles and implementing JWT-based authentication.

## System Architecture

### User Types

1. **Super Users** - System administrators with full access
2. **Agencies** - Business users managing properties and staff
3. **Staff** - Workers managed by Super Users or Agencies
4. **Tenants** - Property occupants with limited access

### Database Models

- **SuperUser** - System administrators
- **Agency** - Property management companies
- **Staff** - Workers managed by Super Users or Agencies

### Authentication

- **JWT Tokens** with different expiration times
- **Role-based access control**
- **OTP-based password reset**

---

# API Endpoints Overview

## Base URL Structure

All API endpoints follow this pattern:

```
http://localhost:3000/api/v1/{module}/{resource}
```

## Authentication Required

Most endpoints require authentication via JWT token:

```
Authorization: Bearer <jwt-token>
```

---

# 1. Super User Authentication

**Base URL**: `/api/v1/auth`

| Method | Endpoint           | Description             | Auth Required |
| ------ | ------------------ | ----------------------- | ------------- |
| POST   | `/register`        | Register new Super User | ❌            |
| POST   | `/login`           | Login Super User        | ❌            |
| POST   | `/forgot-password` | Send password reset OTP | ❌            |
| POST   | `/reset-password`  | Reset password with OTP | ❌            |

### Key Features:

- ✅ Account registration and login
- ✅ Secure password hashing (bcrypt)
- ✅ OTP-based password reset (10-minute expiration)
- ✅ Email notifications for password reset
- ✅ Rate limiting on OTP attempts (max 5)

---

# 2. Agency Authentication & Management

**Base URL**: `/api/v1/agency/auth`

| Method | Endpoint           | Description       | Auth Required |
| ------ | ------------------ | ----------------- | ------------- |
| POST   | `/register`        | Create Agency     | 🔒 Super User |
| POST   | `/login`           | Login Agency      | ❌            |
| POST   | `/forgot-password` | Reset password    | ❌            |
| GET    | `/profile`         | Get own profile   | 🔒 Agency     |
| PATCH  | `/:id`             | Update Agency     | 🔒 Super User |
| GET    | `/all`             | Get all Agencies  | 🔒 Super User |
| GET    | `/:id`             | Get single Agency | 🔒 Super User |

### Key Features:

- ✅ Super User creates Agency accounts
- ✅ Secure JWT authentication
- ✅ Password reset flow

### Agency Fields:

| Field         | Type   | Description                |
| ------------- | ------ | -------------------------- |
| companyName   | String | Business name              |
| abn           | String | Australian Business Number |
| contactPerson | String | Primary contact name       |
| email         | String | Business email             |
| phone         | String | Contact number             |
| region        | String | Service area               |
| status        | String | Account status             |
| compliance    | String | Compliance level           |

---

# 3. Staff Management (CRUD System)

**Base URL**: `/api/v1/staff`

| Method | Endpoint | Description                     | Auth Required          |
| ------ | -------- | ------------------------------- | ---------------------- |
| POST   | `/`      | Create new staff member         | 🔒 Super User / Agency |
| GET    | `/`      | Get all staff (with pagination) | 🔒 Super User / Agency |
| GET    | `/:id`   | Get single staff member         | 🔒 Super User / Agency |
| PUT    | `/:id`   | Update staff member             | 🔒 Super User / Agency |
| DELETE | `/:id`   | Delete staff member             | 🔒 Super User / Agency |

## File Management

| Method | Endpoint                                   | Description       | Auth Required          |
| ------ | ------------------------------------------ | ----------------- | ---------------------- |
| POST   | `/:id/documents`                           | Upload documents  | 🔒 Super User / Agency |
| DELETE | `/:staffId/documents/:documentId`          | Delete document   | 🔒 Super User / Agency |
| GET    | `/:staffId/documents/:documentId/download` | Download document | 🔒 Super User / Agency |

## Advanced Operations

| Method | Endpoint              | Description              | Auth Required          |
| ------ | --------------------- | ------------------------ | ---------------------- |
| PATCH  | `/bulk/availability`  | Bulk update availability | 🔒 Super User / Agency |
| GET    | `/analytics/overview` | Get staff analytics      | 🔒 Super User / Agency |
| POST   | `/search`             | Advanced search          | 🔒 Super User / Agency |

### Key Features:

- ✅ **Polymorphic Database Design** - Staff can belong to Super Users or Agencies
- ✅ **Complete CRUD Operations** with validation
- ✅ **File Upload System** for licensing and insurance documents
- ✅ **Advanced Search & Filtering** with multiple criteria
- ✅ **Bulk Operations** for efficiency
- ✅ **Analytics Dashboard** with breakdowns
- ✅ **Email Notifications** (welcome, status updates, document reminders)
- ✅ **Pagination & Sorting** for large datasets

### Staff Fields:

```json
{
  "fullName": "Staff Member Name",
  "tradeType": "Trade/Profession",
  "phone": "Phone Number",
  "email": "Email Address",
  "availabilityStatus": "Available/Unavailable/Busy/On Leave",
  "startDate": "Start Date",
  "serviceRegions": ["North", "South", "East", "West", "Central"],
  "licensingDocuments": "Array of uploaded documents",
  "insuranceDocuments": "Array of uploaded documents",
  "status": "Active/Inactive/Suspended/Terminated",
  "rating": "0-5 rating",
  "hourlyRate": "Hourly rate"
}
```

### Polymorphic Owner Reference:

```json
{
  "owner": {
    "ownerType": "SuperUser | Agency",
    "ownerId": "ObjectId referencing the owner"
  }
}
```

---

# 4. System Utilities

## Health Check

| Method | Endpoint  | Description         | Auth Required |
| ------ | --------- | ------------------- | ------------- |
| GET    | `/health` | System health check | ❌            |

### Response:

```json
{
  "status": "ok",
  "message": "Server is running, With Full Energy 🔥",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

# Authentication & Authorization Matrix

## Token Types & Expiration

| User Type  | Token Expiration | Access Level         |
| ---------- | ---------------- | -------------------- |
| Super User | 1 day            | Full system access   |
| Agency     | 7 days           | Own data + own staff |

## Access Control Matrix

| Endpoint          | Super User       | Agency                    | Notes                                   |
| ----------------- | ---------------- | ------------------------- | --------------------------------------- |
| Super User Auth   | ✅               | ❌                        | Super User only                         |
| Agency Creation   | ✅               | ❌                        | Super User creates Agency accounts      |
| Agency Login      | ❌               | ✅                        | Agency only                             |
| Agency Management | ✅               | 🔍 (Own profile only)     | Super User manages all, Agency sees own |
| Staff Management  | ✅ (All staff)   | ✅ (Own staff only)       | Owner-based access control              |
| File Operations   | ✅ (All files)   | ✅ (Own staff files only) | File access follows staff ownership     |
| Analytics         | ✅ (System-wide) | ✅ (Own staff only)       | Scoped analytics                        |

Legend:

- ✅ Full access
- 🔍 Limited access (own data only)
- ❌ No access

---

# Data Flow & Relationships

## User Hierarchy

```
Super User (System Admin)
├── Can create/manage Agencies
├── Can manage all Staff members
└── Has full system access

Agency (Business User)
├── Created by Super User
├── Can manage own Staff members only
└── Limited to own data access
```

## Staff Ownership Model

```
Staff Member
├── owner.ownerType: "SuperUser" | "Agency"
├── owner.ownerId: ObjectId
└── Access controlled by ownership
```

## Database Relationships

```
SuperUser (1) -----> (*) Staff
Agency (1) -----> (*) Staff

Agency (*) <----- (1) SuperUser (creator)
```

---

# Request/Response Patterns

## Standard Response Format

### Success Response:

```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Response:

```json
{
  "status": "error",
  "message": "Detailed error message",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Pagination Format:

```json
{
  "status": "success",
  "data": {
    "items": [...],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "itemsPerPage": 10,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

# Security Features

## Authentication Security

- ✅ **JWT Tokens** with configurable expiration
- ✅ **Password Hashing** using bcrypt with salt
- ✅ **OTP System** for password reset (10-minute expiration)
- ✅ **Rate Limiting** on OTP attempts (max 5)
- ✅ **Account Status Validation** for Agencies

## Authorization Security

- ✅ **Role-based Access Control** (RBAC)
- ✅ **Owner-based Resource Access** (users can only access their own data)
- ✅ **Token Type Validation** (SuperUser vs Agency tokens)
- ✅ **Middleware Protection** on all protected routes

## Data Security

- ✅ **Input Validation** on all endpoints
- ✅ **Email Uniqueness** validation per owner type
- ✅ **File Type Validation** for uploads
- ✅ **File Size Limits** (10MB per file)
- ✅ **Secure File Storage** with unique filenames

## API Security

- ✅ **CORS Configuration**
- ✅ **Helmet.js** for security headers
- ✅ **Morgan Logging** for request monitoring
- ✅ **Express Rate Limiting** capability
- ✅ **Error Handling** without information leakage

---

# Email System

## Email Templates

1. **Super User Welcome** - Professional welcome for new admins
2. **Agency Welcome** - Business welcome with next steps
3. **Password Reset OTP** - Secure OTP delivery for both user types
4. **Staff Welcome** - Welcome email for new staff members
5. **Staff Status Update** - Notifications for status changes
6. **Staff Document Reminder** - Document update reminders

## Email Service Features

- ✅ **HTML Templates** with professional styling
- ✅ **Automatic Sending** via post-save middleware
- ✅ **Error Handling** with fallback logging
- ✅ **Template Variables** for personalization
- ✅ **Resend Integration** for reliable delivery

---

# File Upload System

## Supported File Types

- **Documents**: PDF, DOC, DOCX
- **Images**: JPG, JPEG, PNG

## File Organization

```
uploads/
└── staff-documents/
    ├── licensingDocuments-{timestamp}-{random}.pdf
    ├── insuranceDocuments-{timestamp}-{random}.pdf
    └── ...
```

## File Operations

- ✅ **Multi-file Upload** (licensing + insurance)
- ✅ **File Validation** (type, size, count)
- ✅ **Unique Filenames** to prevent conflicts
- ✅ **Secure Download** with access control
- ✅ **File Deletion** with cleanup
- ✅ **Metadata Storage** in database

---

# Performance Features

## Database Optimization

- ✅ **Strategic Indexes** on frequently queried fields
- ✅ **Compound Indexes** for complex queries
- ✅ **Query Optimization** with lean queries
- ✅ **Pagination** to limit data transfer

## API Performance

- ✅ **Efficient Filtering** with MongoDB operators
- ✅ **Bulk Operations** for multiple updates
- ✅ **Selective Field Return** to reduce payload
- ✅ **Caching Headers** for static content

## Search Performance

- ✅ **Indexed Search Fields**
- ✅ **Regex Optimization** for text search
- ✅ **Filter Combination** for precise results
- ✅ **Result Limiting** (max 50 for advanced search)

---

# Development & Testing

## Environment Setup

```bash
# Install dependencies
pnpm install

# Environment variables required
JWT_SECRET=your-secure-jwt-secret
MONGODB_URI=your-mongodb-connection-string
RESEND_API_KEY=your-resend-api-key

# Start development server
pnpm run dev
```

## Required Dependencies

```json
{
  "bcryptjs": "Password hashing",
  "cors": "Cross-origin requests",
  "express": "Web framework",
  "helmet": "Security headers",
  "jsonwebtoken": "JWT tokens",
  "mongoose": "MongoDB ODM",
  "morgan": "Request logging",
  "multer": "File uploads",
  "resend": "Email service"
}
```

## Testing Recommendations

1. **Unit Tests** for individual functions
2. **Integration Tests** for API endpoints
3. **Authentication Tests** for security
4. **File Upload Tests** for edge cases
5. **Email Tests** with mock services

---

# Deployment Considerations

## Production Requirements

- ✅ **HTTPS Only** for secure communication
- ✅ **Environment Variables** for sensitive config
- ✅ **File Storage** consider cloud storage for scalability
- ✅ **Database Indexes** ensure proper indexing
- ✅ **Rate Limiting** implement API rate limits
- ✅ **Logging** comprehensive request/error logging
- ✅ **Monitoring** API performance monitoring

## Security Hardening

- ✅ **JWT Secret Rotation** regular secret updates
- ✅ **CORS Configuration** restrict origins in production
- ✅ **Input Sanitization** additional validation layers
- ✅ **File Scanning** malware scanning for uploads
- ✅ **Access Logging** detailed security logs

---

# API Versioning & Future Considerations

## Current Version: v1

All endpoints are currently under `/api/v1/`

## Future Enhancements

- **v2 Considerations**:
  - GraphQL endpoint for complex queries
  - WebSocket support for real-time updates
  - Advanced analytics and reporting
  - Multi-tenant architecture
  - Enhanced file management with cloud storage
  - Advanced search with Elasticsearch
  - Audit logging for all operations
  - Advanced role management system

## Backward Compatibility

- ✅ **Version Path Prefix** allows multiple versions
- ✅ **Stable API Contract** minimizes breaking changes
- ✅ **Deprecation Strategy** for future changes

---

# Troubleshooting Guide

## Common Issues & Solutions

### Authentication Issues

- **Token Expired**: Check token expiration and re-authenticate
- **Invalid Credentials**: Verify email/password combination
- **Account Inactive**: Contact admin to activate Agency account

### File Upload Issues

- **File Too Large**: Check 10MB file size limit
- **Invalid File Type**: Ensure PDF, DOC, DOCX, or image files
- **Upload Failed**: Check disk space and file permissions

### Permission Issues

- **Access Denied**: Verify user type and ownership permissions
- **Resource Not Found**: Check if resource belongs to authenticated user

### Performance Issues

- **Slow Queries**: Review pagination and filtering parameters
- **Large Response**: Use pagination and limit fields returned

---

# Support & Maintenance

## Logging

All operations are logged with:

- ✅ **Request Details** (method, path, user)
- ✅ **Response Status** (success/error)
- ✅ **Timestamp** for tracking
- ✅ **Error Stack Traces** for debugging
- ✅ **Security Events** (login attempts, access violations)

## Monitoring Recommendations

- **API Response Times**
- **Error Rates**
- **Authentication Failures**
- **File Upload Success/Failure**
- **Database Query Performance**
- **Email Delivery Status**

---

# Conclusion

The RentalEase CRM API provides a comprehensive, secure, and scalable foundation for managing users and staff in a property management context. With its thoughtful design, robust security features, and comprehensive documentation, it serves as an excellent foundation for building modern property management applications.

Key strengths:

- 🚀 **Polymorphic Design** for flexible staff ownership
- 🔒 **Comprehensive Security** with JWT and RBAC
- 📁 **Complete File Management** with secure uploads
- 📧 **Professional Email System** with templates
- 📊 **Advanced Search & Analytics** for business insights
- 📚 **Thorough Documentation** for easy integration
- 🔧 **Production Ready** with proper error handling and validation
