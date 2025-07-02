# SmartStock Server: Complete Backend Documentation

---

## Overview

SmartStock is a modular inventory, sales, and logistics backend built with Node.js, Express, and MongoDB (Mongoose). It supports:

- Product, inventory, and batch management
- User, supplier, and transporter management
- Sales, returns, and transport tracking
- Role-based authentication and authorization
- Modular controllers, models, routes, and validators

---

## Architecture

- **Express.js** for HTTP API
- **Mongoose** for MongoDB ODM
- **Modular structure**: `controllers/`, `models/`, `routes/`, `middlewares/`, `validators/`, `utils/`
- **Role-based access**: Admin, Staff, Viewer, Supplier, Transporter
- **JWT authentication**
- **Validation**: `express-validator` and custom middleware
- **Error handling**: Centralized error and 404 middleware

---

## Main Files

- `app.js`: Express app, registers all routers, error handlers
- `server.js`: Starts server, connects to DB
- `createAdmin.js`: Script to bootstrap an admin user and warehouse
- `package.json`: Dependencies and scripts

---

## API Endpoints (Summary)

- `/api/v1/auth`: Login, logout, change password
- `/api/v1/user`: User CRUD, supplier/transporter creation
- `/api/v1/product`: Product CRUD
- `/api/v1/inventory`: Inventory supply, view, mark damaged
- `/api/v1/sales`: Record and view sales
- `/api/v1/return`: Record and view returns
- `/api/v1/transport`: Create and track transports
- `/api/v1/item`: Item-level operations
- `/api/v1/health`: Health check

---

## Models (Mongoose)

- **User**: Admin, staff, viewer; fields: fullName, email, password, phone, role, wage, status, assignedWarehouseId, etc.
- **Product**: productName, productImage, unit, manufacturer, category, sku, price, quantity, weight, dimension, thresholdLimit, shelfLifeDays, supplierIds, etc.
- **Batch**: batchNumber, productId, warehouseId, supplierId, quantity, mfgDate, expDate, condition, status
- **Inventory**: batchId, quantity, warehouseId
- **Item**: batchId, productId, serialNumber, currentWarehouseId, status, history
- **ExternalUser**: fullName, companyName, email, password, phone, role (supplier/transporter), status, warehouseId
- **Transport**: packageId, trackingNumber, transportCost, products, location, assignedTo, transportMode, status, timestamps
- **Warehouse**: warehouseName, capacity, unit, adminId, address, status
- **SalesHistory**: productId, batchId, warehouseId, quantity, saleDate, action, referenceItemIds, notes
- **Return**: productId, batchId, warehouseId, quantity, returnedBy, reason, referenceItemIds, returnDate
- **Wage**: userId, month, wageForMonth, hoursWorked, overTime, wagePerHour, totalPay, paidStatus, paidAt
- **IncomingSupply**: batchId, receivedBy, receivedAt, notes

---

## Controllers (Responsibilities)

- **auth.controller.js**: Login, logout, get user details, change password
- **user.controller.js**: User CRUD, get all users, get user by ID, update, delete
- **externalUser.controller.js**: Create supplier/transporter
- **product.controller.js**: Product CRUD, get all/by ID, update, delete
- **inventory.controller.js**: Add supply, view inventory, get by product, mark damaged
- **item.controller.js**: Get all items, by ID, by batch, update status
- **sales.controller.js**: Record sale, get all/by ID
- **return.controller.js**: Create return, get all/by ID
- **transport.controller.js**: Create transport, get all/by ID, update status

---

## Middlewares

- **auth.middleware.js**: JWT authentication, role-based authorization, canViewUserDetails
- **catch.async.errors.js**: Async error wrapper
- **error.handler.js**: Centralized error and 404 handler, custom ApiError class
- **validationErrors.middleware.js**: Formats and returns validation errors

---

## Validators

- **addSupply.validator.js**: Validates supply fields (productId, supplierId, warehouseId, quantity, mfgDate, expDate, notes)
- **authAndUser.validator.js**: Validates registration, login, password, user/supplier/transporter creation
- **productAndInventory.validators.js**: Validates product creation/update, inventory supply

---

## Utils

- **token/generate.token.js**: JWT token generation
- **email/send.email.js**: (placeholder for email sending)
- **email/email.template.js**: (placeholder for email templates)

---

## Route Documentation

See below for detailed API route documentation, payloads, and authentication requirements for each endpoint.

---

## Data Flow Example (Add Inventory Supply)

1. **POST `/inventory/add-supply`**
   - Validates payload (productId, supplierId, warehouseId, quantity, mfgDate, expDate)
   - Controller: Creates batch, logs supply, adds to inventory, creates items, updates product quantity/suppliers
   - Returns batchId, itemsCreated

---

## Error Handling

- All errors are handled by centralized middleware
- 404 handler for undefined routes
- Validation errors are formatted and returned with field-level messages

---

## Security

- JWT-based authentication
- Role-based access control for all sensitive endpoints
- Passwords hashed with bcrypt
- Input validation on all endpoints

---

## Extensibility

- Modular structure allows easy addition of new features (e.g., new roles, new modules)
- Validators and middlewares are reusable
- Models are normalized and support population for relational data

---

## For Full API Reference

See the detailed route documentation below and the `ROUTES_DOCUMENTATION.md` sections for each endpoint, including payloads, authentication, and expected responses.

---

_Last updated: 2 July 2025_

---

# API Routes Documentation (Detailed Payloads)

## Auth Routes (`/auth`)

### POST `/auth/login`

- **Description:** User login
- **Payload:**
  ```json
  {
    "email": "string (required, valid email)",
    "password": "string (required)"
  }
  ```
- **Auth:** None

### GET `/auth/logout`

- **Description:** User logout
- **Auth:** Authenticated

### POST `/auth/change-password`

- **Description:** Change password
- **Payload:**
  ```json
  {
    "oldPassword": "string (required)",
    "newPassword": "string (required, min 6 chars)"
  }
  ```
- **Auth:** Authenticated

---

## User Routes (`/user`)

### GET `/user/me`

- **Description:** Get current user details
- **Auth:** Authenticated

### POST `/user/create`

- **Description:** Create a new user
- **Payload:**
  ```json
  {
    "fullName": "string (required)",
    "email": "string (required, valid email)",
    "password": "string (required, min 6 chars)",
    "phone": "string (required, valid phone)",
    "role": "string (required, one of: staff, viewer)",
    "wage": "number (required)"
  }
  ```
- **Auth:** Admin only

### GET `/user/all`

- **Description:** Get all users
- **Auth:** Admin only

### GET `/user/:id`

- **Description:** Get user details by ID
- **Auth:** Authenticated, can view user details

### PUT `/user/update/:id`

- **Description:** Update user by ID
- **Auth:** Admin only

### DELETE `/user/delete/:id`

- **Description:** Delete user by ID
- **Auth:** Admin only

### POST `/user/create-supplier`

- **Description:** Create a supplier
- **Payload:**
  ```json
  {
    "fullName": "string (required)",
    "companyName": "string (required)",
    "email": "string (required, valid email)",
    "password": "string (required, min 6 chars)",
    "phone": "string (required, valid phone)",
    "warehouseId": "string (required, MongoId)"
  }
  ```
- **Auth:** Admin only

### POST `/user/create-transporter`

- **Description:** Create a transporter
- **Payload:**
  ```json
  {
    "fullName": "string (required)",
    "companyName": "string (required)",
    "email": "string (required, valid email)",
    "password": "string (required, min 6 chars)",
    "phone": "string (required, valid phone)",
    "warehouseId": "string (required, MongoId)"
  }
  ```
- **Auth:** Admin only

---

## Product Routes (`/product`)

### POST `/product/add`

- **Description:** Create a new product
- **Payload:**
  ```json
  {
    "productName": "string (required, min 3 chars)",
    "productImage": "string (required, valid URL)",
    "unit": "string (required)",
    "manufacturer": "string (required)",
    "productCategory": "string (required)",
    "sku": "string (required, min 3 chars)",
    "price": "number (required)",
    "weight": "number (optional)",
    "dimension": {
      "length": "number (required)",
      "breadth": "number (required)",
      "height": "number (required)"
    },
    "thresholdLimit": "number (optional)",
    "shelfLifeDays": "number (optional)"
  }
  ```
- **Auth:** Admin only

### GET `/product/all`

- **Description:** Get all products
- **Auth:** Admin, Staff

### GET `/product/:id`

- **Description:** Get product by ID
- **Auth:** Admin, Staff

### DELETE `/product/delete/:id`

- **Description:** Delete product by ID
- **Auth:** Admin only

### PUT `/product/update/:id`

- **Description:** Update product by ID
- **Payload:** (all fields optional, same as create)
- **Auth:** Admin only

---

## Inventory Routes (`/inventory`)

### POST `/inventory/add-supply`

- **Description:** Add inventory supply
- **Payload:**
  ```json
  {
    "productId": "string (required, MongoId)",
    "supplierId": "string (required, MongoId)",
    "warehouseId": "string (required, MongoId)",
    "quantity": "integer (required, min 1)",
    "mfgDate": "string (required, ISO8601 date)",
    "expDate": "string (required, ISO8601 date)",
    "notes": "string (optional)"
  }
  ```
- **Auth:** Authenticated

### GET `/inventory/all`

- **Description:** View all inventory
- **Auth:** Admin, Staff

### GET `/inventory/product/:productId`

- **Description:** Get inventory by product
- **Auth:** Admin, Staff

### POST `/inventory/mark-damaged`

- **Description:** Mark inventory as damaged
- **Payload:**
  - See controller for required fields (typically includes batch/item IDs and reason)
- **Auth:** Admin, Staff

---

## Sales Routes (`/sales`)

### POST `/sales/record`

- **Description:** Record a sale
- **Payload:**
  ```json
  {
    "productId": "string (required, MongoId)",
    "batchId": "string (optional, MongoId)",
    "warehouseId": "string (required, MongoId)",
    "quantity": "number (required)",
    "action": "string (required, one of: dispatched, returned)",
    "referenceItemIds": ["string (optional, MongoId)", ...],
    "notes": "string (optional)"
  }
  ```
- **Auth:** Admin, Staff

### GET `/sales/all`

- **Description:** Get all sales
- **Auth:** Admin, Staff

### GET `/sales/:id`

- **Description:** Get sale by ID
- **Auth:** Admin, Staff

---

## Return Routes (`/return`)

### POST `/return/`

- **Description:** Create a return
- **Payload:**
  ```json
  {
    "productId": "string (required, MongoId)",
    "batchId": "string (required, MongoId)",
    "warehouseId": "string (required, MongoId)",
    "quantity": "number (required)",
    "returnedBy": "string (required, MongoId)",
    "reason": "string (required)",
    "referenceItemIds": ["string (optional, MongoId)", ...]
  }
  ```
- **Auth:** None

### GET `/return/`

- **Description:** Get all returns
- **Auth:** None

### GET `/return/:id`

- **Description:** Get return by ID
- **Auth:** None

---

## Transport Routes (`/transport`)

### POST `/transport/create`

- **Description:** Create a transport
- **Payload:**
  ```json
  {
    "transportCost": "number (required)",
    "products": [
      {
        "batchId": "string (required, MongoId)",
        "quantity": "number (required)"
      }
    ],
    "location": "string (required)",
    "assignedTo": "string (required, MongoId)",
    "transportMode": "string (required)"
  }
  ```
- **Auth:** Admin, Staff

### GET `/transport/all`

- **Description:** Get all transports
- **Auth:** Admin, Staff

### PATCH `/transport/update/:id`

- **Description:** Update transport status
- **Payload:**
  - See controller for required fields (typically includes status and notes)
- **Auth:** Transporter only

---

## Item Routes (`/item`)

### GET `/item/all`

- **Description:** Get all items
- **Auth:** Admin, Staff

### GET `/item/:id`

- **Description:** Get item by ID
- **Auth:** Admin, Staff

### GET `/item/batch/:batchId`

- **Description:** Get items by batch
- **Auth:** Admin, Staff

### PUT `/item/update-status/:id`

- **Description:** Update item status
- **Payload:**
  ```json
  {
    "status": "string (required)",
    "notes": {
      "location": "string (optional)",
      "message": "string (optional)"
    }
  }
  ```
- **Auth:** Admin, Staff

---

## Health Route (`/health`)

### GET `/health/`

- **Description:** Health check
- **Auth:** None

---

_All GET routes do not require a payload. All IDs are MongoDB ObjectIds unless otherwise specified. For more details, refer to the validator files._
