# Compiled Pseudocode: Products, Inventory, Sales, and Returns

---

## Product-related Code

### Route: `routes/product.route.js`

```
- GET /:
  - Payload: None
  - Working: Returns a welcome message for the Product API.

- POST /add:
  - Payload: {
      productName, productImage, unit, manufacturer, productCategory, sku, price, weight, dimension, thresholdLimit, shelfLifeDays
    }
  - Working: Authenticated admin can add a new product. Validates input, checks for duplicate SKU, creates and saves product.

- GET /all:
  - Payload: None
  - Working: Authenticated admin/staff can get all products. Admins get all fields, staff get limited fields.

- GET /:id:
  - Payload: None (ID in URL param)
  - Working: Authenticated admin/staff can get product by ID. Admins get all fields, staff get limited fields.

- DELETE /delete/:id:
  - Payload: None (ID in URL param)
  - Working: Authenticated admin can delete product by ID. Returns deleted product or error if not found.

- PUT /update/:id:
  - Payload: Any updatable product fields (in body), ID in URL param
  - Working: Authenticated admin can update product. Updates only provided fields, saves and returns updated product.
```

### Model: `models/product.model.js`

```js
{
  productName: String (required),
  productImage: String (required),
  unit: String (required),
  manufacturer: String,
  productCategory: String (enum: electronics, apparel, decor, furniture),
  sku: String (required, unique, uppercase),
  price: Number (required),
  quantity: Number (required, default: 0),
  weight: Number (default: 0),
  dimension: {
    length: Number (required),
    breadth: Number (required),
    height: Number (required)
  },
  volume: Number (default: length * breadth * height),
  thresholdLimit: Number (required, default: 10),
  restockRecommended: Boolean (default: quantity <= thresholdLimit),
  shelfLifeDays: Number (required),
  batchNumber: Number,
  mfgDate: Date,
  expDate: Date,
  isActive: Boolean (default: false),
  supplierIds: [ObjectId (ref: ExternalUser)],
  createdAt: Date,
  updatedAt: Date
}
```

### Controller: `controllers/product.controller.js`

```
- createProduct:
  - If SKU exists, return error
  - Create and save new product
  - Return success response
- getProductById:
  - Find product by ID
  - If not found, return error
  - If not admin, return limited fields
  - Else, return full product
- getAllProducts:
  - If not admin, return limited fields for all products
  - Else, return all products
- deleteProductById:
  - Delete product by ID
  - Return success or error
- updateProductById:
  - Find product by ID
  - Update fields if provided
  - Save and return updated product
```

---

## Inventory-related Code

### Route: `routes/inventory.route.js`

```
- GET /:
  - Payload: None
  - Working: Returns a welcome message for the Inventory API.

- POST /add-supply:
  - Payload: {
      productId, supplierId, warehouseId, quantity, mfgDate, expDate, notes
    }
  - Working: Authenticated, validated. Adds supply to inventory, creates batch, logs supply, creates items, updates product quantity and suppliers.

- GET /all:
  - Payload: None
  - Working: Authenticated admin/staff can view all inventory. Returns inventory with populated product, supplier, and warehouse info.

- GET /product/:productId:
  - Payload: None (productId in URL param)
  - Working: Authenticated admin/staff can view inventory for a specific product. Returns filtered inventory entries.

- POST /mark-damaged:
  - Payload: {
      batchId, quantity, reason
    }
  - Working: Authenticated admin/staff. Reduces inventory, marks items as damaged, updates product quantity.
```

### Model: `models/inventory.model.js`

```js
{
  batchId: ObjectId (ref: Batch, required),
  quantity: Number (required, min: 0),
  warehouseId: ObjectId (ref: Warehouse, required),
  createdAt: Date,
  updatedAt: Date
}
```

### Controller: `controllers/inventory.controller.js`

```
- addInventorySupply:
  - Validate required fields
  - Find product
  - Create batch, log supply, add to inventory, create items
  - Update product quantity and suppliers
  - Return success
- viewInventory:
  - Find all inventory, populate related data
  - Return inventory list
- getInventoryByProduct:
  - Find inventory entries for product
  - Return filtered entries
- markDamagedInventory:
  - Find inventory by batch
  - Reduce quantity, update items to damaged, update product quantity
  - Return success
```

---

## Sales-related Code

### Model: `models/sales.history.model.js`

```js
{
  productId: ObjectId (ref: Product, required),
  batchId: ObjectId (ref: Batch),
  warehouseId: ObjectId (ref: Warehouse, required),
  quantity: Number (required, min: 1),
  saleDate: Date (default: now),
  action: String (enum: dispatched, returned, required),
  referenceItemIds: [ObjectId (ref: Item)],
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Controller: `controllers/sales.controller.js`

```
- recordSale:
  - Payload: {
      productId, batchId, warehouseId, quantity, action, referenceItemIds, notes
    }
  - Working: Validates fields and action, finds product/warehouse/batch, updates item statuses, creates sales history record.
- getAllSales:
  - Payload: None
  - Working: Finds and populates all sales records, returns list.
- getSaleById:
  - Payload: None (id in URL param)
  - Working: Finds and populates sales record by ID, returns record or error.
```

---

## Returns-related Code

### Route: `routes/return.route.js`

```
- POST /:
  - Payload: {
      productId, batchId, warehouseId, quantity, returnedBy, reason, referenceItemIds
    }
  - Working: Validates fields, finds product/batch, updates items, creates return record, logs in sales history.

- GET /:
  - Payload: None
  - Working: Returns all returns with populated product, batch, warehouse, user, and item info.

- GET /:id:
  - Payload: None (id in URL param)
  - Working: Returns return record by ID with populated info, or error if not found.
```

### Model: `models/returns.model.js`

```js
{
  productId: ObjectId (ref: Product, required),
  batchId: ObjectId (ref: Batch, required),
  warehouseId: ObjectId (ref: Warehouse, required),
  quantity: Number (required, min: 1),
  returnedBy: ObjectId (ref: User or ExternalUser),
  reason: String (required),
  referenceItemIds: [ObjectId (ref: Item)],
  returnDate: Date (default: now),
  createdAt: Date,
  updatedAt: Date
}
```

### Controller: `controllers/return.controller.js`

```
- createReturn:
  - Validate required fields
  - Find product and batch
  - Update items if referenceItemIds provided
  - Create return record
  - Log in sales history
  - Return success
- getAllReturns:
  - Find and populate all returns
  - Return list
- getReturnById:
  - Find and populate return by ID
  - Return record or error
```

---

## Usage in `app.js`

```
- Import routers for product, inventory, sales, return
- Register routers under /api/v1/ endpoints
```

---

## Summary

- All code related to products, inventory, sales, and returns is modularized into their respective models, controllers, and routes.
- These modules are registered in the main Express app (`app.js`) under `/api/v1/` endpoints.
- Business logic is separated from routing and data modeling for maintainability.
