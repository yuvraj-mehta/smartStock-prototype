# SmartStock Server Codebase (Compiled)

**Date Compiled:** 28 June 2025

---

## Table of Contents

1. [package.json](#packagejson)
2. [app.js](#appjs)
3. [server.js](#serverjs)
4. [config/config.js](#configconfigjs)
5. [database/db.js](#databasedbjs)
6. [middlewares](#middlewares)
   - [index.js](#middlewaresindexjs)
   - [error.handler.js](#middlewareserrorhandlerjs)
   - [auth.middleware.js](#middlewaresauthmiddlewarejs)
   - [async.handler.js](#middlewaresasynchandlerjs)
   - [catch.async.errors.js](#middlewarescatchasyncerrorsjs)
7. [models](#models)
   - [index.js](#modelsindexjs)
   - [user.model.js](#modelsusermodeljs)
   - [location.model.js](#modelslocationmodeljs)
8. [utils](#utils)
   - [index.js](#utilsindexjs)
   - [token/generate.token.js](#utilstokengeneratetokenjs)
9. [controllers](#controllers)
   - [index.js](#controllersindexjs)
   - [auth.controller.js](#controllersauthcontrollerjs)
   - [user.controller.js](#controllersusercontrollerjs)
10. [routes](#routes)
    - [user.route.js](#routesuserroutejs)
    - [product.route.js](#routesproductroutejs)
    - [inventory.route.js](#routesinventoryroutejs)
    - [auth.route.js](#routesauthroutejs)
    - [alert.route.js](#routesalertroutejs)
    - [location.route.js](#routeslocationroutejs)
    - [assistant.route.js](#routesassistantroutejs)
    - [forecast.route.js](#routesforecastroutejs)
    - [health.route.js](#routeshealthroutejs)

---

## package.json

```json
{
  "name": "server",
  "version": "1.0.0",
  "description": "server for SmartStock",
  "main": "server.js",
  "type": "module",
  "scripts": {
    "test": "test",
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "author": "Yuvraj Mehta",
  "license": "ISC",
  "dependencies": {
    "bcrypt": "^6.0.0",
    "bcryptjs": "^3.0.2",
    "cloudinary": "^2.7.0",
    "cors": "^2.8.5",
    "dotenv": "^16.6.0",
    "express": "^5.1.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.16.0",
    "nodemailer": "^7.0.3",
    "nodemon": "^3.1.10"
  }
}
```

---

## app.js

```javascript
import express from "express";
import cors from "cors";
import { corsConfig } from "./config/config.js";
const app = express();
import { notFound, errorHandler } from "./middlewares/index.js";
import userRouter from "./routes/user.route.js";
import productRouter from "./routes/product.route.js";
import inventoryRouter from "./routes/inventory.route.js";
import authRouter from "./routes/auth.route.js";
import alertRouter from "./routes/alert.route.js";
import locationRouter from "./routes/location.route.js";
import assistantRouter from "./routes/assistant.route.js";
import forecastRouter from "./routes/forecast.route.js";
import healthRouter from "./routes/health.route.js";

app.use(cors(corsConfig));
app.use(express.json());

// Define routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/alerts", alertRouter);
app.use("/api/v1/health", healthRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/forecast", forecastRouter);
app.use("/api/v1/locations", locationRouter);
app.use("/api/v1/assistant", assistantRouter);
app.use("/api/v1/inventory", inventoryRouter);

// 404 handler for undefined routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;
```

---

## server.js

```javascript
import app from "./app.js";
import { conf } from "./config/config.js";
import connectDb from "./database/db.js";

connectDb();

app.listen(conf.port, () => {
  console.log(
    `Server is running on port ${conf.port} and connected to database ${conf.dbName}`
  );
});
```

---

## config/config.js

```javascript
// importing environment variables
import dotenv from "dotenv";
dotenv.config();

export const conf = {
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:9000",
  ],
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/myapp",
  dbName: process.env.DB_NAME || "myapp",
  port: process.env.PORT || 3500,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiration: process.env.JWT_EXPIRATION || "7d",
  emailHost: process.env.EMAIL_HOST,
  emailPort: process.env.EMAIL_PORT,
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
};

// CORS configuration
export const corsConfig = {
  origin: conf.allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
  port: conf.port,
};
```

---

## database/db.js

```javascript
import mongoose from "mongoose";
import { conf } from "../config/config.js";

const connectDb = async () => {
  try {
    if (!conf.mongoUri) {
      throw new Error("MONGO_URI is not defined in the configuration.");
    }
    await mongoose.connect(conf.mongoUri, {
      dbName: conf.dbName,
    });
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
  }
};

export default connectDb;
```

---

## middlewares/index.js

```javascript
import asyncHandler from "./async.handler.js";
import { errorHandler, notFound, ApiError } from "./error.handler.js";
import catchAsyncErrors from "./catch.async.errors.js";
import { isAuthenticated, isAuthorized } from "./auth.middleware.js";

export {
  asyncHandler,
  errorHandler,
  notFound,
  ApiError,
  catchAsyncErrors,
  isAuthenticated,
  isAuthorized,
};
```

---

## middlewares/error.handler.js

```javascript
/**
 * Error Handler Middleware
 * Centralized error handling for the API
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = "") {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  // Log error for debugging
  console.error(`❌ Error: ${err.message}`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    stack: err.stack,
  });
  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = new ApiError(404, message);
  }
  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = "Duplicate field value entered";
    error = new ApiError(400, message);
  }
  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = new ApiError(400, message);
  }
  // JSON parsing error
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    const message = "Invalid JSON format";
    error = new ApiError(400, message);
  }
  // File not found error
  if (err.code === "ENOENT") {
    const message = "Data file not found";
    error = new ApiError(404, message);
  }
  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

const notFound = (req, res, next) => {
  const message = `Route ${req.originalUrl} not found`;
  const error = new ApiError(404, message);
  next(error);
};

export { ApiError, errorHandler, notFound };
```

---

## middlewares/auth.middleware.js

```javascript
import { catchAsyncErrors } from "./index.js";
import jwt from "jsonwebtoken";
import { conf } from "../config/config.js";
import { User } from "../models/index.js";

const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "No token provided, authorization denied." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, conf.jwtSecret);
    if (!decoded) {
      return res
        .status(401)
        .json({ message: "Token is not valid, authorization denied." });
    }
    // Populate user with warehouse location
    req.user = await User.findById(decoded.id).populate(
      "assignedLocation",
      "name code"
    );
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "User not found, authorization denied." });
    }
    // Expose user's warehouse location for downstream use
    req.userLocation = req.user.assignedLocation;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Token is not valid, authorization denied." });
  }
});

/**
 * Role-based authorization
 * Accepts one or more roles: isAuthorized('admin'), isAuthorized('admin','staff')
 */
const isAuthorized =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to access this resource.",
      });
    }
    next();
  };

export { isAuthenticated, isAuthorized };
```

---

## middlewares/async.handler.js

```javascript
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
```

---

## middlewares/catch.async.errors.js

```javascript
const catchAsyncErrors = (theFunction) => {
  return (req, res, next) => {
    Promise.resolve(theFunction(req, res, next)).catch(next);
  };
};

export default catchAsyncErrors;
```

---

## models/index.js

```javascript
import { User } from "../models/user.model.js";
import { Location } from "../models/location.model.js";

export { User, Location };
```

---

## models/user.model.js

```javascript
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "staff", "viewer"],
      default: "viewer",
    },
    assignedLocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: function () {
        return this.role === "admin";
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
    },
    avatar: {
      type: String,
      default:
        "https://media.istockphoto.com/id/1300845620/vector/user-icon-flat-isolated-on-white-background-user-symbol-vector-illustration.jpg?s=1024x1024&w=is&k=20&c=-mUWsTSENkugJ3qs5covpaj-bhYpxXY-v9RDpzsw504=",
    },
    lastLogin: {
      type: Date,
      default: null,
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetTokenExpires: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
```

---

## models/location.model.js

```javascript
import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ["warehouse"],
      default: "warehouse",
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const Location = mongoose.model("Location", locationSchema);
```

---

## utils/index.js

```javascript
import generateToken from "./token/generate.token.js";

export { generateToken };
```

---

## utils/token/generate.token.js

```javascript
import jwt from "jsonwebtoken";
import { conf } from "../../config/config.js";

const generateToken = (user) => {
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      locationId: user.assignedLocation?._id,
    },
    conf.jwtSecret,
    {
      expiresIn: conf.jwtExpiration,
    }
  );
  return token;
};

export default generateToken;
```

---

## controllers/index.js

```javascript
import {
  login,
  logout,
  getMyDetails,
  changePassword,
} from "./auth.controller.js";

import {
  createUser,
  getAllUsers,
  getUserDetails,
  updateUser,
  deleteUser,
} from "./user.controller.js";

export {
  login,
  logout,
  getMyDetails,
  getUserDetails,
  changePassword,
  createUser,
  getAllUsers,
  updateUser,
  deleteUser,
};
```

---

## controllers/auth.controller.js

```javascript
import { catchAsyncErrors } from "../middlewares/index.js";
import { User } from "../models/index.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/index.js";
import jwt from "jsonwebtoken";

// login controller
const login = catchAsyncErrors(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Email and password are required." });
  }
  const user = await User.findOne({ email, status: "active" })
    .populate("assignedLocation", "name code")
    .select("+password");
  if (!user) {
    return res.status(404).json({ message: "User not found or inactive." });
  }
  if (user.role === "admin" && !user.assignedLocation) {
    return res.status(403).json({
      message: "Admin must be assigned to a warehouse location",
    });
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid email or password." });
  }
  user.lastLogin = new Date();
  await user.save();
  const token = generateToken(user);
  res.status(200).json({
    message: "Login successful",
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      assignedLocation: user.assignedLocation,
      lastLogin: user.lastLogin,
    },
  });
});

// logout controller
const logout = catchAsyncErrors(async (req, res) => {
  res.status(200).json({
    message: "Logout successful",
  });
});

// get user details
const getMyDetails = catchAsyncErrors(async (req, res) => {
  const user = req.user;
  return res.status(200).json({
    message: "User details fetched successfully",
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
      assignedLocation: user.assignedLocation,
      isVerified: user.isVerified,
    },
  });
});

// change password controller
const changePassword = catchAsyncErrors(async (req, res) => {
  const oldPassword = req.body.oldPassword;
  const newPassword = req.body.newPassword;
  if (!oldPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Old password and new password are required." });
  }
  const isValid = await bcrypt.compare(oldPassword, req.user.password);
  if (!isValid) {
    return res.status(401).json({ message: "Old password is incorrect." });
  }
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { password: hashedPassword },
    { new: true }
  );
  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }
  res.status(200).json({
    message: "Password changed successfully",
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  });
});

export { login, logout, getMyDetails, changePassword };
```

---

## controllers/user.controller.js

```javascript
import { catchAsyncErrors } from "../middlewares/index.js";
import { User } from "../models/index.js";
import bcrypt from "bcryptjs";

// Create User Controller
const createUser = catchAsyncErrors(async (req, res) => {
  const { fullName, email, password, role } = req.body;

  if (!fullName || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      message: "User with this email already exists.",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    fullName,
    email,
    password: hashedPassword,
    role,
    assignedLocation: req.user.assignedLocation,
    isVerified: false,
  });

  res.status(201).json({
    message: "User created successfully.",
    user: {
      id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      isVerified: newUser.isVerified,
      assignedLocation: newUser.assignedLocation,
    },
  });
});

// Get All Users Controller
const getAllUsers = catchAsyncErrors(async (req, res) => {
  const users = await User.find({
    assignedLocation: req.user.assignedLocation,
  }).populate("assignedLocation", "name code");

  res.status(200).json({
    message: "All users fetched successfully.",
    totalUsers: users.length,
    users,
  });
});

// Get details of a single user
const getUserDetails = catchAsyncErrors(async (req, res) => {
  const userId = req.params.id;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  const user = await User.findOne({
    _id: userId,
    assignedLocation: req.user.assignedLocation,
  }).populate("assignedLocation", "name code");

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  return res.status(200).json({
    message: "User details fetched successfully.",
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      assignedLocation: user.assignedLocation,
      avatar: user.avatar,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin,
    },
  });
});

// Update User data by Admin
const updateUser = catchAsyncErrors(async (req, res) => {
  const userId = req.params.id;
  const { fullName, email, role, status } = req.body;

  if (!userId || !fullName || !email || !role || !status) {
    return res.status(400).json({ message: "All fields are required." });
  }

  // Simple email validation
  if (!email.includes("@")) {
    return res
      .status(400)
      .json({ message: "Please provide a valid email address." });
  }

  // Validate role
  const validRoles = ["admin", "staff", "viewer"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role." });
  }

  // Validate status
  const validStatuses = ["active", "inactive", "suspended"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status." });
  }

  const user = await User.findOne({
    _id: userId,
    assignedLocation: req.user.assignedLocation,
  });

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  // Check if email already exists when changing email
  if (user.email !== email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists." });
    }
  }

  if (user._id.toString() === req.user._id.toString() && role !== user.role) {
    return res.status(400).json({ message: "Cannot change your own role." });
  }

  if (user.fullName !== fullName) {
    user.fullName = fullName;
  }
  if (user.email !== email) {
    user.email = email;
  }
  if (user.role !== role) {
    user.role = role;
  }
  if (user.status !== status) {
    user.status = status;
  }
  user.updatedAt = new Date();

  await user.save();

  res.status(200).json({
    message: "User updated successfully.",
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      assignedLocation: user.assignedLocation,
    },
  });
});

const deleteUser = catchAsyncErrors(async (req, res) => {
  const userId = req.params.id;

  if (!userId) {
    return res.status(400).json({ message: "User ID is required." });
  }

  const user = await User.findOne({
    _id: userId,
    assignedLocation: req.user.assignedLocation,
  });

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ message: "Cannot delete your own account." });
  }

  await User.findByIdAndDelete(userId);
  res.status(200).json({ message: "User deleted successfully." });
});

export { createUser, getAllUsers, getUserDetails, updateUser, deleteUser };
```

---

## routes/user.route.js

```javascript
import { Router } from "express";
import {
  getMyDetails,
  getAllUsers,
  getUserDetails,
  updateUser,
  createUser,
  deleteUser,
} from "../controllers/index.js";
import { isAuthenticated, isAuthorized } from "../middlewares/index.js";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the User API");
});
router.get("/me", isAuthenticated, getMyDetails);
router.post("/create", isAuthenticated, isAuthorized("admin"), createUser);
router.get("/all", isAuthenticated, isAuthorized("admin"), getAllUsers);
router.get("/:id", isAuthenticated, isAuthorized("admin"), getUserDetails);
router.put("/update/:id", isAuthenticated, isAuthorized("admin"), updateUser);
router.delete(
  "/delete/:id",
  isAuthenticated,
  isAuthorized("admin"),
  deleteUser
);

export default router;
```

---

## routes/product.route.js

```javascript
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Product API");
});

export default router;
```

---

## routes/inventory.route.js

```javascript
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Inventory API");
});

export default router;
```

---

## routes/auth.route.js

```javascript
import { Router } from "express";
import { login, logout, changePassword } from "../controllers/index.js";
import { isAuthenticated, isAuthorized } from "../middlewares/index.js";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Auth API");
});

router.post("/login", login);
router.get("/logout", isAuthenticated, logout);
router.post("/change-password", isAuthenticated, changePassword);

export default router;
```

---

## routes/alert.route.js

```javascript
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the alert API");
});

export default router;
```

---

## routes/location.route.js

```javascript
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Location API");
});

export default router;
```

---

## routes/assistant.route.js

```javascript
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Assistant API");
});

export default router;
```

---

## routes/forecast.route.js

```javascript
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the forecast API");
});

export default router;
```

---

## routes/health.route.js

```javascript
import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    },
  });
});

export default router;
```

---

_End of compiled SmartStock server codebase._
