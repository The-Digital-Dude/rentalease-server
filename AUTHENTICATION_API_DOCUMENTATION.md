# Authentication API Documentation

## Overview

This document provides comprehensive information about the Authentication API endpoints for the RentalEase CRM system. The API supports two types of users:

1. **Super Users** - System administrators with full access
2. **Property Managers** - Business users managing properties

## Base URLs

- **Super User Authentication**: `/api/v1/auth`
- **Property Manager Authentication**: `/api/v1/property-manager/auth`

## Authentication Flow

The system uses **JWT (JSON Web Tokens)** for authentication. Tokens are issued upon successful login and must be included in the Authorization header for protected endpoints.

### Token Format
```
Authorization: Bearer <jwt-token>
```

### Token Expiration
- **Super User tokens**: 1 day
- **Property Manager tokens**: 7 days

---

# Super User Authentication

## Base URL: `/api/v1/auth`

### 1. Register Super User

**POST** `/api/v1/auth/register`

Creates a new Super User account.

**Request Body**:
```json
{
  "name": "John Admin",
  "email": "admin@example.com",
  "password": "securePassword123"
}
```

**Validation Rules**:
- `name`: Required, minimum 2 characters
- `email`: Required, valid email format, unique
- `password`: Required, minimum 8 characters

**Response (201 Created)**:
```json
{
  "status": "success",
  "data": {
    "superUser": {
      "id": "64abc123456789",
      "name": "John Admin",
      "email": "admin@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses**:
```json
// User already exists (400)
{
  "status": "error",
  "message": "Super user already exists"
}

// Validation error (500)
{
  "status": "error",
  "message": "Validation error message"
}
```

---

### 2. Login Super User

**POST** `/api/v1/auth/login`

Authenticates a Super User and returns a JWT token.

**Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "superUser": {
      "id": "64abc123456789",
      "name": "John Admin",
      "email": "admin@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses**:
```json
// Invalid credentials (401)
{
  "status": "error",
  "message": "Invalid credentials"
}

// Missing fields (400)
{
  "status": "error",
  "message": "Email and password are required"
}
```

---

### 3. Forgot Password (Super User)

**POST** `/api/v1/auth/forgot-password`

Initiates password reset process by sending OTP to user's email.

**Request Body**:
```json
{
  "email": "admin@example.com"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Password reset OTP has been sent to your email address",
  "data": {
    "email": "admin@example.com",
    "expiresIn": "10 minutes"
  }
}
```

**Error Responses**:
```json
// User not found (404)
{
  "status": "error",
  "message": "User not found with this email address"
}

// Email service error (500)
{
  "status": "error",
  "message": "Failed to send reset email. Please try again."
}
```

**Notes**:
- OTP is valid for 10 minutes
- Maximum 5 OTP attempts allowed
- OTP is 6 digits long

---

### 4. Reset Password (Super User)

**POST** `/api/v1/auth/reset-password`

Resets user password using OTP verification.

**Request Body**:
```json
{
  "email": "admin@example.com",
  "otp": "123456",
  "newPassword": "newSecurePassword123"
}
```

**Validation Rules**:
- `email`: Required
- `otp`: Required, 6 digits
- `newPassword`: Required, minimum 8 characters

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Password has been reset successfully. You can now login with your new password.",
  "data": {
    "email": "admin@example.com",
    "resetAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses**:
```json
// Invalid OTP (400)
{
  "status": "error",
  "message": "Invalid OTP. 4 attempts remaining."
}

// Expired OTP (400)
{
  "status": "error",
  "message": "OTP has expired. Please request a new one."
}

// Too many attempts (429)
{
  "status": "error",
  "message": "Too many invalid attempts. Please request a new OTP."
}

// No reset request (400)
{
  "status": "error",
  "message": "No password reset request found. Please request a new OTP."
}
```

---

# Property Manager Authentication

## Base URL: `/api/v1/property-manager/auth`

### 1. Register Property Manager

**POST** `/api/v1/property-manager/auth/register`

**Authentication Required**: Super User only

Creates a new Property Manager account. Only Super Users can create Property Manager accounts.

**Headers**:
```
Authorization: Bearer <super-user-token>
```

**Request Body**:
```json
{
  "companyName": "ABC Property Management",
  "abn": "12345678901",
  "contactPerson": "Jane Smith",
  "email": "jane@abcproperties.com",
  "phone": "+61412345678",
  "region": "Sydney Metro",
  "compliance": "Standard Package",
  "password": "securePassword123"
}
```

**Validation Rules**:
- `companyName`: Required, minimum 2 characters
- `abn`: Required, exactly 11 digits, unique
- `contactPerson`: Required, minimum 2 characters
- `email`: Required, valid email format, unique
- `phone`: Required, valid phone format
- `region`: Required, must be from predefined list
- `compliance`: Required, must be from predefined list
- `password`: Required, minimum 8 characters

**Valid Regions**:
- Sydney Metro, Melbourne Metro, Brisbane Metro, Perth Metro
- Adelaide Metro, Darwin Metro, Hobart Metro, Canberra Metro
- Regional NSW, Regional VIC, Regional QLD, Regional WA
- Regional SA, Regional NT, Regional TAS

**Valid Compliance Packages**:
- Basic Package, Standard Package, Premium Package, Full Package

**Response (201 Created)**:
```json
{
  "status": "success",
  "message": "Property manager registered successfully. Account is pending approval.",
  "data": {
    "propertyManager": {
      "id": "64abc123456789",
      "companyName": "ABC Property Management",
      "contactPerson": "Jane Smith",
      "email": "jane@abcproperties.com",
      "phone": "+61412345678",
      "region": "Sydney Metro",
      "compliance": "Standard Package",
      "status": "Pending",
      "abn": "12345678901",
      "outstandingAmount": 0,
      "totalProperties": 0,
      "joinedDate": "2024-01-15T10:30:00.000Z"
    },
    "createdBy": "John Admin"
  }
}
```

**Error Responses**:
```json
// Missing fields (400)
{
  "status": "error",
  "message": "All fields are required"
}

// Duplicate email (400)
{
  "status": "error",
  "message": "Property manager with this email already exists"
}

// Duplicate ABN (400)
{
  "status": "error",
  "message": "Property manager with this ABN already exists"
}

// Unauthorized (403)
{
  "status": "error",
  "message": "Access denied. Super user privileges required."
}
```

**Notes**:
- Account is created with "Pending" status
- Welcome email is automatically sent to the Property Manager
- Only Super Users can create Property Manager accounts

---

### 2. Login Property Manager

**POST** `/api/v1/property-manager/auth/login`

Authenticates a Property Manager and returns a JWT token.

**Request Body**:
```json
{
  "email": "jane@abcproperties.com",
  "password": "securePassword123"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "propertyManager": {
      "id": "64abc123456789",
      "companyName": "ABC Property Management",
      "contactPerson": "Jane Smith",
      "email": "jane@abcproperties.com",
      "phone": "+61412345678",
      "region": "Sydney Metro",
      "compliance": "Standard Package",
      "status": "Active",
      "abn": "12345678901",
      "outstandingAmount": 0,
      "totalProperties": 5,
      "lastLogin": "2024-01-15T10:30:00.000Z",
      "joinedDate": "2024-01-10T08:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses**:
```json
// Invalid credentials (401)
{
  "status": "error",
  "message": "Invalid credentials"
}

// Account not active (401)
{
  "status": "error",
  "message": "Account is pending. Please contact support."
}

// Missing fields (400)
{
  "status": "error",
  "message": "Email and password are required"
}
```

**Notes**:
- Account must be "Active" status to login
- Last login timestamp is updated automatically
- Token expires in 7 days

---

### 3. Forgot Password (Property Manager)

**POST** `/api/v1/property-manager/auth/forgot-password`

Initiates password reset process for Property Manager.

**Request Body**:
```json
{
  "email": "jane@abcproperties.com"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Password reset OTP has been sent to your email address",
  "data": {
    "email": "jane@abcproperties.com",
    "expiresIn": "10 minutes"
  }
}
```

**Error Responses**:
```json
// Property manager not found (404)
{
  "status": "error",
  "message": "Property manager not found with this email address"
}

// Account not active (400)
{
  "status": "error",
  "message": "Account is pending. Please contact support."
}

// Email service error (500)
{
  "status": "error",
  "message": "Failed to send reset email. Please try again."
}
```

---

### 4. Reset Password (Property Manager)

**POST** `/api/v1/property-manager/auth/reset-password`

Resets Property Manager password using OTP verification.

**Request Body**:
```json
{
  "email": "jane@abcproperties.com",
  "otp": "123456",
  "newPassword": "newSecurePassword123"
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Password has been reset successfully. You can now login with your new password.",
  "data": {
    "email": "jane@abcproperties.com",
    "resetAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses**: Same as Super User reset password

---

### 5. Get Property Manager Profile

**GET** `/api/v1/property-manager/auth/profile`

**Authentication Required**: Property Manager

Retrieves the authenticated Property Manager's profile information.

**Headers**:
```
Authorization: Bearer <property-manager-token>
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "propertyManager": {
      "id": "64abc123456789",
      "companyName": "ABC Property Management",
      "contactPerson": "Jane Smith",
      "email": "jane@abcproperties.com",
      "phone": "+61412345678",
      "region": "Sydney Metro",
      "compliance": "Standard Package",
      "status": "Active",
      "abn": "12345678901",
      "outstandingAmount": 0,
      "totalProperties": 5,
      "lastLogin": "2024-01-15T10:30:00.000Z",
      "joinedDate": "2024-01-10T08:00:00.000Z"
    }
  }
}
```

**Error Responses**:
```json
// Unauthorized (401)
{
  "status": "error",
  "message": "Access token is required"
}

// Property manager not found (404)
{
  "status": "error",
  "message": "Property manager not found"
}
```

---

# Property Manager Management (Super User Only)

## Base URL: `/api/v1/property-manager/auth`

### 6. Update Property Manager

**PATCH** `/api/v1/property-manager/auth/:id`

**Authentication Required**: Super User only

Updates an existing Property Manager's information.

**Headers**:
```
Authorization: Bearer <super-user-token>
```

**Request Body** (all fields optional):
```json
{
  "companyName": "Updated Property Management",
  "abn": "98765432109",
  "contactPerson": "Jane Updated",
  "email": "jane.updated@abcproperties.com",
  "phone": "+61498765432",
  "region": "Melbourne Metro",
  "compliance": "Premium Package",
  "status": "Active",
  "outstandingAmount": 1500.00
}
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "message": "Property manager updated successfully",
  "data": {
    "propertyManager": {
      // ... updated property manager details
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    },
    "updatedBy": "John Admin"
  }
}
```

**Validation Rules**:
- All fields are optional (partial updates allowed)
- Email and ABN must be unique if provided
- Same validation rules as registration apply

**Error Responses**:
```json
// Property manager not found (404)
{
  "status": "error",
  "message": "Property manager not found"
}

// Duplicate email (400)
{
  "status": "error",
  "message": "Email is already used by another property manager"
}

// Unauthorized (403)
{
  "status": "error",
  "message": "Access denied. Super user privileges required."
}
```

---

### 7. Get All Property Managers

**GET** `/api/v1/property-manager/auth/all`

**Authentication Required**: Super User only

Retrieves all Property Managers with optional filtering and pagination.

**Headers**:
```
Authorization: Bearer <super-user-token>
```

**Query Parameters**:
- `status`: Filter by status (Active, Inactive, Suspended, Pending)
- `region`: Filter by region
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Example Request**:
```
GET /api/v1/property-manager/auth/all?status=Active&region=Sydney Metro&page=1&limit=5
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "propertyManagers": [
      {
        "id": "64abc123456789",
        "companyName": "ABC Property Management",
        "contactPerson": "Jane Smith",
        "email": "jane@abcproperties.com",
        "phone": "+61412345678",
        "region": "Sydney Metro",
        "compliance": "Standard Package",
        "status": "Active",
        "abn": "12345678901",
        "outstandingAmount": 0,
        "totalProperties": 5,
        "lastLogin": "2024-01-15T10:30:00.000Z",
        "joinedDate": "2024-01-10T08:00:00.000Z",
        "createdAt": "2024-01-10T08:00:00.000Z"
      }
      // ... more property managers
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalCount": 25,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 8. Get Single Property Manager

**GET** `/api/v1/property-manager/auth/:id`

**Authentication Required**: Super User only

Retrieves detailed information for a specific Property Manager.

**Headers**:
```
Authorization: Bearer <super-user-token>
```

**Response (200 OK)**:
```json
{
  "status": "success",
  "data": {
    "propertyManager": {
      "id": "64abc123456789",
      "companyName": "ABC Property Management",
      "contactPerson": "Jane Smith",
      "email": "jane@abcproperties.com",
      "phone": "+61412345678",
      "region": "Sydney Metro",
      "compliance": "Standard Package",
      "status": "Active",
      "abn": "12345678901",
      "outstandingAmount": 0,
      "totalProperties": 5,
      "lastLogin": "2024-01-15T10:30:00.000Z",
      "joinedDate": "2024-01-10T08:00:00.000Z",
      "createdAt": "2024-01-10T08:00:00.000Z",
      "lastUpdated": "2024-01-12T14:20:00.000Z"
    }
  }
}
```

**Error Responses**:
```json
// Property manager not found (404)
{
  "status": "error",
  "message": "Property manager not found"
}
```

---

# Security Features

## Password Requirements

- **Minimum length**: 8 characters
- **Automatic hashing**: bcrypt with salt rounds
- **No plaintext storage**: Passwords are never stored in plain text

## OTP Security

- **6-digit numeric codes**
- **10-minute expiration**
- **Maximum 5 attempts** before lockout
- **Secure hashing**: OTPs are hashed before storage
- **Automatic cleanup**: Expired OTPs are automatically cleared

## JWT Token Security

- **Signed tokens**: Using HS256 algorithm
- **Type identification**: Tokens include user type (superUser/propertyManager)
- **Expiration handling**: Different expiration times for different user types
- **Secure storage**: Store tokens securely on client side

## Rate Limiting

- **Failed login attempts**: Account lockout after multiple failed attempts
- **OTP attempts**: Limited to 5 attempts per request
- **API rate limiting**: Can be implemented using express-rate-limit

---

# Error Handling

## Standard Error Response Format

```json
{
  "status": "error",
  "message": "Detailed error message",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## HTTP Status Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors, missing fields)
- **401**: Unauthorized (invalid credentials, expired tokens)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found (resource doesn't exist)
- **429**: Too Many Requests (rate limiting)
- **500**: Internal Server Error (server errors)

---

# Usage Examples

## JavaScript/Node.js Examples

### Super User Registration and Login

```javascript
const axios = require('axios');

// Register Super User
const registerSuperUser = async (userData) => {
  try {
    const response = await axios.post('/api/v1/auth/register', {
      name: userData.name,
      email: userData.email,
      password: userData.password
    });
    
    return response.data;
  } catch (error) {
    console.error('Registration failed:', error.response.data);
    throw error;
  }
};

// Login Super User
const loginSuperUser = async (email, password) => {
  try {
    const response = await axios.post('/api/v1/auth/login', {
      email: email,
      password: password
    });
    
    // Store token for future requests
    const token = response.data.data.token;
    localStorage.setItem('superUserToken', token);
    
    return response.data;
  } catch (error) {
    console.error('Login failed:', error.response.data);
    throw error;
  }
};

// Create Property Manager (Super User only)
const createPropertyManager = async (propertyManagerData, superUserToken) => {
  try {
    const response = await axios.post('/api/v1/property-manager/auth/register', 
      propertyManagerData,
      {
        headers: {
          'Authorization': `Bearer ${superUserToken}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Property manager creation failed:', error.response.data);
    throw error;
  }
};
```

### Property Manager Operations

```javascript
// Login Property Manager
const loginPropertyManager = async (email, password) => {
  try {
    const response = await axios.post('/api/v1/property-manager/auth/login', {
      email: email,
      password: password
    });
    
    const token = response.data.data.token;
    localStorage.setItem('propertyManagerToken', token);
    
    return response.data;
  } catch (error) {
    console.error('Property manager login failed:', error.response.data);
    throw error;
  }
};

// Get Property Manager Profile
const getPropertyManagerProfile = async (token) => {
  try {
    const response = await axios.get('/api/v1/property-manager/auth/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Failed to get profile:', error.response.data);
    throw error;
  }
};
```

### Password Reset Flow

```javascript
// Initiate password reset
const forgotPassword = async (email, userType = 'superUser') => {
  const endpoint = userType === 'superUser' 
    ? '/api/v1/auth/forgot-password'
    : '/api/v1/property-manager/auth/forgot-password';
    
  try {
    const response = await axios.post(endpoint, { email });
    return response.data;
  } catch (error) {
    console.error('Forgot password failed:', error.response.data);
    throw error;
  }
};

// Reset password with OTP
const resetPassword = async (email, otp, newPassword, userType = 'superUser') => {
  const endpoint = userType === 'superUser' 
    ? '/api/v1/auth/reset-password'
    : '/api/v1/property-manager/auth/reset-password';
    
  try {
    const response = await axios.post(endpoint, {
      email,
      otp,
      newPassword
    });
    return response.data;
  } catch (error) {
    console.error('Password reset failed:', error.response.data);
    throw error;
  }
};
```

## cURL Examples

### Super User Operations

```bash
# Register Super User
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Admin",
    "email": "admin@example.com",
    "password": "securePassword123"
  }'

# Login Super User
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "securePassword123"
  }'

# Forgot Password
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com"
  }'

# Reset Password
curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "otp": "123456",
    "newPassword": "newSecurePassword123"
  }'
```

### Property Manager Operations

```bash
# Create Property Manager (Super User token required)
curl -X POST http://localhost:3000/api/v1/property-manager/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_USER_TOKEN" \
  -d '{
    "companyName": "ABC Property Management",
    "abn": "12345678901",
    "contactPerson": "Jane Smith",
    "email": "jane@abcproperties.com",
    "phone": "+61412345678",
    "region": "Sydney Metro",
    "compliance": "Standard Package",
    "password": "securePassword123"
  }'

# Login Property Manager
curl -X POST http://localhost:3000/api/v1/property-manager/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@abcproperties.com",
    "password": "securePassword123"
  }'

# Get Property Manager Profile
curl -X GET http://localhost:3000/api/v1/property-manager/auth/profile \
  -H "Authorization: Bearer YOUR_PROPERTY_MANAGER_TOKEN"

# Get All Property Managers (Super User only)
curl -X GET "http://localhost:3000/api/v1/property-manager/auth/all?status=Active&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_SUPER_USER_TOKEN"

# Update Property Manager (Super User only)
curl -X PATCH http://localhost:3000/api/v1/property-manager/auth/64abc123456789 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_USER_TOKEN" \
  -d '{
    "status": "Active",
    "outstandingAmount": 0
  }'
```

---

# Best Practices

## Frontend Integration

### Token Management

```javascript
// Token storage utility
class AuthManager {
  static setToken(token, userType) {
    localStorage.setItem(`${userType}Token`, token);
  }
  
  static getToken(userType) {
    return localStorage.getItem(`${userType}Token`);
  }
  
  static removeToken(userType) {
    localStorage.removeItem(`${userType}Token`);
  }
  
  static isTokenExpired(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= (payload.exp * 1000);
    } catch {
      return true;
    }
  }
}

// Axios interceptor for automatic token inclusion
axios.interceptors.request.use((config) => {
  const userType = config.userType || 'superUser';
  const token = AuthManager.getToken(userType);
  
  if (token && !AuthManager.isTokenExpired(token)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

// Response interceptor for handling token expiration
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      AuthManager.removeToken('superUser');
      AuthManager.removeToken('propertyManager');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

### Error Handling

```javascript
// Centralized error handling
const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return `Invalid request: ${data.message}`;
      case 401:
        return 'Please login to continue';
      case 403:
        return 'You do not have permission for this action';
      case 404:
        return 'Resource not found';
      case 429:
        return 'Too many attempts. Please try again later';
      case 500:
        return 'Server error. Please try again later';
      default:
        return data.message || 'An unexpected error occurred';
    }
  } else if (error.request) {
    return 'Network error. Please check your connection';
  } else {
    return 'An unexpected error occurred';
  }
};
```

## Security Recommendations

### Client-Side Security

1. **Secure Token Storage**:
   - Use httpOnly cookies for production
   - Avoid localStorage for sensitive tokens
   - Implement token refresh mechanism

2. **Input Validation**:
   - Validate all inputs on client-side
   - Sanitize user inputs
   - Use proper form validation

3. **HTTPS Only**:
   - Always use HTTPS in production
   - Secure all API communications

### Server-Side Security

1. **Environment Variables**:
   - Store JWT secrets in environment variables
   - Use strong, randomly generated secrets
   - Rotate secrets regularly

2. **Rate Limiting**:
   - Implement rate limiting on authentication endpoints
   - Use different limits for different operations

3. **Logging and Monitoring**:
   - Log all authentication events
   - Monitor for suspicious activities
   - Implement alerting for security events

---

# Troubleshooting

## Common Issues

### 1. Token Expiration

**Problem**: Requests returning 401 Unauthorized
**Solution**: Check token expiration and refresh/re-authenticate

```javascript
// Check if token is expired
if (AuthManager.isTokenExpired(token)) {
  // Redirect to login or refresh token
  window.location.href = '/login';
}
```

### 2. Email Not Sending

**Problem**: OTP emails not being received
**Solutions**:
- Check email service configuration
- Verify email address format
- Check spam folder
- Ensure email service API key is valid

### 3. OTP Validation Failing

**Problem**: Valid OTP being rejected
**Solutions**:
- Check OTP expiration (10 minutes)
- Verify attempt count (max 5 attempts)
- Ensure OTP is exactly 6 digits
- Check for any timing issues

### 4. Property Manager Can't Login

**Problem**: Property Manager receives account status error
**Solutions**:
- Check account status (must be "Active")
- Contact Super User to activate account
- Verify account was properly created

## API Testing

### Postman Collection

Create a Postman collection with the following requests:

1. **Super User Authentication**
   - POST Register Super User
   - POST Login Super User
   - POST Forgot Password Super User
   - POST Reset Password Super User

2. **Property Manager Authentication**
   - POST Register Property Manager (with Super User auth)
   - POST Login Property Manager
   - POST Forgot Password Property Manager
   - POST Reset Password Property Manager
   - GET Property Manager Profile

3. **Property Manager Management**
   - GET All Property Managers
   - GET Single Property Manager
   - PATCH Update Property Manager

### Environment Variables

Set up Postman environment variables:
```
baseUrl: http://localhost:3000
superUserToken: {{superUserToken}}
propertyManagerToken: {{propertyManagerToken}}
```

### Test Scripts

Add test scripts to automatically extract tokens:

```javascript
// For login requests
if (pm.response.code === 200) {
  const response = pm.response.json();
  if (response.data.token) {
    pm.environment.set("superUserToken", response.data.token);
    // or
    pm.environment.set("propertyManagerToken", response.data.token);
  }
}
```

---

# Conclusion

This Authentication API provides a robust, secure foundation for the RentalEase CRM system. With comprehensive user management, secure password reset flows, and proper role-based access control, it ensures that both Super Users and Property Managers can safely and efficiently manage their operations.

The API follows REST principles, implements industry-standard security practices, and provides clear error handling and documentation to facilitate easy integration and maintenance. 