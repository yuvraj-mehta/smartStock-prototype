# Product Management Improvements

## 1. Enhanced Product Model

```javascript
const productSchema = new mongoose.Schema({
  // Basic info
  name: { type: String, required: true },
  description: { type: String },
  sku: { type: String, required: true, unique: true },

  // Hierarchical categories
  categories: [
    {
      level: Number,
      name: String,
      id: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    },
  ],

  // Product variants
  variants: [
    {
      size: String,
      color: String,
      sku: String,
      price: Number,
      weight: Number,
      barcode: String,
    },
  ],

  // Enhanced inventory settings
  inventory: {
    trackInventory: { type: Boolean, default: true },
    allowBackorders: { type: Boolean, default: false },
    reorderPoint: { type: Number, default: 10 },
    reorderQuantity: { type: Number, default: 50 },
    maxStock: { type: Number, default: 1000 },
    safetyStock: { type: Number, default: 5 },
    leadTimeDays: { type: Number, default: 7 },
  },

  // Supplier information
  suppliers: [
    {
      supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
      supplierSku: String,
      cost: Number,
      leadTime: Number,
      minimumOrder: Number,
      isPrimary: { type: Boolean, default: false },
    },
  ],

  // Pricing and costs
  pricing: {
    cost: Number,
    wholesalePrice: Number,
    retailPrice: Number,
    salePrice: Number,
    margin: Number,
    taxable: { type: Boolean, default: true },
  },

  // Audit trail
  auditLog: [
    {
      action: String,
      changes: mongoose.Schema.Types.Mixed,
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      timestamp: { type: Date, default: Date.now },
    },
  ],

  // SEO and marketing
  seo: {
    title: String,
    description: String,
    keywords: [String],
    metaData: mongoose.Schema.Types.Mixed,
  },

  // Status and lifecycle
  status: {
    type: String,
    enum: ["draft", "active", "inactive", "discontinued"],
    default: "draft",
  },
  lifecycle: {
    launchDate: Date,
    discontinueDate: Date,
    seasonality: String,
  },
});
```

## 2. Category Management

```javascript
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
  level: { type: Number, default: 0 },
  path: [String], // For breadcrumbs
  attributes: [
    {
      name: String,
      type: { type: String, enum: ["text", "number", "boolean", "select"] },
      required: Boolean,
      options: [String],
    },
  ],
  isActive: { type: Boolean, default: true },
});
```

## 3. Product Bundling

- Create product bundles and kits
- Manage bundle inventory
- Dynamic pricing for bundles
- Bundle-specific promotions

## 4. Product Lifecycle Management

- Track product performance metrics
- Automated discontinuation workflows
- Seasonal product management
- New product introduction processes
