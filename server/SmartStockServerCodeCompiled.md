# SmartStock Backend Server - Complete Source Code

---

## Root Files

### `app.js`

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
import itemRouter from "./routes/item.route.js";
import transportRouter from "./routes/transport.route.js";
import healthRouter from "./routes/health.route.js";

app.use(cors(corsConfig));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/health", healthRouter);
app.use("/api/v1/product", productRouter);
app.use("/api/v1/inventory", inventoryRouter);
app.use("/api/v1/item", itemRouter);
app.use("/api/v1/transport", transportRouter);

// 404 handler for undefined routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;
```

### `server.js`

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

### `package.json`

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
    "express-validator": "^7.2.1",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.16.0",
    "nodemailer": "^7.0.3",
    "nodemon": "^3.1.10",
    "uuid": "^11.1.0"
  }
}
```

### `createAdmin.js`

```javascript
// Script to create an admin user for SmartStock
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDb from "./database/db.js";
import { User } from "./models/user.model.js";
import { Warehouse } from "./models/warehouse.model.js";

async function createAdmin() {
  await connectDb();
  try {
    // Check if an admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("Admin user already exists:", existingAdmin.email);
      return;
    }

    // Hash the admin password
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // Create the admin user
    const adminUser = new User({
      fullName: "Admin User",
      email: "admin@smartstock.com",
      password: hashedPassword,
      role: "admin",
      phone: "0000000000",
      wagePerHour: 0,
      status: "active",
      isVerified: true,
    });
    await adminUser.save();

    // Create a default warehouse for admin assignment
    let warehouse = await Warehouse.findOne({
      warehouseName: "Admin Warehouse",
    });
    if (!warehouse) {
      warehouse = await Warehouse.create({
        warehouseName: "Admin Warehouse",
        capacity: 10000,
        unit: "pcs",
        adminId: adminUser._id,
        address: {
          street: "123 Admin St",
          city: "Admin City",
          state: "Admin State",
          zipcode: "00000",
          country: "Adminland",
        },
        status: "active",
      });
      console.log("Created default admin warehouse.");
    }

    // Assign warehouse to admin user
    adminUser.assignedWarehouseId = warehouse._id;
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

## config/

### `config.js`

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

## controllers/

### `auth.controller.js`

```javascript
import { catchAsyncErrors } from "../middlewares/index.js";
import { User } from "../models/index.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/index.js";
import jwt from "jsonwebtoken";

// Register a new user
const register = catchAsyncErrors(async (req, res) => {
  const { fullName, email, password, role, phone } = req.body;

  // Check if user already exists
  let user = await User.findOne({ email });
  if (user) {
    return res.status(400).json({ message: "User already exists" });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create a new user
  user = new User({
    fullName,
    email,
    password: hashedPassword,
    role,
    phone,
  });
  await user.save();

  // Generate a token
  const token = generateToken(user._id);

  res.status(201).json({ user: { id: user._id, email: user.email }, token });
});

// Login user
const login = catchAsyncErrors(async (req, res) => {
  const { email, password } = req.body;

  // Check if user exists
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  // Check if password matches
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  // Generate a token
  const token = generateToken(user._id);

  res.json({ user: { id: user._id, email: user.email }, token });
});

// Logout user
const logout = catchAsyncErrors(async (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully" });
});

// Get my details
const getMyDetails = catchAsyncErrors(async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json({ user });
});

// Change password
const changePassword = catchAsyncErrors(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  // Check if the old password matches
  const user = await User.findById(req.user.id);
  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isOldPasswordValid) {
    return res.status(400).json({ message: "Old password is incorrect" });
  }

  // Hash the new password and update
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  res.json({ message: "Password changed successfully" });
});

export { login, logout, getMyDetails, changePassword };
```

### `externalUser.controller.js`

```javascript
import { catchAsyncErrors } from "../middlewares/index.js";
import { ExternalUser } from "../models/externalUsers.model.js";
import bcrypt from "bcryptjs";

// Create a transporter
const createTransporter = catchAsyncErrors(async (req, res) => {
  const { name, email, phone, password } = req.body;

  // Check if transporter already exists
  let transporter = await ExternalUser.findOne({ email });
  if (transporter) {
    return res.status(400).json({ message: "Transporter already exists" });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create a new transporter
  transporter = new ExternalUser({
    name,
    email,
    phone,
    password: hashedPassword,
    role: "transporter",
  });
  await transporter.save();

  res.status(201).json({ message: "Transporter created successfully" });
});

// Create a supplier
const createSupplier = catchAsyncErrors(async (req, res) => {
  const { name, email, phone, password } = req.body;

  // Check if supplier already exists
  let supplier = await ExternalUser.findOne({ email });
  if (supplier) {
    return res.status(400).json({ message: "Supplier already exists" });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create a new supplier
  supplier = new ExternalUser({
    name,
    email,
    phone,
    password: hashedPassword,
    role: "supplier",
  });
  await supplier.save();

  res.status(201).json({ message: "Supplier created successfully" });
});

export { createTransporter, createSupplier };
```

### `index.js`

```javascript
export {
  login,
  logout,
  getMyDetails,
  changePassword,
} from "./auth.controller.js";
export {
  createTransporter,
  createSupplier,
} from "./externalUser.controller.js";
export {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
} from "./item.controller.js";
export {
  getAllInventories,
  getInventoryById,
  createInventory,
  updateInventory,
  deleteInventory,
} from "./inventory.controller.js";
export {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "./product.controller.js";
export {
  createTransport,
  getAllTransports,
  getTransportById,
  updateTransport,
  deleteTransport,
} from "./transport.controller.js";
export {
  createUser,
  getAllUsers,
  getUserDetails,
  updateUser,
  deleteUser,
} from "./user.controller.js";
```

### `inventory.controller.js`

```javascript
import {
  Batch,
  Inventory,
  IncomingSupply,
  Item,
  Product,
  Transport,
} from "../models/index.js";
import { v4 as uuidv4 } from "uuid";
import { catchAsyncErrors } from "../middlewares/index.js";

// Create a new inventory
const createInventory = catchAsyncErrors(async (req, res) => {
  const { productId, quantity, batchId } = req.body;

  // Create a new inventory record
  const inventory = new Inventory({
    productId,
    quantity,
    batchId,
    status: "active",
  });
  await inventory.save();

  res.status(201).json({ message: "Inventory created successfully" });
});

// Get all inventories
const getAllInventories = catchAsyncErrors(async (req, res) => {
  const inventories = await Inventory.find()
    .populate("productId")
    .populate("batchId");
  res.json({ inventories });
});

// Get inventory by ID
const getInventoryById = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const inventory = await Inventory.findById(id)
    .populate("productId")
    .populate("batchId");
  if (!inventory) {
    return res.status(404).json({ message: "Inventory not found" });
  }
  res.json({ inventory });
});

// Update inventory
const updateInventory = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const { quantity, batchId } = req.body;

  // Update the inventory record
  const inventory = await Inventory.findByIdAndUpdate(
    id,
    { quantity, batchId },
    { new: true }
  );
  if (!inventory) {
    return res.status(404).json({ message: "Inventory not found" });
  }

  res.json({ message: "Inventory updated successfully", inventory });
});

// Delete inventory
const deleteInventory = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;

  // Delete the inventory record
  const inventory = await Inventory.findByIdAndDelete(id);
  if (!inventory) {
    return res.status(404).json({ message: "Inventory not found" });
  }

  res.json({ message: "Inventory deleted successfully" });
});

export {
  createInventory,
  getAllInventories,
  getInventoryById,
  updateInventory,
  deleteInventory,
};
```

### `item.controller.js`

```javascript
import { Item } from "../models/item.model.js";
import { catchAsyncErrors } from "../middlewares/index.js";

// Create a new item
const createItem = catchAsyncErrors(async (req, res) => {
  const { name, description, productId, warehouseId, quantity } = req.body;

  // Create a new item
  const item = new Item({
    name,
    description,
    productId,
    warehouseId,
    quantity,
    status: "active",
  });
  await item.save();

  res.status(201).json({ message: "Item created successfully" });
});

// Get all items
const getAllItems = catchAsyncErrors(async (req, res) => {
  const items = await Item.find().populate("productId").populate("warehouseId");
  res.json({ items });
});

// Get item by ID
const getItemById = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const item = await Item.findById(id)
    .populate("productId")
    .populate("warehouseId");
  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }
  res.json({ item });
});

// Update item
const updateItem = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const { name, description, productId, warehouseId, quantity } = req.body;

  // Update the item
  const item = await Item.findByIdAndUpdate(
    id,
    { name, description, productId, warehouseId, quantity },
    { new: true }
  );
  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  res.json({ message: "Item updated successfully", item });
});

// Delete item
const deleteItem = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;

  // Delete the item
  const item = await Item.findByIdAndDelete(id);
  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  res.json({ message: "Item deleted successfully" });
});

export { createItem, getAllItems, getItemById, updateItem, deleteItem };
```

### `product.controller.js`

```javascript
import { catchAsyncErrors } from "../middlewares/index.js";
import { Product } from "../models/product.model.js";

// Create a new product
const createProduct = catchAsyncErrors(async (req, res) => {
  const { name, description, price, category, image } = req.body;

  // Create a new product
  const product = new Product({
    name,
    description,
    price,
    category,
    image,
    status: "active",
  });
  await product.save();

  res.status(201).json({ message: "Product created successfully" });
});

// Get all products
const getAllProducts = catchAsyncErrors(async (req, res) => {
  const products = await Product.find();
  res.json({ products });
});

// Get product by ID
const getProductById = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  res.json({ product });
});

// Update product
const updateProduct = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const { name, description, price, category, image } = req.body;

  // Update the product
  const product = await Product.findByIdAndUpdate(
    id,
    { name, description, price, category, image },
    { new: true }
  );
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json({ message: "Product updated successfully", product });
});

// Delete product
const deleteProduct = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;

  // Delete the product
  const product = await Product.findByIdAndDelete(id);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json({ message: "Product deleted successfully" });
});

export {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
```

### `transport.controller.js`

```javascript
import { v4 as uuidv4 } from "uuid";
import { catchAsyncErrors } from "../middlewares/index.js";
import { Transport } from "../models/transport.model.js";
import { Inventory } from "../models/inventory.model.js";
import { Item } from "../models/item.model.js";
import { Batch } from "../models/batch.model.js";

// Create a new transport
const createTransport = catchAsyncErrors(async (req, res) => {
  const { from, to, itemId, quantity, transportDate } = req.body;

  // Create a new transport
  const transport = new Transport({
    from,
    to,
    itemId,
    quantity,
    transportDate,
    status: "active",
  });
  await transport.save();

  res.status(201).json({ message: "Transport created successfully" });
});

// Get all transports
const getAllTransports = catchAsyncErrors(async (req, res) => {
  const transports = await Transport.find().populate("itemId");
  res.json({ transports });
});

// Get transport by ID
const getTransportById = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const transport = await Transport.findById(id).populate("itemId");
  if (!transport) {
    return res.status(404).json({ message: "Transport not found" });
  }
  res.json({ transport });
});

// Update transport
const updateTransport = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const { from, to, itemId, quantity, transportDate } = req.body;

  // Update the transport
  const transport = await Transport.findByIdAndUpdate(
    id,
    { from, to, itemId, quantity, transportDate },
    { new: true }
  );
  if (!transport) {
    return res.status(404).json({ message: "Transport not found" });
  }

  res.json({ message: "Transport updated successfully", transport });
});

// Delete transport
const deleteTransport = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;

  // Delete the transport
  const transport = await Transport.findByIdAndDelete(id);
  if (!transport) {
    return res.status(404).json({ message: "Transport not found" });
  }

  res.json({ message: "Transport deleted successfully" });
});

export {
  createTransport,
  getAllTransports,
  getTransportById,
  updateTransport,
  deleteTransport,
};
```

### `user.controller.js`

```javascript
import { catchAsyncErrors } from "../middlewares/index.js";
import { User } from "../models/index.js";
import { ExternalUser } from "../models/externalUsers.model.js";
import bcrypt from "bcryptjs";

// Create a new user
const createUser = catchAsyncErrors(async (req, res) => {
  const { fullName, email, password, role, phone } = req.body;

  // Check if user already exists
  let user = await User.findOne({ email });
  if (user) {
    return res.status(400).json({ message: "User already exists" });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create a new user
  user = new User({
    fullName,
    email,
    password: hashedPassword,
    role,
    phone,
  });
  await user.save();

  res.status(201).json({ message: "User created successfully" });
});

// Get all users
const getAllUsers = catchAsyncErrors(async (req, res) => {
  const users = await User.find();
  res.json({ users });
});

// Get user details
const getUserDetails = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json({ user });
});

// Update user
const updateUser = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const { fullName, email, password, role, phone } = req.body;

  // Update the user
  const user = await User.findByIdAndUpdate(
    id,
    { fullName, email, password, role, phone },
    { new: true }
  );
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ message: "User updated successfully", user });
});

// Delete user
const deleteUser = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;

  // Delete the user
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({ message: "User deleted successfully" });
});

export { createUser, getAllUsers, getUserDetails, updateUser, deleteUser };
```

---

## database/

### `db.js`

```javascript
import mongoose from "mongoose";
import { conf } from "../config/config.js";

const connectDb = async () => {
  try {
    await mongoose.connect(conf.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDb;
```

---

## middlewares/

### `index.js`

```javascript
export { catchAsyncErrors } from "./catch.async.errors.js";
export { asyncHandler } from "./async.handler.js";
export {
  isAuthenticated,
  isAuthorized,
  canViewUserDetails,
} from "./auth.middleware.js";
```

### `async.handler.js`

```javascript
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

### `auth.middleware.js`

```javascript
import { catchAsyncErrors } from "./index.js";
import jwt from "jsonwebtoken";
import { conf } from "../config/config.js";
import { User } from "../models/index.js";

const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Verify the token
  const decoded = jwt.verify(token, conf.jwtSecret);
  req.user = await User.findById(decoded.id);

  next();
});

const isAuthorized = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};

const canViewUserDetails = catchAsyncErrors(async (req, res, next) => {
  const { id } = req.params;
  if (req.user.role !== "admin" && req.user.id !== id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
});

export { isAuthenticated, isAuthorized, canViewUserDetails };
```

### `catch.async.errors.js`

```javascript
export const catchAsyncErrors = (theFunction) => {
  return (req, res, next) => {
    Promise.resolve(theFunction(req, res, next)).catch(next);
  };
};
```

### `error.handler.js`

```javascript
/**
 * Error Handler Middleware
 * Centralized error handling for the API
 */

import { ApiError } from "../utils/error.util.js";

// Not found handler
const notFound = (req, res, next) => {
  next(new ApiError(404, "Resource not found"));
};

// Error handler
const errorHandler = (err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
  });
};

export { ApiError, errorHandler, notFound };
```

### `validationErrors.middleware.js`

```javascript
import { validationResult } from "express-validator";

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export default handleValidationErrors;
```

---

## models/

### `batch.model.js`

```javascript
import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    batchNumber: { type: String, required: true, unique: true },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: { type: Number, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export const Batch = mongoose.model("Batch", batchSchema);
```

### `externalUsers.model.js`

```javascript
import mongoose from "mongoose";

const externalUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["transporter", "supplier"], required: true },
  },
  { timestamps: true }
);

export const ExternalUser = mongoose.model("ExternalUser", externalUserSchema);
```

### `incomingSupply.model.js`

```javascript
import mongoose from "mongoose";

const incomingSupplySchema = new mongoose.Schema(
  {
    supplyOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SupplyOrder",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: { type: Number, required: true },
    status: { type: String, enum: ["pending", "received"], default: "pending" },
  },
  { timestamps: true }
);

export const IncomingSupply = mongoose.model(
  "IncomingSupply",
  incomingSupplySchema
);
```

### `inventory.model.js`

```javascript
import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: { type: Number, required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export const Inventory = mongoose.model("Inventory", inventorySchema);
```

### `item.model.js`

```javascript
import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    quantity: { type: Number, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export const Item = mongoose.model("Item", itemSchema);
```

### `product.model.js`

```javascript
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    category: { type: String },
    image: { type: String },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);
```

### `transport.model.js`

```javascript
import mongoose from "mongoose";

const transportSchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    quantity: { type: Number, required: true },
    transportDate: { type: Date, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export const Transport = mongoose.model("Transport", transportSchema);
```

### `user.model.js`

```javascript
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "user"], default: "user" },
    phone: { type: String },
    wagePerHour: { type: Number },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    isVerified: { type: Boolean, default: false },
    assignedWarehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
```

### `wage.model.js`

```javascript
import mongoose from "mongoose";

const wageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

export const Wage = mongoose.model("Wage", wageSchema);
```

### `warehouse.model.js`

```javascript
import mongoose from "mongoose";

const warehouseSchema = new mongoose.Schema(
  {
    warehouseName: { type: String, required: true },
    capacity: { type: Number, required: true },
    unit: { type: String, required: true },
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zipcode: { type: String },
      country: { type: String },
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

export const Warehouse = mongoose.model("Warehouse", warehouseSchema);
```

### `index.js`

```javascript
export { Batch } from "./batch.model.js";
export { ExternalUser } from "./externalUsers.model.js";
export { IncomingSupply } from "./incomingSupply.model.js";
export { Inventory } from "./inventory.model.js";
export { Item } from "./item.model.js";
export { Product } from "./product.model.js";
export { Transport } from "./transport.model.js";
export { User } from "./user.model.js";
export { Wage } from "./wage.model.js";
export { Warehouse } from "./warehouse.model.js";
```

---

## routes/

### `auth.route.js`

```javascript
import { Router } from "express";
import {
  login,
  logout,
  register,
  getMyDetails,
  changePassword,
} from "../controllers/index.js";
import { isAuthenticated } from "../middlewares/index.js";

const router = Router();

// Login route
router.post("/login", login);

// Logout route
router.post("/logout", logout);

// Register route
router.post("/register", register);

// Get my details route
router.get("/me", isAuthenticated, getMyDetails);

// Change password route
router.put("/change-password", isAuthenticated, changePassword);

export default router;
```

### `health.route.js`

```javascript
import { Router } from "express";

const router = Router();

// Health check route
router.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

export default router;
```

### `inventory.route.js`

```javascript
import { Router } from "express";
import {
  createInventory,
  getAllInventories,
  getInventoryById,
  updateInventory,
  deleteInventory,
} from "../controllers/index.js";
import { isAuthenticated, isAuthorized } from "../middlewares/index.js";

const router = Router();

// Create inventory route
router.post("/", isAuthenticated, isAuthorized(["admin"]), createInventory);

// Get all inventories route
router.get("/", isAuthenticated, getAllInventories);

// Get inventory by ID route
router.get("/:id", isAuthenticated, getInventoryById);

// Update inventory route
router.put("/:id", isAuthenticated, isAuthorized(["admin"]), updateInventory);

// Delete inventory route
router.delete(
  "/:id",
  isAuthenticated,
  isAuthorized(["admin"]),
  deleteInventory
);

export default router;
```

### `item.route.js`

```javascript
import express from "express";
import {
  createItem,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem,
} from "../controllers/index.js";
import { isAuthenticated, isAuthorized } from "../middlewares/index.js";

const router = express.Router();

// Create a new item
router.post("/", isAuthenticated, isAuthorized(["admin"]), createItem);

// Get all items
router.get("/", isAuthenticated, getAllItems);

// Get item by ID
router.get("/:id", isAuthenticated, getItemById);

// Update item
router.put("/:id", isAuthenticated, isAuthorized(["admin"]), updateItem);

// Delete item
router.delete("/:id", isAuthenticated, isAuthorized(["admin"]), deleteItem);

export default router;
```

### `product.route.js`

```javascript
import { Router } from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/index.js";
import { isAuthenticated, isAuthorized } from "../middlewares/index.js";

const router = Router();

// Create product route
router.post("/", isAuthenticated, isAuthorized(["admin"]), createProduct);

// Get all products route
router.get("/", isAuthenticated, getAllProducts);

// Get product by ID route
router.get("/:id", isAuthenticated, getProductById);

// Update product route
router.put("/:id", isAuthenticated, isAuthorized(["admin"]), updateProduct);

// Delete product route
router.delete("/:id", isAuthenticated, isAuthorized(["admin"]), deleteProduct);

export default router;
```

### `transport.route.js`

```javascript
import { Router } from "express";
import {
  createTransport,
  getAllTransports,
  getTransportById,
  updateTransport,
  deleteTransport,
} from "../controllers/index.js";
import { isAuthenticated, isAuthorized } from "../middlewares/index.js";

const router = Router();

// Create transport route
router.post("/", isAuthenticated, isAuthorized(["admin"]), createTransport);

// Get all transports route
router.get("/", isAuthenticated, getAllTransports);

// Get transport by ID route
router.get("/:id", isAuthenticated, getTransportById);

// Update transport route
router.put("/:id", isAuthenticated, isAuthorized(["admin"]), updateTransport);

// Delete transport route
router.delete(
  "/:id",
  isAuthenticated,
  isAuthorized(["admin"]),
  deleteTransport
);

export default router;
```

### `user.route.js`

```javascript
import { Router } from "express";
import {
  createUser,
  getAllUsers,
  getUserDetails,
  updateUser,
  deleteUser,
} from "../controllers/index.js";
import { isAuthenticated, isAuthorized } from "../middlewares/index.js";

const router = Router();

// Create user route
router.post("/", isAuthenticated, isAuthorized(["admin"]), createUser);

// Get all users route
router.get("/", isAuthenticated, getAllUsers);

// Get user details route
router.get("/:id", isAuthenticated, getUserDetails);

// Update user route
router.put("/:id", isAuthenticated, isAuthorized(["admin"]), updateUser);

// Delete user route
router.delete("/:id", isAuthenticated, isAuthorized(["admin"]), deleteUser);

export default router;
```

---

## utils/

### `index.js`

```javascript
export { generateToken } from "./token/generate.token.js";
```

### `email/email.template.js`

```javascript
// (empty)
```

### `email/send.email.js`

```javascript
// (empty)
```

### `token/generate.token.js`

```javascript
import jwt from "jsonwebtoken";
import { conf } from "../../config/config.js";

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, conf.jwtSecret, {
    expiresIn: conf.jwtExpiration,
  });
};
```

---

## validators/

### `addSupply.validator.js`

```javascript
import { body } from "express-validator";

export const addSupplyValidator = [
  body("productId").notEmpty().withMessage("Product ID is required"),
  body("quantity").isNumeric().withMessage("Quantity must be a number"),
  body("batchId").optional().isMongoId().withMessage("Invalid batch ID"),
];
```

### `authAndUser.validator.js`

```javascript
import { body } from "express-validator";

export const registerValidator = [
  body("fullName").notEmpty().withMessage("Full name is required"),
  body("email").isEmail().withMessage("Invalid email address"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("role").optional().isIn(["admin", "user"]).withMessage("Invalid role"),
  body("phone").optional().isMobilePhone().withMessage("Invalid phone number"),
];

export const loginValidator = [
  body("email").isEmail().withMessage("Invalid email address"),
  body("password").notEmpty().withMessage("Password is required"),
];
```

### `productAndInventory.validators.js`

```javascript
import { body } from "express-validator";

export const createProductValidator = [
  body("name").notEmpty().withMessage("Product name is required"),
  body("description").optional().isString().withMessage("Invalid description"),
  body("price").isNumeric().withMessage("Price must be a number"),
  body("category").optional().isString().withMessage("Invalid category"),
  body("image").optional().isString().withMessage("Invalid image URL"),
];

export const updateProductValidator = [
  body("name")
    .optional()
    .notEmpty()
    .withMessage("Product name cannot be empty"),
  body("description").optional().isString().withMessage("Invalid description"),
  body("price").optional().isNumeric().withMessage("Price must be a number"),
  body("category").optional().isString().withMessage("Invalid category"),
  body("image").optional().isString().withMessage("Invalid image URL"),
];
```
