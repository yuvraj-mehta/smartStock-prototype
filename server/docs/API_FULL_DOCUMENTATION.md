# SmartStock API Documentation

## Overview

SmartStock is an inventory and supply chain management system designed to streamline warehouse, product, and user operations. This documentation provides a comprehensive guide to all API endpoints and data models, including request/response payloads, authentication requirements, and model relationships.

---

## Table of Contents

1. [Project Overview](#overview)
2. [Data Models](#data-models)
    - [Batch](#batch)
    - [ExternalUser](#externaluser)
    - [IncomingSupply](#incomingsupply)
    - [Inventory](#inventory)
    - [Item](#item)
    - [Product](#product)
    - [Transport](#transport)
    - [User](#user)
    - [Wage](#wage)
    - [Warehouse](#warehouse)
3. [API Endpoints](#api-endpoints)
    - [Auth Routes](#auth-routes)
    - [Health Routes](#health-routes)
    - [Inventory Routes](#inventory-routes)
    - [Item Routes](#item-routes)
    - [Product Routes](#product-routes)
    - [Transport Routes](#transport-routes)
    - [User Routes](#user-routes)
4. [Error Handling](#error-handling)
5. [Authentication & Authorization](#authentication--authorization)
6. [Appendix: Example Payloads](#appendix-example-payloads)

---

## Batch Model

The `Batch` model represents a batch of products received from a supplier and stored in a warehouse. Each batch is linked to a product, warehouse, and supplier (external user).

| Field         | Type      | Required | Unique | Description                                      |
|-------------- |---------- |--------- |--------|--------------------------------------------------|
| batchNumber   | String    | Yes      | Yes    | Unique identifier for the batch                  |
| productId     | ObjectId  | Yes      | No     | Reference to the Product                         |
| warehouseId   | ObjectId  | Yes      | No     | Reference to the Warehouse                       |
| supplierId    | ObjectId  | Yes      | No     | Reference to the ExternalUser (supplier)         |
| quantity      | Number    | Yes      | No     | Quantity of product in the batch                 |
| mfgDate       | Date      | Yes      | No     | Manufacturing date                               |
| expDate       | Date      | Yes      | No     | Expiry date                                      |
| receivedAt    | Date      | No       | No     | Date batch was received (default: now)           |
| condition     | String    | No       | No     | Batch condition: 'new', 'damaged', 'expired'     |
| status        | String    | No       | No     | Batch status: 'active', 'used', 'expired'        |
| createdAt     | Date      | No       | No     | Timestamp (auto-generated)                       |
| updatedAt     | Date      | No       | No     | Timestamp (auto-generated)                       |

### Relationships
- `productId` → [Product](#product)
- `warehouseId` → [Warehouse](#warehouse)
- `supplierId` → [ExternalUser](#externaluser)

### Example JSON
```json
{
  "batchNumber": "BATCH-20250701-001",
  "productId": "60f7c2b8e1d2c8a1b4e8a123",
  "warehouseId": "60f7c2b8e1d2c8a1b4e8a456",
  "supplierId": "60f7c2b8e1d2c8a1b4e8a789",
  "quantity": 100,
  "mfgDate": "2025-06-01T00:00:00.000Z",
  "expDate": "2026-06-01T00:00:00.000Z",
  "receivedAt": "2025-07-01T10:00:00.000Z",
  "condition": "new",
  "status": "active"
}
```

---

## ExternalUser Model

The `ExternalUser` model represents suppliers and transporters who interact with the system externally. Each external user can be linked to a warehouse and has a role, status, and contact information.

| Field        | Type      | Required | Unique | Description                                      |
|--------------|---------- |--------- |--------|--------------------------------------------------|
| fullName     | String    | Yes      | No     | Full name of the external user                   |
| companyName  | String    | Yes      | No     | Company name                                     |
| email        | String    | Yes      | Yes    | Email address (used for login)                   |
| password     | String    | Yes      | No     | Hashed password                                  |
| phone        | String    | Yes      | No     | Contact phone number                             |
| rating       | Number    | No       | No     | User rating (1-5)                                |
| role         | String    | Yes      | No     | 'supplier' or 'transporter'                      |
| status       | String    | No       | No     | 'active', 'inactive', or 'suspended'             |
| warehouseId  | ObjectId  | No       | No     | Reference to the Warehouse                       |
| createdAt    | Date      | No       | No     | Timestamp (auto-generated)                       |
| updatedAt    | Date      | No       | No     | Timestamp (auto-generated)                       |

### Relationships
- `warehouseId` → [Warehouse](#warehouse)

### Example JSON
```json
{
  "fullName": "John Doe",
  "companyName": "Acme Supplies",
  "email": "john.doe@acme.com",
  "password": "<hashed_password>",
  "phone": "+1234567890",
  "rating": 5,
  "role": "supplier",
  "status": "active",
  "warehouseId": "60f7c2b8e1d2c8a1b4e8a456"
}
```

---

## Product Model

The `Product` model represents an item that can be stored, tracked, and managed in the inventory system. It includes details about the product, its dimensions, pricing, stock, and supplier relationships.

| Field              | Type      | Required | Unique | Description                                                      |
|--------------------|---------- |--------- |--------|------------------------------------------------------------------|
| productName        | String    | Yes      | No     | Name of the product                                              |
| productImage       | String    | Yes      | No     | URL or path to the product image                                 |
| unit               | String    | Yes      | No     | Unit of measurement (e.g., kg, pcs)                              |
| manufacturer       | String    | No       | No     | Manufacturer name                                                |
| productCategory    | String    | No       | No     | Category: 'electronics', 'apparel', 'decor', 'furniture'         |
| sku                | String    | Yes      | Yes    | Stock Keeping Unit (unique identifier)                           |
| price              | Number    | Yes      | No     | Price per unit                                                   |
| quantity           | Number    | Yes      | No     | Current stock quantity                                           |
| weight             | Number    | No       | No     | Weight of the product                                            |
| dimension          | Object    | Yes      | No     | Dimensions: length, breadth, height (all required)               |
| volume             | Number    | No       | No     | Calculated: length × breadth × height                            |
| thresholdLimit     | Number    | Yes      | No     | Minimum stock before restock is recommended                      |
| restockRecommended | Boolean   | No       | No     | True if quantity ≤ thresholdLimit                                |
| shelfLifeDays      | Number    | Yes      | No     | Shelf life in days                                               |
| batchNumber        | Number    | No       | No     | Batch number (if applicable)                                     |
| mfgDate            | Date      | No       | No     | Manufacturing date                                               |
| expDate            | Date      | No       | No     | Expiry date                                                      |
| isActive           | Boolean   | No       | No     | Whether the product is active                                    |
| supplierIds        | [ObjectId]| No       | No     | Array of references to ExternalUser (suppliers)                  |
| createdAt          | Date      | No       | No     | Timestamp (auto-generated)                                       |
| updatedAt          | Date      | No       | No     | Timestamp (auto-generated)                                       |

### Relationships
- `supplierIds` → [ExternalUser](#externaluser) (array)

### Example JSON
```json
{
  "productName": "LED TV 42-inch",
  "productImage": "https://example.com/images/ledtv42.jpg",
  "unit": "pcs",
  "manufacturer": "Acme Electronics",
  "productCategory": "electronics",
  "sku": "TV42ACME2025",
  "price": 299.99,
  "quantity": 50,
  "weight": 8.5,
  "dimension": { "length": 95, "breadth": 10, "height": 60 },
  "volume": 57000,
  "thresholdLimit": 10,
  "restockRecommended": false,
  "shelfLifeDays": 730,
  "batchNumber": 12345,
  "mfgDate": "2025-05-01T00:00:00.000Z",
  "expDate": "2027-05-01T00:00:00.000Z",
  "isActive": true,
  "supplierIds": ["60f7c2b8e1d2c8a1b4e8a789"]
}
```

---

## Warehouse Model

The `Warehouse` model represents a physical storage location for products and batches. Each warehouse has an administrator, address, capacity, and status.

| Field         | Type      | Required | Unique | Description                                      |
|---------------|---------- |--------- |--------|--------------------------------------------------|
| warehouseName | String    | No       | No     | Name of the warehouse                            |
| capacity      | Number    | Yes      | No     | Maximum storage capacity                         |
| unit          | String    | Yes      | No     | Unit of capacity (e.g., kg, liters, pcs)         |
| adminId       | ObjectId  | Yes      | No     | Reference to the User (admin)                    |
| address       | Object    | Yes      | No     | Address object (street, city, state, zipcode, country) |
| status        | String    | No       | No     | 'active', 'inactive', or 'maintenance'           |
| createdAt     | Date      | No       | No     | Timestamp (auto-generated)                       |
| updatedAt     | Date      | No       | No     | Timestamp (auto-generated)                       |

### Relationships
- `adminId` → [User](#user)

### Example JSON
```json
{
  "warehouseName": "Central Warehouse",
  "capacity": 10000,
  "unit": "pcs",
  "adminId": "60f7c2b8e1d2c8a1b4e8a999",
  "address": {
    "street": "123 Main St",
    "city": "Metropolis",
    "state": "NY",
    "zipcode": "10001",
    "country": "USA"
  },
  "status": "active"
}
```

---

## Inventory Model

The `Inventory` model represents the stock of a specific batch in a warehouse. It links a batch to a warehouse and tracks the available quantity.

| Field      | Type      | Required | Unique | Description                                      |
|------------|---------- |--------- |--------|--------------------------------------------------|
| batchId    | ObjectId  | Yes      | No     | Reference to the Batch                           |
| quantity   | Number    | Yes      | No     | Quantity of the batch available in inventory     |
| warehouseId| ObjectId  | Yes      | No     | Reference to the Warehouse                       |
| createdAt  | Date      | No       | No     | Timestamp (auto-generated)                       |
| updatedAt  | Date      | No       | No     | Timestamp (auto-generated)                       |

### Relationships
- `batchId` → [Batch](#batch)
- `warehouseId` → [Warehouse](#warehouse)

### Example JSON
```json
{
  "batchId": "60f7c2b8e1d2c8a1b4e8a123",
  "quantity": 80,
  "warehouseId": "60f7c2b8e1d2c8a1b4e8a456"
}
```

---

## Item Model

The `Item` model represents an individual, serializable unit of a product, typically tracked for high-value or unique items. Each item is linked to a batch and product, and its movement and status are tracked over time.

| Field              | Type      | Required | Unique | Description                                      |
|--------------------|---------- |--------- |--------|--------------------------------------------------|
| batchId            | ObjectId  | Yes      | No     | Reference to the Batch                           |
| productId          | ObjectId  | Yes      | No     | Reference to the Product                         |
| serialNumber       | String    | Yes      | Yes    | Unique serial number for the item                |
| currentWarehouseId | ObjectId  | No       | No     | Reference to the current Warehouse               |
| status             | String    | No       | No     | 'in_stock', 'dispatched', 'returned', 'damaged'  |
| history            | Array     | No       | No     | Array of action history objects                  |
| createdAt          | Date      | No       | No     | Timestamp (auto-generated)                       |
| updatedAt          | Date      | No       | No     | Timestamp (auto-generated)                       |

#### History Object
| Field    | Type   | Description                                      |
|----------|--------|--------------------------------------------------|
| action   | String | 'added', 'dispatched', 'returned', 'transferred', 'damaged' |
| date     | Date   | Date of the action                               |
| location | String | Location description                             |
| notes    | String | Additional notes                                 |

### Relationships
- `batchId` → [Batch](#batch)
- `productId` → [Product](#product)
- `currentWarehouseId` → [Warehouse](#warehouse)

### Example JSON
```json
{
  "batchId": "60f7c2b8e1d2c8a1b4e8a123",
  "productId": "60f7c2b8e1d2c8a1b4e8a321",
  "serialNumber": "SN-20250701-0001",
  "currentWarehouseId": "60f7c2b8e1d2c8a1b4e8a456",
  "status": "in_stock",
  "history": [
    {
      "action": "added",
      "date": "2025-07-01T10:00:00.000Z",
      "location": "Central Warehouse",
      "notes": "Initial stock entry"
    }
  ]
}
```

---

## Transport Model

The `Transport` model represents the shipment of products (batches) between locations. It tracks the transport details, status, assigned transporter, and the products being shipped.

| Field           | Type      | Required | Unique | Description                                      |
|-----------------|---------- |--------- |--------|--------------------------------------------------|
| packageId       | String    | Yes      | No     | Identifier for the package/shipment              |
| trackingNumber  | String    | Yes      | Yes    | Unique tracking number for the shipment          |
| transportCost   | Number    | Yes      | No     | Cost of transport                                |
| totalWeight     | Number    | Yes      | No     | Total weight of the shipment                     |
| totalVolume     | Number    | Yes      | No     | Total volume of the shipment                     |
| totalValue      | Number    | Yes      | No     | Total value of the shipment                      |
| status          | String    | Yes      | No     | 'pending', 'dispatched', 'intransit', 'delivered', 'returned' |
| products        | Array     | Yes      | No     | Array of product batches and their quantities    |
| location        | Object    | Yes      | No     | From and to locations                            |
| assignedTo      | ObjectId  | Yes      | No     | Reference to ExternalUser (transporter)          |
| transportMode   | String    | Yes      | No     | 'land', 'air', or 'ship'                         |
| createdAt       | Date      | No       | No     | Timestamp (auto-generated)                       |
| dispatchedAt    | Date      | No       | No     | When the shipment was dispatched                 |
| updatedAt       | Date      | No       | No     | Timestamp (auto-generated)                       |

#### Products Array
| Field    | Type     | Description                                      |
|----------|----------|--------------------------------------------------|
| batchId  | ObjectId | Reference to the Batch                           |
| quantity | Number   | Quantity of the batch in this shipment           |

#### Location Object
| Field | Type   | Description         |
|-------|--------|---------------------|
| from  | String | Origin location     |
| to    | String | Destination location|

### Relationships
- `assignedTo` → [ExternalUser](#externaluser)
- `products[].batchId` → [Batch](#batch)

### Example JSON
```json
{
  "packageId": "PKG-20250701-001",
  "trackingNumber": "TRK-20250701-001",
  "transportCost": 150.0,
  "totalWeight": 120.5,
  "totalVolume": 80000,
  "totalValue": 5000.0,
  "status": "intransit",
  "products": [
    { "batchId": "60f7c2b8e1d2c8a1b4e8a123", "quantity": 20 }
  ],
  "location": { "from": "Central Warehouse", "to": "Retail Store #1" },
  "assignedTo": "60f7c2b8e1d2c8a1b4e8a789",
  "transportMode": "land",
  "createdAt": "2025-07-01T10:00:00.000Z",
  "dispatchedAt": "2025-07-01T12:00:00.000Z"
}
```

---

## User Model

The `User` model represents internal users of the system, such as admins, staff, and viewers. It includes authentication, role, wage, and warehouse assignment details.

| Field                    | Type      | Required | Unique | Description                                      |
|--------------------------|---------- |--------- |--------|--------------------------------------------------|
| fullName                 | String    | Yes      | No     | Full name of the user                            |
| email                    | String    | Yes      | Yes    | Email address (used for login)                   |
| password                 | String    | Yes      | No     | Hashed password                                  |
| phone                    | String    | Yes      | No     | Contact phone number                             |
| avatar                   | String    | No       | No     | URL to avatar image                              |
| role                     | String    | No       | No     | 'admin', 'staff', or 'viewer'                    |
| shift                    | String    | No       | No     | 'morning', 'afternoon', or 'night'               |
| wagePerHour              | Number    | Yes      | No     | Hourly wage                                      |
| hoursThisMonth           | Number    | No       | No     | Hours worked this month                          |
| status                   | String    | No       | No     | 'active', 'inactive', or 'suspended'             |
| assignedWarehouseId      | ObjectId  | No       | No     | Reference to the assigned Warehouse              |
| isVerified               | Boolean   | No       | No     | Whether the user is verified                     |
| verificationToken        | String    | No       | No     | Token for email verification                     |
| resetPasswordToken       | String    | No       | No     | Token for password reset                         |
| resetPasswordTokenExpires| Date      | No       | No     | Expiry for reset token                           |
| lastLogin                | Date      | No       | No     | Last login timestamp                             |
| createdAt                | Date      | No       | No     | Timestamp (auto-generated)                       |
| updatedAt                | Date      | No       | No     | Timestamp (auto-generated)                       |

### Relationships
- `assignedWarehouseId` → [Warehouse](#warehouse)

### Example JSON
```json
{
  "fullName": "Jane Smith",
  "email": "jane.smith@company.com",
  "password": "<hashed_password>",
  "phone": "+1234567890",
  "avatar": "https://example.com/avatar.jpg",
  "role": "admin",
  "shift": "morning",
  "wagePerHour": 25,
  "hoursThisMonth": 160,
  "status": "active",
  "assignedWarehouseId": "60f7c2b8e1d2c8a1b4e8a456",
  "isVerified": true,
  "verificationToken": null,
  "resetPasswordToken": null,
  "resetPasswordTokenExpires": null,
  "lastLogin": "2025-07-01T09:00:00.000Z"
}
```

---

## Wage Model

The `Wage` model represents the wage record for a user for a specific month, including hours worked, overtime, wage per hour, and payment status.

| Field         | Type      | Required | Unique | Description                                      |
|---------------|---------- |--------- |--------|--------------------------------------------------|
| userId        | ObjectId  | Yes      | No     | Reference to the User                            |
| month         | String    | Yes      | No     | Month in format 'YYYY-MM'                        |
| generatedAt   | Date      | No       | No     | When the wage record was generated               |
| wageForMonth  | Number    | Yes      | No     | Wage for the month (base)                        |
| hoursWorked   | Number    | Yes      | No     | Total hours worked in the month                  |
| overTime      | Number    | No       | No     | Overtime hours                                   |
| wagePerHour   | Number    | Yes      | No     | Wage per hour                                    |
| totalPay      | Number    | Yes      | No     | Total pay (including overtime)                   |
| paidStatus    | String    | No       | No     | 'pending' or 'paid'                              |
| paidAt        | Date      | No       | No     | When the wage was paid                           |
| createdAt     | Date      | No       | No     | Timestamp (auto-generated)                       |
| updatedAt     | Date      | No       | No     | Timestamp (auto-generated)                       |

### Relationships
- `userId` → [User](#user)

### Example JSON
```json
{
  "userId": "60f7c2b8e1d2c8a1b4e8a999",
  "month": "2025-06",
  "generatedAt": "2025-07-01T10:00:00.000Z",
  "wageForMonth": 4000,
  "hoursWorked": 160,
  "overTime": 10,
  "wagePerHour": 25,
  "totalPay": 4250,
  "paidStatus": "paid",
  "paidAt": "2025-07-05T10:00:00.000Z"
}
```

---

## IncomingSupply Model

The `IncomingSupply` model represents the record of a batch being received into the warehouse, including who received it and any notes.

| Field       | Type      | Required | Unique | Description                                      |
|-------------|---------- |--------- |--------|--------------------------------------------------|
| batchId     | ObjectId  | Yes      | No     | Reference to the Batch                           |
| receivedBy  | ObjectId  | No       | No     | Reference to the User (staff/admin)              |
| receivedAt  | Date      | No       | No     | When the supply was received (default: now)      |
| notes       | String    | No       | No     | Additional notes                                 |

### Relationships
- `batchId` → [Batch](#batch)
- `receivedBy` → [User](#user)

### Example JSON
```json
{
  "batchId": "60f7c2b8e1d2c8a1b4e8a123",
  "receivedBy": "60f7c2b8e1d2c8a1b4e8a999",
  "receivedAt": "2025-07-01T10:00:00.000Z",
  "notes": "Checked and verified by staff."
}
```

---

## Auth Routes

### `GET /auth/`
- **Description:** Welcome endpoint for the Auth API.
- **Authentication:** None
- **Response:**
  - `200 OK`: `"Welcome to the Auth API"`

---

### `POST /auth/login`
- **Description:** Log in a user and receive a JWT token.
- **Authentication:** None
- **Request Body:**
```json
{
  "email": "user@example.com",
  "password": "userpassword"
}
```
- **Response:**
  - `200 OK`:
    ```json
    {
      "message": "Login successful",
      "token": "<jwt_token>",
      "user": {
        "id": "<user_id>",
        "fullName": "Jane Smith",
        "email": "jane.smith@company.com",
        "role": "admin",
        "assignedWarehouseId": { "_id": "...", "address": { ... }, "warehouseName": "..." },
        "lastLogin": "2025-07-01T09:00:00.000Z"
      }
    }
    ```
  - `401/404`: Invalid credentials or user not found/inactive.

---

### `GET /auth/logout`
- **Description:** Log out the current user (client should discard token).
- **Authentication:** Bearer JWT required
- **Response:**
  - `200 OK`: `{ "message": "Logout successful" }`

---

### `POST /auth/change-password`
- **Description:** Change the password for the authenticated user.
- **Authentication:** Bearer JWT required
- **Request Body:**
```json
{
  "oldPassword": "currentpassword",
  "newPassword": "newsecurepassword"
}
```
- **Response:**
  - `200 OK`:
    ```json
    {
      "message": "Password changed successfully",
      "user": {
        "id": "<user_id>",
        "fullName": "Jane Smith",
        "phone": "+1234567890",
        "email": "jane.smith@company.com",
        "role": "admin"
      }
    }
    ```
  - `401`: Old password is incorrect.
  - `404`: User not found.

---

## Health Routes

### `GET /health/`
- **Description:** Returns the health status of the API server, including uptime and memory usage.
- **Authentication:** None
- **Response:**
  - `200 OK`:
    ```json
    {
      "status": "healthy",
      "timestamp": "2025-07-01T12:00:00.000Z",
      "uptime": 12345.67,
      "memory": {
        "rss": "50MB",
        "heapUsed": "30MB"
      }
    }
    ```

---

## Inventory Routes

### `GET /inventory/`
- **Description:** Welcome endpoint for the Inventory API.
- **Authentication:** None
- **Response:**
  - `200 OK`: `"Welcome to the Inventory API"`

---

### `POST /inventory/add-supply`
- **Description:** Add a new supply batch to inventory. Creates a batch, logs incoming supply, updates inventory, and creates items.
- **Authentication:** Bearer JWT required
- **Request Body:**
```json
{
  "productId": "<product_id>",
  "supplierId": "<external_user_id>",
  "warehouseId": "<warehouse_id>",
  "quantity": 100,
  "mfgDate": "2025-06-01",
  "expDate": "2026-06-01",
  "notes": "First supply batch"
}
```
- **Response:**
  - `201 Created`:
    ```json
    {
      "message": "Supply added to inventory successfully.",
      "batchId": "<batch_id>",
      "itemsCreated": 100
    }
    ```
  - `400`: Missing/invalid fields or referenced entities not found.

---

### `GET /inventory/all`
- **Description:** View all inventory batches with product, supplier, and warehouse details.
- **Authentication:** Bearer JWT required (admin, staff)
- **Response:**
  - `200 OK`:
    ```json
    {
      "message": "Inventory fetched successfully.",
      "totalBatches": 2,
      "inventory": [
        {
          "_id": "<inventory_id>",
          "batchId": {
            "_id": "<batch_id>",
            "productId": { "_id": "<product_id>", "productName": "...", "sku": "...", ... },
            "supplierId": { "_id": "<supplier_id>", "fullName": "...", ... },
            ...
          },
          "warehouseId": { "_id": "<warehouse_id>", "warehouseName": "...", ... },
          "quantity": 100,
          ...
        }
      ]
    }
    ```

---

### `GET /inventory/product/:productId`
- **Description:** Get inventory entries for a specific product.
- **Authentication:** Bearer JWT required (admin, staff)
- **Response:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "message": "Inventory for product ID <productId>",
      "data": [ /* inventory entries for the product */ ]
    }
    ```

---

### `POST /inventory/mark-damaged`
- **Description:** Mark a quantity of items in a batch as damaged and adjust inventory.
- **Authentication:** Bearer JWT required (admin, staff)
- **Request Body:**
```json
{
  "batchId": "<batch_id>",
  "quantity": 5,
  "reason": "Damaged during transport"
}
```
- **Response:**
  - `200 OK`:
    ```json
    {
      "message": "5 item(s) marked as damaged and inventory adjusted."
    }
    ```
  - `400`: Insufficient inventory or not enough in-stock items.

---

## Item Routes

### `GET /item/`
- **Description:** Welcome endpoint for the Item API.
- **Authentication:** None
- **Response:**
  - `200 OK`: `{ "message": "Welcome to the Item API" }`

---

### `GET /item/all`
- **Description:** Get all items in the system, with product, batch, and warehouse details.
- **Authentication:** Bearer JWT required (admin, staff)
- **Response:**
  - `200 OK`: Array of item objects (see [Item Model](#item-model))

---

### `GET /item/:id`
- **Description:** Get details of a specific item by its ID.
- **Authentication:** Bearer JWT required (admin, staff)
- **Response:**
  - `200 OK`: Item object (see [Item Model](#item-model))
  - `404`: Item not found

---

### `GET /item/batch/:batchId`
- **Description:** Get all items belonging to a specific batch.
- **Authentication:** Bearer JWT required (admin, staff)
- **Response:**
  - `200 OK`: Array of item objects for the batch

---

### `PUT /item/update-status/:id`
- **Description:** Update the status of an item (e.g., to 'dispatched', 'damaged', etc.).
- **Authentication:** Bearer JWT required (admin, staff)
- **Request Body:**
```json
{
  "status": "damaged",
  "notes": {
    "location": "Central Warehouse",
    "message": "Damaged during handling"
  }
}
```
- **Response:**
  - `200 OK`:
    ```json
    {
      "message": "Item status updated",
      "item": { /* updated item object */ }
    }
    ```
  - `404`: Item not found

---

## Product Routes

### `GET /product/`
- **Description:** Welcome endpoint for the Product API.
- **Authentication:** None
- **Response:**
  - `200 OK`: `"Welcome to the Product API"`

---

### `POST /product/add`
- **Description:** Create a new product. Only admins can create products.
- **Authentication:** Bearer JWT required (admin)
- **Request Body:**
```json
{
  "productName": "LED TV 42-inch",
  "productImage": "https://example.com/images/ledtv42.jpg",
  "unit": "pcs",
  "manufacturer": "Acme Electronics",
  "productCategory": "electronics",
  "sku": "TV42ACME2025",
  "price": 299.99,
  "weight": 8.5,
  "dimension": { "length": 95, "breadth": 10, "height": 60 },
  "thresholdLimit": 10,
  "shelfLifeDays": 730
}
```
- **Response:**
  - `201 Created`:
    ```json
    {
      "message": "Product created successfully.",
      "product": { /* product object */ }
    }
    ```
  - `400`: Product with this SKU already exists or invalid fields.

---

### `GET /product/all`
- **Description:** Get all products. Admins see all fields; staff see limited fields.
- **Authentication:** Bearer JWT required (admin, staff)
- **Response:**
  - `200 OK`:
    ```json
    {
      "message": "Products fetched successfully.",
      "totalProducts": 2,
      "products": [
        {
          "_id": "<product_id>",
          "productName": "...",
          "sku": "...",
          "price": 299.99,
          "quantity": 50,
          "supplierIds": ["60f7c2b8e1d2c8a1b4e8a789"],
          ...
        }
      ]
    }
    ```
  - `404`: No products found.

---

### `GET /product/:id`
- **Description:** Get details of a specific product by its ID.
- **Authentication:** Bearer JWT required (admin, staff)
- **Response:**
  - `200 OK`: Product object (see [Product Model](#product-model))
  - `404`: Product not found.

---

### `DELETE /product/delete/:id`
- **Description:** Delete a product by its ID. Only admins can delete products.
- **Authentication:** Bearer JWT required (admin)
- **Response:**
  - `200 OK`:
    ```json
    {
      "message": "Product deleted successfully.",
      "product": { /* deleted product object */ }
    }
    ```
  - `404`: Product not found.

---

### `PUT /product/update/:id`
- **Description:** Update a product by its ID. Only admins can update products.
- **Authentication:** Bearer JWT required (admin)
- **Request Body:**
```json
{
  "productName": "LED TV 42-inch (Updated)",
  "price": 279.99,
  "isActive": true
}
```
- **Response:**
  - `200 OK`:
    ```json
    {
      "message": "Product updated successfully.",
      "product": { /* updated product object */ }
    }
    ```
  - `404`: Product not found.

---

## Transport Routes

### `GET /transport/`
- **Description:** Welcome endpoint for the Transport API.
- **Authentication:** None
- **Response:**
  - `200 OK`: `"Welcome to the Transport API"`

---

### `GET /transport/all`
- **Description:** Get all transport records. Admins and staff see all; transporters see only their assigned transports.
- **Authentication:** Bearer JWT required (admin, staff, transporter)
- **Response:**
  - `200 OK`: Array of transport objects (see [Transport Model](#transport-model))

---

### `POST /transport/create`
- **Description:** Create a new transport/shipment. Updates inventory, item status, and product quantity.
- **Authentication:** Bearer JWT required (admin, staff)
- **Request Body:**
```json
{
  "transportCost": 150.0,
  "products": [
    { "batchId": "60f7c2b8e1d2c8a1b4e8a123", "quantity": 20 }
  ],
  "location": { "from": "Central Warehouse", "to": "Retail Store #1" },
  "assignedTo": "60f7c2b8e1d2c8a1b4e8a789",
  "transportMode": "land"
}
```
- **Response:**
  - `201 Created`:
    ```json
    {
      "message": "Transport created successfully",
      "transport": { /* transport object */ }
    }
    ```
  - `400`: Insufficient inventory for a batch or invalid fields.

---

### `PATCH /transport/update/:id`
- **Description:** Update the status of a transport (e.g., to 'intransit', 'delivered', etc.). Only the assigned transporter can update.
- **Authentication:** Bearer JWT required (transporter)
- **Request Body:**
```json
{
  "status": "delivered"
}
```
- **Response:**
  - `200 OK`:
    ```json
    {
      "message": "Transport status updated",
      "transport": { /* updated transport object */ }
    }
    ```
  - `400`: Invalid status.
  - `403`: Not authorized to update this transport.
  - `404`: Transport not found.

---

## User Routes

### `GET /user/`
- **Description:** Welcome endpoint for the User API.
- **Authentication:** None
- **Response:**
  - `200 OK`: `"Welcome to the User API"`

---

### `GET /user/me`
- **Description:** Get details of the currently authenticated user.
- **Authentication:** Bearer JWT required
- **Response:**
  - `200 OK`: User object (see [User Model](#user-model))

---

### `POST /user/create`
- **Description:** Create a new user (staff/viewer). Only admins can create users.
- **Authentication:** Bearer JWT required (admin)
- **Request Body:**
```json
{
  "fullName": "John Doe",
  "email": "john.doe@company.com",
  "password": "securepassword",
  "phone": "+1234567890",
  "wagePerHour": 20,
  "role": "staff"
}
```
- **Response:**
  - `201 Created`:
    ```json
    {
      "message": "User created successfully.",
      "user": { /* user object */ }
    }
    ```
  - `400`: User with this email already exists.
  - `403`: Admins cannot create admins.

---

### `GET /user/all`
- **Description:** Get all users (admin only).
- **Authentication:** Bearer JWT required (admin)
- **Response:**
  - `200 OK`: Array of user objects (see [User Model](#user-model))

---

### `GET /user/:id`
- **Description:** Get details of a specific user by ID.
- **Authentication:** Bearer JWT required (admin, staff, or self)
- **Response:**
  - `200 OK`: User object (see [User Model](#user-model))
  - `404`: User not found

---

### `PUT /user/update/:id`
- **Description:** Update a user's details by ID (admin only).
- **Authentication:** Bearer JWT required (admin)
- **Request Body:**
```json
{
  "fullName": "Jane Smith",
  "email": "jane.smith@company.com",
  "role": "staff",
  "status": "active",
  "phone": "+1234567890",
  "avatar": "https://example.com/avatar.jpg",
  "shift": "morning",
  "wagePerHour": 25,
  "hoursThisMonth": 160
}
```
- **Response:**
  - `200 OK`:
    ```json
    {
      "message": "User updated successfully.",
      "user": { /* updated user object */ }
    }
    ```
  - `400`: Invalid fields or cannot change own role.
  - `404`: User not found

---

### `DELETE /user/delete/:id`
- **Description:** Delete a user by ID (admin only).
- **Authentication:** Bearer JWT required (admin)
- **Response:**
  - `200 OK`: `{ "message": "User deleted successfully." }`
  - `400`: Cannot delete your own account.
  - `404`: User not found

---

### `POST /user/create-supplier`
- **Description:** Create a new supplier (external user). Only admins can create suppliers.
- **Authentication:** Bearer JWT required (admin)
- **Request Body:**
```json
{
  "fullName": "Supplier Name",
  "companyName": "Supplier Company",
  "email": "supplier@company.com",
  "password": "securepassword",
  "phone": "+1234567890",
  "warehouseId": "60f7c2b8e1d2c8a1b4e8a456"
}
```
- **Response:**
  - `201 Created`:
    ```json
    {
      "message": "Supplier created successfully.",
      "supplier": { /* supplier object */ }
    }
    ```
  - `409`: Supplier with this email already exists.

---

### `POST /user/create-transporter`
- **Description:** Create a new transporter (external user). Only admins can create transporters.
- **Authentication:** Bearer JWT required (admin)
- **Request Body:**
```json
{
  "fullName": "Transporter Name",
  "companyName": "Transporter Company",
  "email": "transporter@company.com",
  "password": "securepassword",
  "phone": "+1234567890",
  "warehouseId": "60f7c2b8e1d2c8a1b4e8a456"
}
```
- **Response:**
  - `201 Created`:
    ```json
    {
      "message": "Transporter created successfully.",
      "transporter": { /* transporter object */ }
    }
    ```
  - `409`: Transporter with this email already exists.

---

# API Endpoints

<!-- API endpoint documentation will be added here step by step -->

# Error Handling

SmartStock API uses standard HTTP status codes to indicate the success or failure of an API request. Error responses include a descriptive message and, where appropriate, additional details.

## Common Status Codes
| Status Code | Meaning                        | Example Error Message                  |
|-------------|-------------------------------|----------------------------------------|
| 200         | OK                            | -                                      |
| 201         | Created                       | -                                      |
| 400         | Bad Request                   | "Invalid fields", "Missing parameters"|
| 401         | Unauthorized                  | "Invalid credentials", "No token provided"|
| 403         | Forbidden                     | "Not authorized", "Admins only"       |
| 404         | Not Found                     | "User not found", "Product not found" |
| 409         | Conflict                      | "Email already exists"                |
| 500         | Internal Server Error         | "Something went wrong"                |

## Error Response Format
```json
{
  "message": "Error description here."
}
```

## Example Error Responses
- **400 Bad Request:**
  ```json
  { "message": "Invalid email address." }
  ```
- **401 Unauthorized:**
  ```json
  { "message": "No token provided, authorization denied." }
  ```
- **403 Forbidden:**
  ```json
  { "message": "Not authorized to update this transport" }
  ```
- **404 Not Found:**
  ```json
  { "message": "User not found." }
  ```

---

# Authentication & Authorization

SmartStock uses JWT (JSON Web Tokens) for authentication. Most endpoints require a valid JWT in the `Authorization` header as a Bearer token.

## Authentication
- **Login:** Use `/auth/login` to obtain a JWT.
- **Header:**
  ```http
  Authorization: Bearer <jwt_token>
  ```
- **Logout:** Client should discard the token.

## Authorization
- **Roles:**
  - `admin`: Full access to all resources and user management.
  - `staff`: Access to inventory, products, and items.
  - `viewer`: Read-only access (if implemented).
  - `supplier`/`transporter`: External users, limited to their own resources.
- **Role-based Access:** Many endpoints require specific roles, as documented above.

## Token Expiry & Refresh
- Tokens are valid for a set period (see server config).
- If a token is expired or invalid, a `401 Unauthorized` error is returned.

---

# Appendix: Example Payloads

## Example: Create Product
```json
{
  "productName": "LED TV 42-inch",
  "productImage": "https://example.com/images/ledtv42.jpg",
  "unit": "pcs",
  "manufacturer": "Acme Electronics",
  "productCategory": "electronics",
  "sku": "TV42ACME2025",
  "price": 299.99,
  "weight": 8.5,
  "dimension": { "length": 95, "breadth": 10, "height": 60 },
  "thresholdLimit": 10,
  "shelfLifeDays": 730
}
```

## Example: Add Inventory Supply
```json
{
  "productId": "60f7c2b8e1d2c8a1b4e8a123",
  "supplierId": "60f7c2b8e1d2c8a1b4e8a789",
  "warehouseId": "60f7c2b8e1d2c8a1b4e8a456",
  "quantity": 100,
  "mfgDate": "2025-06-01",
  "expDate": "2026-06-01",
  "notes": "First supply batch"
}
```

## Example: Create User
```json
{
  "fullName": "John Doe",
  "email": "john.doe@company.com",
  "password": "securepassword",
  "phone": "+1234567890",
  "wagePerHour": 20,
  "role": "staff"
}
```

## Example: Create Transport
```json
{
  "transportCost": 150.0,
  "products": [
    { "batchId": "60f7c2b8e1d2c8a1b4e8a123", "quantity": 20 }
  ],
  "location": { "from": "Central Warehouse", "to": "Retail Store #1" },
  "assignedTo": "60f7c2b8e1d2c8a1b4e8a789",
  "transportMode": "land"
}
```
