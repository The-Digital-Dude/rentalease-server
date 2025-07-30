# Technician System Documentation

## Overview

The Technician system provides a complete user management solution for technicians in the RentalEase CRM. Technicians can register, login, manage their profiles, and handle job assignments. They are managed by either Agencies or Super Users.

## Features

- **Authentication System**: Complete login/register functionality
- **Profile Management**: Update personal and professional information
- **Job Management**: Track assigned jobs and availability
- **Document Management**: Store licenses and certifications
- **Rating System**: Track performance and ratings
- **Availability Tracking**: Monitor job capacity and status
- **Password Reset**: Secure password recovery via OTP

## Database Schema

### Technician Model

```javascript
{
  // Personal Information
  firstName: String (required),
  lastName: String (required),
  fullName: String (auto-generated),

  // Contact Information
  email: String (required, unique),
  phone: String (required),

  // Professional Information
  tradeType: String (required, enum),
  licenseNumber: String (optional),
  licenseExpiry: Date (optional),

  // Work Information
  experience: Number (years),
  hourlyRate: Number,
  availabilityStatus: String (enum),
  currentJobs: Number,
  maxJobs: Number (default: 4),

  // Job Management
  assignedJobs: [{
    jobId: ObjectId (ref: Job),
    assignedDate: Date,
    status: String (enum)
  }],

  // Performance Metrics
  completedJobs: Number,
  averageRating: Number (0-5),
  totalRatings: Number,

  // Account Status
  status: String (enum),

  // Authentication
  password: String (hashed),

  // Owner Information
  owner: {
    ownerType: String (enum),
    ownerId: ObjectId
  },

  // Address Information
  address: {
    street: String,
    suburb: String,
    state: String,
    postcode: String,
    fullAddress: String (auto-generated)
  },

  // Documents and Certifications
  documents: [{
    type: String (enum),
    name: String,
    fileUrl: String,
    uploadDate: Date,
    expiryDate: Date,
    isVerified: Boolean
  }],

  // Password Reset
  resetPasswordOTP: String,
  resetPasswordOTPExpires: Date,
  resetPasswordOTPAttempts: Number,

  // Timestamps
  createdAt: Date,
  lastUpdated: Date,
  lastLogin: Date,
  lastActive: Date
}
```

## Trade Types

- Gas
- Electrical
- Plumbing
- HVAC
- General Maintenance
- Pool Safety
- Smoke Alarms
- Multi-Trade

## Availability Status

- Available
- Busy
- Unavailable
- On Leave

## Account Status

- Active
- Inactive
- Suspended
- Pending

## API Endpoints

### Base URL

```
http://localhost:4000/api/v1/technician/auth
```

### Authentication Endpoints

#### 1. Register Technician

```
POST /api/v1/technician/auth/register
```

**Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "phone": "+61412345678",
  "password": "password123",
  "tradeType": "Gas",
  "licenseNumber": "GAS123456",
  "licenseExpiry": "2024-12-31",
  "experience": 5,
  "hourlyRate": 75,
  "address": {
    "street": "123 Trade Street",
    "suburb": "Sydney",
    "state": "NSW",
    "postcode": "2000"
  },
  "ownerType": "Agency",
  "ownerId": "agency_id_here"
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Technician account created successfully",
  "data": {
    "technician": {
      "id": "technician_id",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+61412345678",
      "tradeType": "Gas",
      "status": "Pending",
      "owner": {
        "ownerType": "Agency",
        "ownerId": "agency_id"
      }
    },
    "token": "jwt_token_here"
  }
}
```

#### 2. Login Technician

```
POST /api/v1/technician/auth/login
```

**Body:**

```json
{
  "email": "john.doe@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "technician": {
      "id": "technician_id",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+61412345678",
      "tradeType": "Gas",
      "status": "Active",
      "availabilityStatus": "Available",
      "currentJobs": 0,
      "maxJobs": 4,
      "owner": {
        "ownerType": "Agency",
        "ownerId": "agency_id"
      }
    },
    "token": "jwt_token_here"
  }
}
```

#### 3. Get Profile

```
GET /api/v1/technician/auth/profile
```

**Headers:**

```
Authorization: Bearer jwt_token_here
```

**Response:**

```json
{
  "status": "success",
  "message": "Profile retrieved successfully",
  "data": {
    "technician": {
      "id": "technician_id",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "email": "john.doe@example.com",
      "phone": "+61412345678",
      "tradeType": "Gas",
      "licenseNumber": "GAS123456",
      "licenseExpiry": "2024-12-31T00:00:00.000Z",
      "experience": 5,
      "hourlyRate": 75,
      "availabilityStatus": "Available",
      "currentJobs": 0,
      "maxJobs": 4,
      "completedJobs": 0,
      "averageRating": 0,
      "totalRatings": 0,
      "status": "Active",
      "address": {
        "street": "123 Trade Street",
        "suburb": "Sydney",
        "state": "NSW",
        "postcode": "2000",
        "fullAddress": "123 Trade Street, Sydney, NSW, 2000"
      },
      "documents": [],
      "owner": {
        "ownerType": "Agency",
        "ownerId": "agency_id"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastLogin": "2024-01-01T00:00:00.000Z",
      "lastActive": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### 4. Update Profile

```
PUT /api/v1/technician/auth/profile
```

**Headers:**

```
Authorization: Bearer jwt_token_here
```

**Body:**

```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+61412345679",
  "tradeType": "Electrical",
  "licenseNumber": "ELEC123456",
  "licenseExpiry": "2024-12-31",
  "experience": 6,
  "hourlyRate": 80,
  "address": {
    "street": "456 Trade Street",
    "suburb": "Melbourne",
    "state": "VIC",
    "postcode": "3000"
  }
}
```

#### 5. Change Password

```
PUT /api/v1/technician/auth/change-password
```

**Headers:**

```
Authorization: Bearer jwt_token_here
```

**Body:**

```json
{
  "currentPassword": "password123",
  "newPassword": "newpassword123"
}
```

#### 6. Forgot Password

```
POST /api/v1/technician/auth/forgot-password
```

**Body:**

```json
{
  "email": "john.doe@example.com"
}
```

#### 7. Reset Password

```
POST /api/v1/technician/auth/reset-password
```

**Body:**

```json
{
  "email": "john.doe@example.com",
  "otp": "123456",
  "newPassword": "newpassword123"
}
```

#### 8. Get Jobs

```
GET /api/v1/technician/auth/jobs
```

**Headers:**

```
Authorization: Bearer jwt_token_here
```

**Response:**

```json
{
  "status": "success",
  "message": "Jobs retrieved successfully",
  "data": {
    "jobSummary": {
      "totalJobs": 5,
      "activeJobs": 2,
      "completedJobs": 3,
      "currentJobs": 2,
      "maxJobs": 4,
      "availabilityStatus": "Available"
    },
    "assignedJobs": [
      {
        "jobId": {
          "_id": "job_id",
          "job_id": "J-123456",
          "jobType": "Gas",
          "dueDate": "2024-01-15T00:00:00.000Z",
          "status": "Pending",
          "property": {
            "_id": "property_id",
            "address": {
              "fullAddress": "123 Main Street, Sydney, NSW 2000"
            }
          }
        },
        "assignedDate": "2024-01-01T00:00:00.000Z",
        "status": "Active"
      }
    ]
  }
}
```

## Model Methods

### Authentication Methods

```javascript
// Compare password
const isValid = await technician.comparePassword("password123");

// Update last login
await technician.updateLastLogin();
```

### Availability Methods

```javascript
// Check if account is active
const isActive = technician.isActive();

// Check if available for new jobs
const isAvailable = technician.isAvailableForJobs();

// Update availability status
await technician.updateAvailabilityStatus();
```

### Job Management Methods

```javascript
// Assign a job
await technician.assignJob(jobId);

// Complete a job
await technician.completeJob(jobId);

// Get active jobs
const activeJobs = technician.getActiveJobs();

// Get job summary
const summary = technician.getJobSummary();
```

### Rating Methods

```javascript
// Update rating
await technician.updateRating(4.5);
```

### Utility Methods

```javascript
// Get display name
const displayName = technician.getDisplayName();
```

## Pre-save Middleware

### Password Hashing

Automatically hashes passwords using bcrypt before saving.

### Full Name Generation

Automatically generates `fullName` from `firstName` and `lastName`.

### Address Formatting

Automatically generates `fullAddress` from address components.

### Welcome Email

Sends welcome email to new technicians (if email service is configured).

## Indexes

The model includes several indexes for optimal performance:

- `email: 1` - For email lookups
- `"owner.ownerType": 1, "owner.ownerId": 1` - For owner queries
- `tradeType: 1, status: 1` - For filtering by trade and status
- `availabilityStatus: 1, currentJobs: 1` - For availability queries
- `status: 1, availabilityStatus: 1` - For status-based queries

## Authentication Flow

### Registration Flow

1. Validate required fields
2. Check for existing technician with same email
3. Create technician with hashed password
4. Send welcome email
5. Return JWT token

### Login Flow

1. Validate email and password
2. Find technician and verify password
3. Check account status
4. Update last login
5. Return JWT token with technician info

### Password Reset Flow

1. Generate OTP and set expiry
2. Send OTP via email
3. Verify OTP and update password
4. Clear OTP fields

## Job Assignment Flow

### Assigning Jobs

1. Check if technician is available
2. Add job to assignedJobs array
3. Increment currentJobs count
4. Update availability status
5. Save technician

### Completing Jobs

1. Find active job in assignedJobs
2. Mark job as completed
3. Decrement currentJobs count
4. Increment completedJobs count
5. Update availability status
6. Save technician

## Error Handling

### Validation Errors

- Field validation with custom messages
- Enum validation for trade types and statuses
- Email format validation
- Phone number format validation

### Business Logic Errors

- Duplicate email prevention
- Job assignment when unavailable
- Job completion for non-existent jobs
- Invalid rating values

### Authentication Errors

- Invalid credentials
- Inactive account
- Expired tokens
- Missing authorization headers

## Testing

### Run Test Script

```bash
node src/examples/testTechnicianSystem.js
```

This will test:

1. Technician creation
2. Password comparison
3. Availability methods
4. Job assignment/completion
5. Rating system
6. Document management
7. Address formatting
8. All model methods

## Integration with Existing Systems

### Notification System

Technicians can receive notifications for:

- Job assignments
- Job updates
- System alerts

### Job System

Technicians are linked to jobs through:

- `assignedTechnician` field in Job model
- `assignedJobs` array in Technician model

### Agency/SuperUser Management

Technicians are owned by:

- Agencies (for agency-managed technicians)
- Super Users (for system-managed technicians)

## Security Features

### Password Security

- Bcrypt hashing with salt rounds
- Minimum 8 character requirement
- Password reset via OTP

### Token Security

- JWT tokens with 7-day expiry
- User type validation
- Account status verification

### Data Protection

- Password field excluded from queries by default
- Sensitive data validation
- Input sanitization

## Future Enhancements

### Planned Features

- Document upload and verification
- Advanced availability scheduling
- Performance analytics
- Mobile app integration
- Push notifications
- GPS tracking for job sites

### API Extensions

- Bulk technician operations
- Advanced filtering and search
- Export functionality
- Integration with external systems

## Troubleshooting

### Common Issues

1. **Registration Fails**

   - Check required fields
   - Verify email format
   - Ensure unique email

2. **Login Fails**

   - Verify email and password
   - Check account status
   - Ensure proper token format

3. **Job Assignment Fails**

   - Check technician availability
   - Verify current job count
   - Ensure valid job ID

4. **Profile Update Fails**
   - Validate field formats
   - Check field constraints
   - Verify authentication

### Debug Commands

```javascript
// Check technician status
const technician = await Technician.findById(id);
console.log("Status:", technician.status);
console.log("Availability:", technician.availabilityStatus);

// Check job assignments
const activeJobs = technician.getActiveJobs();
console.log("Active jobs:", activeJobs.length);

// Verify password
const isValid = await technician.comparePassword("password");
console.log("Password valid:", isValid);
```

This comprehensive technician system provides a complete solution for managing technicians in the RentalEase CRM with full authentication, job management, and profile capabilities.
