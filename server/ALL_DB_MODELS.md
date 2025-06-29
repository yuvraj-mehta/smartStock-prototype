# Database Models (Mongoose Schemas)

---

## `batch.model.js`

```javascript
import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    batchNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
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
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExternalUser",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    mfgDate: {
      type: Date,
      required: true,
    },
    expDate: {
      type: Date,
      required: true,
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    condition: {
      type: String,
      enum: ["new", "damaged", "expired"],
      default: "new",
    },
    status: {
      type: String,
      enum: ["active", "used", "expired"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const Batch = mongoose.model("Batch", batchSchema);
```

---

## `externalUsers.model.js`

```javascript
import mongoose from "mongoose";

const externalUserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  companyName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  rating: {
    type: Number,
    enum: [1, 2, 3, 4, 5],
  },
  role: {
    type: String,
    enum: ["supplier", "transporter"],
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "suspended"],
    default: "inactive",
  },
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Warehouse",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const ExternalUser = mongoose.model("ExternalUser", externalUserSchema);
```

---

## `incomingSupply.model.js`

```javascript
import mongoose from "mongoose";

const incomingSupplySchema = new mongoose.Schema({
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Batch",
    required: true,
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // staff/admin
  },
  receivedAt: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
  },
});

export const IncomingSupply = mongoose.model(
  "IncomingSupply",
  incomingSupplySchema
);
```

---

## `inventory.model.js`

```javascript
import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
  },
  { timestamps: true }
);

export const Inventory = mongoose.model("Inventory", inventorySchema);
```

---

## `item.model.js`

```javascript
import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    serialNumber: {
      type: String,
      unique: true,
      required: true,
    },
    currentWarehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
    },
    status: {
      type: String,
      enum: ["in_stock", "dispatched", "returned", "damaged"],
      default: "in_stock",
    },
    history: [
      {
        action: {
          type: String,
          enum: ["added", "dispatched", "returned", "transferred", "damaged"],
        },
        date: { type: Date, default: Date.now },
        location: { type: String },
        notes: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export const Item = mongoose.model("Item", itemSchema);
```

---

## `product.model.js`

```javascript
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    productImage: {
      type: String,
      required: true,
    },
    unit: {
      type: String,
      required: true,
    },
    manufacturer: {
      type: String,
    },
    productCategory: {
      type: String,
      enum: ["electronics", "apparel", "decor", "furniture"],
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
    },
    weight: {
      type: Number,
      default: 0,
    },
    dimension: {
      length: { type: Number, required: true },
      breadth: { type: Number, required: true },
      height: { type: Number, required: true },
    },
    volume: {
      type: Number,
      default: function () {
        return (
          this.dimension.length * this.dimension.breadth * this.dimension.height
        );
      },
    },
    thresholdLimit: {
      type: Number,
      required: true,
      default: 10,
    },
    restockRecommended: {
      type: Boolean,
      default: false,
    },
    shelfLifeDays: {
      type: Number,
      required: true,
    },
    batchNumber: {
      type: Number,
    },
    mfgDate: {
      type: Date,
      required: true,
    },
    expDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExternalUser",
    },
  },
  { timestamps: true }
); // Automatically adds createdAt and updatedAt

export const Product = mongoose.model("Product", productSchema);
```

---

## `transport.model.js`

```javascript
import mongoose from "mongoose";

const transportSchema = new mongoose.Schema({
  packageId: {
    type: String,
    required: true,
  },
  trackingNumber: {
    type: String,
    required: true,
    unique: true,
  },
  transportCost: {
    type: Number,
    required: true,
  },
  totalWeight: {
    type: Number,
    required: true,
  },
  totalVolume: {
    type: Number,
    required: true,
  },
  totalValue: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "dispatched", "intransit", "delivered", "returned"],
    required: true,
  },
  products: [
    {
      batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
    },
  ],
  location: {
    from: {
      type: String,
      required: true,
    },
    to: {
      type: String,
      required: true,
    },
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ExternalUser",
    required: true,
  },
  transportMode: {
    type: String,
    enum: ["land", "air", "ship"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  dispatchedAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export const Transport = mongoose.model("Transport", transportSchema);
```

---

## `user.model.js`

```javascript
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default:
        "https://media.istockphoto.com/id/1300845620/vector/user-icon-flat-isolated-on-white-background-user-symbol-vector-illustration.jpg?s=1024x1024&w=is&k=20&c=-mUWsTSENkugJ3qs5covpaj-bhYpxXY-v9RDpzsw504=",
    },
    role: {
      type: String,
      enum: ["admin", "staff", "viewer", "supplier", "transporter"],
      default: "viewer",
    },
    shift: {
      type: String,
      enum: ["morning", "afternoon", "night"],
    },
    wagePerHour: {
      type: Number,
      required: true,
      default: 0,
    },
    hoursThisMonth: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "inactive",
    },
    assignedWarehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordTokenExpires: {
      type: Date,
      default: null,
    },
    lastLogin: {
      type: Date,
    },
  },
  { timestamps: true }
); // automatically adds createdAt and updatedAt

export const User = mongoose.model("User", userSchema);
```

---

## `wage.model.js`

```javascript
import mongoose from "mongoose";

const wageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    month: {
      type: String, // e.g., "2025-06"
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    wageForMonth: {
      type: Number,
      required: true,
    },
    hoursWorked: {
      type: Number,
      required: true,
    },
    overTime: {
      type: Number,
      default: 0,
    },
    wagePerHour: {
      type: Number,
      required: true,
    },
    totalPay: {
      type: Number,
      required: true,
    },
    paidStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    paidAt: {
      type: Date,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

export const Wage = mongoose.model("Wage", wageSchema);
```

---

## `warehouse.model.js`

```javascript
import mongoose from "mongoose";

const warehouseSchema = new mongoose.Schema({
  warehouseName: { type: String },
  capacity: { type: Number, required: true },
  unit: { type: String, required: true }, // e.g., "kg", "liters", "pcs"
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipcode: { type: String, required: true },
    country: { type: String, required: true },
  },
  status: {
    type: String,
    enum: ["active", "inactive", "maintenance"],
    default: "active",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Warehouse = mongoose.model("Warehouse", warehouseSchema);
```

---
