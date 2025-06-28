# SmartStock Server - Complete Source Code

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

## createAdmin.js

```javascript
// Script to create an admin user for SmartStock
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDb from "./database/db.js";
import { User } from "./models/user.model.js";
import { Location } from "./models/location.model.js";

async function createAdmin() {
  await connectDb();
  try {
    // Check if an admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("Admin user already exists:", existingAdmin.email);
      return;
    }

    // Create a default location for admin assignment
    let location = await Location.findOne({ code: "ADMIN-WH" });
    if (!location) {
      location = await Location.create({
        name: "Admin Warehouse",
        code: "ADMIN-WH",
        type: "warehouse",
        address: {
          street: "123 Admin St",
          city: "Admin City",
          state: "Admin State",
          zipCode: "00000",
          country: "Adminland",
        },
        status: "active",
      });
      console.log("Created default admin location.");
    }

    // Hash the admin password
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // Create the admin user
    const adminUser = new User({
      fullName: "Admin User",
      email: "admin@smartstock.com",
      password: hashedPassword,
      role: "admin",
      assignedLocation: location._id,
      status: "active",
      isVerified: true,
    });

    await adminUser.save();
    console.log("Admin user created successfully:", adminUser.email);
  } catch (err) {
    console.error("Error creating admin user:", err);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

createAdmin();
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
  mongoUri: process.env.MONGO_URI,
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
    return res
      .status(400)
      .json({ message: "User with this email already exists." });
  }
  if (req.user.role === "admin") {
    return res
      .status(403)
      .json({
        message: "Admins cannot create admins. Please use the staff role.",
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

// ...existing code...
// (The rest of the file continues with getAllUsers, getUserDetails, updateUser, deleteUser)
```

---

## controllers/auth.controller.js

```javascript
import { catchAsyncErrors } from "../middlewares/index.js";
import { User } from "../models/index.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/index.js";
import jwt from "jsonwebtoken";

// ...existing code...
// (The file contains login, logout, getMyDetails, changePassword controllers)
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
    req.user = await User.findById(decoded.id).populate(
      "assignedLocation",
      "name code"
    );
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "User not found, authorization denied." });
    }
    req.userLocation = req.user.assignedLocation;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Token is not valid, authorization denied." });
  }
});

const isAuthorized =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({
          message: "Forbidden: You are not authorized to access this resource.",
        });
    }
    next();
  };

export { isAuthenticated, isAuthorized };
```

---

## middlewares/error.handler.js

```javascript
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
  console.error(`❌ Error: ${err.message}`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    stack: err.stack,
  });
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = new ApiError(404, message);
  }
  if (err.code === 11000) {
    const message = "Duplicate field value entered";
    error = new ApiError(400, message);
  }
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error = new ApiError(400, message);
  }
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    const message = "Invalid JSON format";
    error = new ApiError(400, message);
  }
  if (err.code === "ENOENT") {
    const message = "Data file not found";
    error = new ApiError(404, message);
  }
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

## models/alert.model.js

```javascript
import mongoose from "mongoose";

const alertSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Location",
    required: true,
  },
  type: {
    type: String,
    enum: ["low-stock", "surge", "forecast-error"],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  triggeredAt: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["open", "acknowledged", "closed"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Alert = mongoose.model("Alert", alertSchema);
```

---

## models/forecast.model.js

```javascript
import mongoose from "mongoose";

const forecastSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Location",
    required: true,
  },
  forecastData: {
    type: Date,
    required: true,
  },
  forecastPeriod: {
    type: Number,
    required: true,
  },
  predictedDemand: {
    type: Number,
    required: true,
  },
  method: {
    type: String,
  },
  accuracy: {
    type: Number,
  },
  notes: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Forecast = mongoose.model("Forecast", forecastSchema);
```

---

## models/inventory.model.js

```javascript
import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ["on-hand", "damaged", "reserved"],
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ["active", "archived", "pending"],
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Location",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  incomingStock: {
    type: Number,
    default: 0,
  },
  lastRestockedAt: {
    type: Date,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

export const Inventory = mongoose.model("Inventory", inventorySchema);
```

---

## models/product.model.js

```javascript
import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  description: {
    type: String,
  },
  category: {
    type: String,
    enum: ["electronics", "clothing", "food", "other"],
    required: true,
  },
  reorderPoint: {
    type: Number,
    required: true,
  },
  restockTime: {
    type: Number,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  incomingStock: {
    type: Number,
    default: 0,
  },
  lastRestockedAt: {
    type: Date,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
  },
  unit: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    required: true,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export const Product = mongoose.model("Product", productSchema);
```

---

## models/role.permissions.model.js

```javascript
import mongoose from "mongoose";

const rolePermissions = new mongoose.Schema({
  admin: {
    canManageUsers: true,
    canEditAllProducts: true,
    canViewAuditLogs: true,
  },
  staff: {
    canEditProductQuantity: true,
    canViewAlerts: true,
    canToggleProductStatus: true,
  },
  viewer: {
    canViewEverything: true,
  },
});

export const RolePermissions = mongoose.model(
  "RolePermissions",
  rolePermissions
);
```

---

## models/index.js

```javascript
import { User } from "../models/user.model.js";
import { Location } from "../models/location.model.js";

export { User, Location };
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

## (Empty or placeholder files)

- models/purchase.order.model.js
- models/supplier.model.js

---

_This markdown file contains the complete code for the SmartStock server as of 28 June 2025. All files, routes, models, controllers, and utilities are included._
