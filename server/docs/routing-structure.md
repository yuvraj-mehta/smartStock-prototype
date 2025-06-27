# SmartStock API Routing Structure

## Auth Route (`/api/v1/auth/`)

### Purpose

Handle authentication and authorization operations

### Access Level

Public routes (except logout which requires authentication)

### Endpoints

```javascript
// routes/auth.route.js
import { Router } from "express";
import {
  login,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  refreshToken,
} from "../controllers/index.js";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Auth API");
});

// Authentication endpoints
router.post("/login", login); // POST /api/v1/auth/login
router.post("/logout", logout); // POST /api/v1/auth/logout
router.post("/forgot-password", forgotPassword); // POST /api/v1/auth/forgot-password
router.post("/reset-password", resetPassword); // POST /api/v1/auth/reset-password
router.post("/verify-email", verifyEmail); // POST /api/v1/auth/verify-email
router.post("/refresh-token", refreshToken); // POST /api/v1/auth/refresh-token

export default router;
```

### Operations

- **Login/Logout**: User authentication
- **Password Reset**: Forgot password and reset password functionality
- **Email Verification**: Email verification for new accounts
- **Token Refresh**: Refresh JWT tokens

---

## User Route (`/api/v1/users/`)

### Purpose

Handle user management and profile operations (CRUD operations on users)

### Access Level

Protected routes (requires authentication and proper role permissions)

### Endpoints

```javascript
// routes/user.route.js
import { Router } from "express";
import {
  createUser,
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserStatus,
  updateUserRole,
} from "../controllers/index.js";
import { isAuthenticated, isAuthorized } from "../middlewares/index.js";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the User API");
});

// User management endpoints (protected routes)
router.post("/", isAuthenticated, isAuthorized("admin"), createUser); // POST /api/v1/users/
router.get("/profile", isAuthenticated, getUserProfile); // GET /api/v1/users/profile
router.put("/profile", isAuthenticated, updateUserProfile); // PUT /api/v1/users/profile
router.get("/all", isAuthenticated, isAuthorized("admin"), getAllUsers); // GET /api/v1/users/all
router.get("/:id", isAuthenticated, isAuthorized("admin"), getUserById); // GET /api/v1/users/:id
router.put("/:id", isAuthenticated, isAuthorized("admin"), updateUser); // PUT /api/v1/users/:id
router.delete("/:id", isAuthenticated, isAuthorized("admin"), deleteUser); // DELETE /api/v1/users/:id
router.put(
  "/:id/status",
  isAuthenticated,
  isAuthorized("admin"),
  updateUserStatus
); // PUT /api/v1/users/:id/status
router.put("/:id/role", isAuthenticated, isAuthorized("admin"), updateUserRole); // PUT /api/v1/users/:id/role

export default router;
```

### Operations

- **User Creation**: Create new users (admin only)
- **Profile Management**: Get/update user profile (self)
- **User Administration**: CRUD operations on all users (admin only)
- **Status Management**: Enable/disable users (admin only)
- **Role Management**: Assign/update user roles (admin only)

---

## Key Differences

| Aspect         | Auth Route                     | User Route                                        |
| -------------- | ------------------------------ | ------------------------------------------------- |
| **Purpose**    | Authentication & Authorization | User Management & Profile Operations              |
| **Access**     | Mostly public routes           | Protected routes only                             |
| **Focus**      | "Who you are"                  | "What you can do with user data"                  |
| **Middleware** | Minimal (except logout)        | Heavy use of `isAuthenticated` and `isAuthorized` |

---

## Role-Based Access Control

### Admin Operations (requires `isAuthorized("admin")`)

- Create users
- View all users
- Update any user
- Delete users
- Change user status
- Change user roles

### Regular User Operations

- View own profile
- Update own profile
- Logout

### Public Operations

- Login
- Forgot password
- Reset password
- Verify email
- Refresh token

---

## Implementation Notes

1. **Authentication First**: All user management operations require authentication
2. **Role-Based Permissions**: Admin operations are protected by role guards
3. **Self-Service**: Users can manage their own profiles without admin privileges
4. **Security**: Sensitive operations (create, delete, role changes) require admin access
5. **RESTful Design**: Routes follow REST conventions for resource management

This structure aligns with your existing middleware (`isAuthenticated`, `isAuthorized`) and follows the role-based permissions matrix defined in your models.
