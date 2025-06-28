# SmartStock API - User and Auth Routes Documentation

## Overview

This document provides comprehensive documentation for the User and Auth API routes in the SmartStock application.

---

## Auth Routes (`/api/v1/auth/`)

### Overview

The auth routes handle user authentication operations including login, logout, user creation, and password management.

### Base URL

```
/api/v1/auth/
```

### Endpoints

#### 1. Welcome Message

- **Method**: `GET`
- **Path**: `/`
- **Description**: Returns a welcome message for the Auth API
- **Authentication**: None required
- **Response**:
  ```
  "Welcome to the Auth API"
  ```

#### 2. User Login

- **Method**: `POST`
- **Path**: `/login`
- **Description**: Authenticates a user and returns a JWT token
- **Authentication**: None required
- **Request Body**:
  ```json
  {
    "email": "string (required)",
    "password": "string (required)"
  }
  ```
- **Success Response** (200):
  ```json
  {
    "message": "Login successful",
    "token": "jwt_token_string",
    "user": {
      "id": "user_id",
      "fullName": "User Name",
      "email": "user@example.com",
      "role": "admin|staff|viewer",
      "lastLogin": "2025-06-27T00:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400`: Missing email or password
  - `404`: User not found or inactive
  - `401`: Invalid credentials

#### 3. User Logout

- **Method**: `GET`
- **Path**: `/logout`
- **Description**: Logs out the authenticated user by invalidating the token
- **Authentication**: Required (`isAuthenticated`)
- **Headers**:
  ```
  Authorization: Bearer <jwt_token>
  ```
- **Success Response** (200):
  ```json
  {
    "message": "Logout successful",
    "token": "invalidated_token"
  }
  ```
- **Error Responses**:
  - `401`: No token provided or invalid token

#### 4. Create New User

- **Method**: `POST`
- **Path**: `/add/new-user`
- **Description**: Creates a new user (admin only)
- **Authentication**: Required (`isAuthenticated`, `isAuthorized("admin")`)
- **Request Body**:
  ```json
  {
    "fullName": "string (required)",
    "email": "string (required)",
    "password": "string (required)",
    "role": "admin|staff|viewer (required)",
    "status": "active|inactive|suspended (required)"
  }
  ```
- **Success Response** (201):
  ```json
  {
    "message": "User created successfully.",
    "user": {
      "id": "user_id",
      "fullName": "User Name",
      "email": "user@example.com",
      "role": "admin|staff|viewer",
      "status": "active|inactive|suspended",
      "emailVerified": false
    }
  }
  ```
- **Error Responses**:
  - `400`: Missing required fields or user already exists
  - `401`: Unauthorized
  - `403`: Insufficient permissions (not admin)

#### 5. Change Password

- **Method**: `POST`
- **Path**: `/change-password`
- **Description**: Allows authenticated users to change their password
- **Authentication**: Required (`isAuthenticated`)
- **Request Body**:
  ```json
  {
    "oldPassword": "string (required)",
    "newPassword": "string (required)"
  }
  ```
- **Success Response** (200):
  ```json
  {
    "message": "Password changed successfully",
    "user": {
      "id": "user_id",
      "fullName": "User Name",
      "email": "user@example.com",
      "role": "admin|staff|viewer"
    }
  }
  ```
- **Error Responses**:
  - `400`: Missing old or new password
  - `401`: Old password is incorrect
  - `404`: User not found

---

## User Routes (`/api/v1/users/`)

### Overview

The user routes handle user management operations including profile access, user administration, and user data management.

### Base URL

```
/api/v1/users/
```

### Endpoints

#### 1. Welcome Message

- **Method**: `GET`
- **Path**: `/`
- **Description**: Returns a welcome message for the User API
- **Authentication**: None required
- **Response**:
  ```
  "Welcome to the User API"
  ```

#### 2. Get My Profile

- **Method**: `GET`
- **Path**: `/me`
- **Description**: Retrieves the current authenticated user's profile details
- **Authentication**: Required (`isAuthenticated`)
- **Success Response** (200):
  ```json
  {
    "message": "User details fetched successfully",
    "user": {
      "id": "user_id",
      "fullName": "User Name",
      "email": "user@example.com",
      "role": "admin|staff|viewer",
      "status": "active|inactive|suspended",
      "userAvatar": "avatar_url"
    }
  }
  ```
- **Error Responses**:
  - `401`: Unauthorized (invalid or missing token)

#### 3. Get All Users

- **Method**: `GET`
- **Path**: `/all`
- **Description**: Retrieves all users in the system (admin only)
- **Authentication**: Required (`isAuthenticated`, `isAuthorized("admin")`)
- **Success Response** (200):
  ```json
  {
    "message": "All users fetched successfully.",
    "totalUsers": 5,
    "users": [
      {
        "_id": "user_id",
        "fullName": "User Name",
        "email": "user@example.com",
        "role": "admin|staff|viewer",
        "status": "active|inactive|suspended",
        "emailVerified": false,
        "userAvatar": "avatar_url",
        "assignedLocation": "location_id_or_null",
        "createdAt": "2025-06-27T00:00:00.000Z",
        "updatedAt": "2025-06-27T00:00:00.000Z",
        "lastLogin": "2025-06-27T00:00:00.000Z",
        "passwordResetToken": null,
        "passwordResetTokenExpires": null,
        "passwordChangedAt": null
      }
    ]
  }
  ```
  > **Security Note**: This endpoint returns full user objects including sensitive fields like `passwordResetToken`. Consider implementing field filtering in production.
- **Error Responses**:
  - `401`: Unauthorized
  - `403`: Insufficient permissions (not admin)

#### 4. Get User Details by ID

- **Method**: `GET`
- **Path**: `/:id`
- **Description**: Retrieves details of a specific user by ID (admin only)
- **Authentication**: Required (`isAuthenticated`, `isAuthorized("admin")`)
- **Parameters**:
  - `id` (URL parameter): User ID
- **Success Response** (200):
  ```json
  {
    "message": "User details fetched successfully.",
    "user": {
      "id": "user_id",
      "fullName": "User Name",
      "email": "user@example.com",
      "role": "admin|staff|viewer",
      "status": "active|inactive|suspended",
      "emailVerified": false,
      "createdAt": "2025-06-27T00:00:00.000Z",
      "updatedAt": "2025-06-27T00:00:00.000Z",
      "lastLogin": "2025-06-27T00:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400`: User ID is required
  - `401`: Unauthorized
  - `403`: Insufficient permissions (not admin)
  - `404`: User not found

#### 5. Update User

- **Method**: `PUT`
- **Path**: `/update/:id`
- **Description**: Updates a user's information (admin only)
- **Authentication**: Required (`isAuthenticated`, `isAuthorized("admin")`)
- **Parameters**:
  - `id` (URL parameter): User ID
- **Request Body**:
  ```json
  {
    "fullName": "string (required)",
    "email": "string (required)",
    "role": "admin|staff|viewer (required)",
    "status": "active|inactive|suspended (required)"
  }
  ```
- **Success Response** (200):
  ```json
  {
    "message": "User updated successfully.",
    "user": {
      "id": "user_id",
      "fullName": "Updated Name",
      "email": "updated@example.com",
      "role": "admin|staff|viewer",
      "status": "active|inactive|suspended"
    }
  }
  ```
- **Error Responses**:
  - `400`: Missing required fields, invalid email, invalid role, invalid status, or email already exists
  - `401`: Unauthorized
  - `403`: Insufficient permissions (not admin)
  - `404`: User not found

#### 6. Delete User

- **Method**: `DELETE`
- **Path**: `/delete/:id`
- **Description**: Permanently deletes a user from the system (admin only)
- **Authentication**: Required (`isAuthenticated`, `isAuthorized("admin")`)
- **Parameters**:
  - `id` (URL parameter): User ID
- **Success Response** (200):
  ```json
  {
    "message": "User deleted successfully."
  }
  ```
- **Error Responses**:
  - `400`: User ID is required
  - `401`: Unauthorized
  - `403`: Insufficient permissions (not admin)
  - `404`: User not found

---

## Authentication & Authorization

### Middleware Used

1. **`isAuthenticated`**:

   - Validates JWT token from Authorization header
   - Attaches user object to request
   - Format: `Authorization: Bearer <jwt_token>`

2. **`isAuthorized("admin")`**:
   - Ensures user has admin role
   - Must be used after `isAuthenticated`

### Role Hierarchy

- **admin**: Full access to all operations including user management
- **staff**: Limited access (can access own profile and change password)
- **viewer**: Read-only access (can access own profile and change password)

### Valid Values

**Roles**:

- `admin`: Full system access
- `staff`: Standard user with limited privileges
- `viewer`: Read-only user (default)

**Status**:

- `active`: User can log in and use the system (default)
- `inactive`: User account is disabled
- `suspended`: User account is temporarily suspended

### Security Features

1. **Password Hashing**: All passwords are hashed using bcryptjs with salt rounds of 10
2. **JWT Tokens**: Secure token-based authentication
3. **Role-Based Access Control**: Different permission levels based on user roles
4. **Email Validation**: Basic email format validation
5. **Password Change Security**: Requires old password verification
6. **Default User Avatar**: Users get a default avatar URL when created
7. **Password Reset Functionality**: Secure token-based password reset system

---

## Error Handling

All endpoints use consistent error response format:

```json
{
  "message": "Error description"
}
```

### Common HTTP Status Codes

- `200`: Success
- `201`: Created successfully
- `400`: Bad Request (validation errors, missing fields)
- `401`: Unauthorized (invalid credentials, missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (user/resource not found)
- `500`: Internal Server Error

---

## Usage Examples

### Login Example

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

### Get My Profile Example

```bash
curl -X GET http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer your_jwt_token_here"
```

### Create User Example (Admin Only)

```bash
curl -X POST http://localhost:3000/api/v1/auth/add/new-user \
  -H "Authorization: Bearer admin_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "email": "john@example.com",
    "password": "securepassword",
    "role": "staff",
    "status": "active"
  }'
```

### Update User Example (Admin Only)

```bash
curl -X PUT http://localhost:3000/api/v1/users/update/user_id_here \
  -H "Authorization: Bearer admin_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Smith",
    "email": "johnsmith@example.com",
    "role": "viewer",
    "status": "active"
  }'
```

### Delete User Example (Admin Only)

```bash
curl -X DELETE http://localhost:3000/api/v1/users/delete/user_id_here \
  -H "Authorization: Bearer admin_jwt_token"
```

### Change Password Example

```bash
curl -X POST http://localhost:3000/api/v1/auth/change-password \
  -H "Authorization: Bearer user_jwt_token" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "currentpassword",
    "newPassword": "newpassword123"
  }'
```

---

## Notes

1. **Token Expiration**: JWT tokens have expiration times set in environment variables
2. **CORS**: Ensure proper CORS configuration for frontend integration
3. **Rate Limiting**: Consider implementing rate limiting for authentication endpoints
4. **Logging**: All authentication attempts and user management actions should be logged
5. **Environment Variables**: Ensure JWT_SECRET and other sensitive data are properly configured
6. **Default Avatar**: All users get a default avatar URL when created automatically
7. **Location Assignment**: The `assignedLocation` field exists in the User model but is not currently implemented in the create/update user endpoints
8. **Security Improvement Needed**: The `getAllUsers` endpoint currently returns sensitive fields like `passwordResetToken`, `passwordResetTokenExpires`, and `passwordChangedAt`. Consider implementing field filtering to exclude these from responses
9. **User Deletion**: The delete user endpoint permanently removes users from the database. Consider implementing soft deletion for better data integrity
10. **Email Verification**: Users are created with `emailVerified: false` by default, but email verification functionality is not yet implemented

---

_Last Updated: June 27, 2025_
_API Version: 1.0_
