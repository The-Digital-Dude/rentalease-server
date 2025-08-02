# PropertyManager Login Documentation

## Overview

The PropertyManager login system provides secure authentication for property managers to access the RentalEase CRM system. PropertyManagers can only access data related to their assigned properties and have role-based permissions.

## Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [Login Process](#login-process)
3. [Security Features](#security-features)
4. [API Reference](#api-reference)
5. [Error Handling](#error-handling)
6. [Usage Examples](#usage-examples)
7. [Frontend Integration](#frontend-integration)
8. [Troubleshooting](#troubleshooting)

## Authentication Endpoints

### Base URL

```
POST /api/property-manager/auth
```

### Available Endpoints

| Endpoint           | Method | Description                    | Access                |
| ------------------ | ------ | ------------------------------ | --------------------- |
| `/register`        | POST   | Create new PropertyManager     | Agency/SuperUser only |
| `/login`           | POST   | PropertyManager login          | Public                |
| `/forgot-password` | POST   | Request password reset         | Public                |
| `/reset-password`  | POST   | Reset password with OTP        | Public                |
| `/verify-otp`      | POST   | Verify OTP for password reset  | Public                |
| `/profile`         | GET    | Get PropertyManager profile    | Authenticated         |
| `/profile`         | PATCH  | Update PropertyManager profile | Authenticated         |

## Login Process

### 1. PropertyManager Registration (Agency/SuperUser Only)

Before a PropertyManager can login, they must be registered by an Agency or SuperUser.

**Endpoint**: `POST /api/property-manager/auth/register`

**Headers**:

```http
Authorization: Bearer <agency_or_superuser_token>
Content-Type: application/json
```

**Request Body**:

```json
{
  "firstName": "John",
  "lastName": "PropertyManager",
  "email": "propertymanager@example.com",
  "phone": "+61412345678",
  "password": "securepassword123",
  "address": {
    "street": "123 Test Street",
    "suburb": "Test Suburb",
    "state": "NSW",
    "postcode": "2000"
  }
}
```

**Response**:

```json
{
  "success": true,
  "message": "PropertyManager registered successfully",
  "data": {
    "propertyManager": {
      "id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "PropertyManager",
      "fullName": "John PropertyManager",
      "email": "propertymanager@example.com",
      "phone": "+61412345678",
      "status": "Active",
      "availabilityStatus": "Available",
      "assignedProperties": [],
      "owner": {
        "ownerType": "Agency",
        "ownerId": "507f1f77bcf86cd799439012"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "credentials": {
      "email": "propertymanager@example.com",
      "password": "securepassword123"
    }
  }
}
```

### 2. PropertyManager Login

**Endpoint**: `POST /api/property-manager/auth/login`

**Headers**:

```http
Content-Type: application/json
```

**Request Body**:

```json
{
  "email": "propertymanager@example.com",
  "password": "securepassword123"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "propertyManager": {
      "id": "507f1f77bcf86cd799439011",
      "firstName": "John",
      "lastName": "PropertyManager",
      "fullName": "John PropertyManager",
      "email": "propertymanager@example.com",
      "phone": "+61412345678",
      "status": "Active",
      "availabilityStatus": "Available",
      "assignedProperties": [
        {
          "propertyId": "507f1f77bcf86cd799439013",
          "assignedDate": "2024-01-15T11:00:00.000Z",
          "status": "Active",
          "role": "Primary"
        }
      ],
      "lastLogin": "2024-01-15T12:30:00.000Z",
      "lastActive": "2024-01-15T12:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": "7d"
  }
}
```

## Security Features

### JWT Token Structure

The JWT token contains the following payload:

```json
{
  "id": "507f1f77bcf86cd799439011",
  "type": "propertyManager",
  "email": "propertymanager@example.com",
  "iat": 1705312200,
  "exp": 1705917000
}
```

### Token Validation

The system validates tokens on every authenticated request:

1. **Token Format**: Must be valid JWT format
2. **Signature**: Must be signed with the correct secret
3. **Expiration**: Must not be expired
4. **User Status**: PropertyManager must be active
5. **User Type**: Must be "propertyManager"

### Request Object Enhancement

After successful authentication, the request object is enhanced with:

```javascript
req.propertyManager = {
  id: "507f1f77bcf86cd799439011",
  fullName: "John PropertyManager",
  email: "propertymanager@example.com",
  status: "Active",
  availabilityStatus: "Available",
  assignedProperties: [
    {
      propertyId: "507f1f77bcf86cd799439013",
      status: "Active",
      role: "Primary",
    },
  ],
};
```

## API Reference

### Login Endpoint

**URL**: `POST /api/property-manager/auth/login`

**Description**: Authenticate a PropertyManager and return JWT token

**Request Body**:

```json
{
  "email": "string (required)",
  "password": "string (required, min 8 characters)"
}
```

**Response Codes**:

- `200` - Login successful
- `400` - Invalid request data
- `401` - Invalid credentials
- `403` - Account inactive/suspended
- `500` - Server error

**Success Response**:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "propertyManager": {
      "id": "string",
      "firstName": "string",
      "lastName": "string",
      "fullName": "string",
      "email": "string",
      "phone": "string",
      "status": "Active|Inactive|Suspended|Pending",
      "availabilityStatus": "Available|Busy|Unavailable|On Leave",
      "assignedProperties": [
        {
          "propertyId": "string",
          "assignedDate": "date",
          "status": "Active|Inactive|Suspended",
          "role": "Primary|Secondary|Backup"
        }
      ],
      "lastLogin": "date",
      "lastActive": "date"
    },
    "token": "string (JWT)",
    "tokenType": "Bearer",
    "expiresIn": "7d"
  }
}
```

### Password Reset Flow

#### 1. Request Password Reset

**URL**: `POST /api/property-manager/auth/forgot-password`

**Request Body**:

```json
{
  "email": "propertymanager@example.com"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Password reset email sent successfully"
}
```

#### 2. Verify OTP

**URL**: `POST /api/property-manager/auth/verify-otp`

**Request Body**:

```json
{
  "email": "propertymanager@example.com",
  "otp": "123456"
}
```

**Response**:

```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

#### 3. Reset Password

**URL**: `POST /api/property-manager/auth/reset-password`

**Request Body**:

```json
{
  "email": "propertymanager@example.com",
  "otp": "123456",
  "newPassword": "newsecurepassword123"
}
```

**Response**:

```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

### Profile Management

#### Get Profile

**URL**: `GET /api/property-manager/auth/profile`

**Headers**:

```http
Authorization: Bearer <propertymanager_token>
```

**Response**:

```json
{
  "success": true,
  "data": {
    "propertyManager": {
      "id": "string",
      "firstName": "string",
      "lastName": "string",
      "fullName": "string",
      "email": "string",
      "phone": "string",
      "address": {
        "street": "string",
        "suburb": "string",
        "state": "string",
        "postcode": "string",
        "fullAddress": "string"
      },
      "status": "string",
      "availabilityStatus": "string",
      "assignedProperties": "array",
      "createdAt": "date",
      "updatedAt": "date",
      "lastLogin": "date",
      "lastActive": "date"
    }
  }
}
```

#### Update Profile

**URL**: `PATCH /api/property-manager/auth/profile`

**Headers**:

```http
Authorization: Bearer <propertymanager_token>
Content-Type: application/json
```

**Request Body** (all fields optional):

```json
{
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "address": {
    "street": "string",
    "suburb": "string",
    "state": "string",
    "postcode": "string"
  },
  "availabilityStatus": "Available|Busy|Unavailable|On Leave"
}
```

## Error Handling

### Common Error Responses

#### Invalid Credentials

```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

#### Account Inactive

```json
{
  "success": false,
  "message": "Account is inactive. Please contact your administrator."
}
```

#### Account Suspended

```json
{
  "success": false,
  "message": "Account is suspended. Please contact your administrator."
}
```

#### Invalid Token

```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

#### Access Denied

```json
{
  "success": false,
  "message": "Access denied. PropertyManager authentication required."
}
```

#### Rate Limit Exceeded

```json
{
  "success": false,
  "message": "Rate limit exceeded. Please try again later."
}
```

## Usage Examples

### JavaScript/Node.js

```javascript
// Login
const loginPropertyManager = async (email, password) => {
  try {
    const response = await fetch("/api/property-manager/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      // Store token
      localStorage.setItem("propertyManagerToken", data.data.token);
      localStorage.setItem(
        "propertyManagerData",
        JSON.stringify(data.data.propertyManager)
      );
      return data.data;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
};

// Authenticated request
const getPropertyManagerProfile = async () => {
  const token = localStorage.getItem("propertyManagerToken");

  try {
    const response = await fetch("/api/property-manager/auth/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Profile fetch failed:", error);
    throw error;
  }
};

// Password reset
const requestPasswordReset = async (email) => {
  try {
    const response = await fetch("/api/property-manager/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Password reset request failed:", error);
    throw error;
  }
};
```

### cURL Examples

#### Login

```bash
curl -X POST http://localhost:3000/api/property-manager/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "propertymanager@example.com",
    "password": "securepassword123"
  }'
```

#### Get Profile

```bash
curl -X GET http://localhost:3000/api/property-manager/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Update Profile

```bash
curl -X PATCH http://localhost:3000/api/property-manager/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+61412345679",
    "availabilityStatus": "Busy"
  }'
```

#### Request Password Reset

```bash
curl -X POST http://localhost:3000/api/property-manager/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "propertymanager@example.com"
  }'
```

## Frontend Integration

### React Example

```jsx
import React, { useState, useEffect } from "react";

const PropertyManagerLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/property-manager/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Store authentication data
        localStorage.setItem("propertyManagerToken", data.data.token);
        localStorage.setItem(
          "propertyManagerData",
          JSON.stringify(data.data.propertyManager)
        );

        // Redirect to dashboard
        window.location.href = "/property-manager/dashboard";
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>PropertyManager Login</h2>
      {error && <div className="error">{error}</div>}

      <form onSubmit={handleLogin}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div>
        <a href="/property-manager/forgot-password">Forgot Password?</a>
      </div>
    </div>
  );
};

export default PropertyManagerLogin;
```

### Authentication Hook

```jsx
import { useState, useEffect, createContext, useContext } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [propertyManager, setPropertyManager] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on app load
    const token = localStorage.getItem("propertyManagerToken");
    const propertyManagerData = localStorage.getItem("propertyManagerData");

    if (token && propertyManagerData) {
      setPropertyManager(JSON.parse(propertyManagerData));
    }

    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const response = await fetch("/api/property-manager/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem("propertyManagerToken", data.data.token);
      localStorage.setItem(
        "propertyManagerData",
        JSON.stringify(data.data.propertyManager)
      );
      setPropertyManager(data.data.propertyManager);
      return data.data;
    } else {
      throw new Error(data.message);
    }
  };

  const logout = () => {
    localStorage.removeItem("propertyManagerToken");
    localStorage.removeItem("propertyManagerData");
    setPropertyManager(null);
  };

  const value = {
    propertyManager,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
```

## Troubleshooting

### Common Issues

#### 1. "Invalid email or password" Error

- **Cause**: Incorrect email or password
- **Solution**: Verify credentials and try again
- **Prevention**: Use password managers for secure credential storage

#### 2. "Account is inactive" Error

- **Cause**: PropertyManager account is not active
- **Solution**: Contact the Agency or SuperUser to activate the account
- **Prevention**: Ensure proper account status management

#### 3. "Invalid or expired token" Error

- **Cause**: JWT token is invalid or has expired
- **Solution**: Re-login to get a new token
- **Prevention**: Implement token refresh logic

#### 4. "Rate limit exceeded" Error

- **Cause**: Too many login attempts
- **Solution**: Wait before trying again
- **Prevention**: Implement proper rate limiting on frontend

#### 5. "Access denied" Error

- **Cause**: Missing or invalid Authorization header
- **Solution**: Ensure token is included in request headers
- **Prevention**: Use authentication interceptors

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
DEBUG=propertymanager:auth
```

This will log detailed authentication information for troubleshooting.

### Health Check

Check if the authentication service is running:

```bash
curl -X GET http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok",
  "services": {
    "database": "connected",
    "authentication": "running"
  }
}
```

## Security Best Practices

### For Developers

1. **Always use HTTPS** in production
2. **Implement token refresh** for long sessions
3. **Use secure password requirements** (min 8 characters, complexity)
4. **Implement rate limiting** to prevent brute force attacks
5. **Log authentication events** for security monitoring
6. **Validate all inputs** on both client and server
7. **Use environment variables** for sensitive configuration

### For PropertyManagers

1. **Use strong passwords** with complexity
2. **Never share credentials** with others
3. **Logout when finished** using the system
4. **Report suspicious activity** immediately
5. **Keep contact information updated**
6. **Use secure networks** when accessing the system

## Support

For technical support or questions about PropertyManager authentication:

- **Email**: support@rentalease.com
- **Documentation**: https://docs.rentalease.com/property-manager
- **API Status**: https://status.rentalease.com

---

_This documentation is for PropertyManager authentication system v1.0.0_
