# SmartStock DB Models Documentation

This document provides a comprehensive overview of all main database models in the SmartStock server, including their fields, types, requirements, defaults, enums, and relationships.

---

## User

**Collection:** `users`

| Field               | Type     | Required | Default  | Enum/Ref                    | Description              |
| ------------------- | -------- | -------- | -------- | --------------------------- | ------------------------ |
| fullName            | String   | Yes      |          |                             | Full name of the user    |
| email               | String   | Yes      |          | unique                      | User email (unique)      |
| password            | String   | Yes      |          |                             | Hashed password          |
| phone               | String   | Yes      |          |                             | Phone number             |
| avatar              | String   | No       | URL      |                             | Profile image            |
| role                | String   | No       | viewer   | admin, staff, viewer        | User role                |
| shift               | String   | No       |          | morning, afternoon, night   | Work shift               |
| wagePerHour         | Number   | Yes      | 0        |                             | Hourly wage              |
| hoursThisMonth      | Number   | No       | 0        |                             | Hours worked this month  |
| status              | String   | No       | inactive | active, inactive, suspended | User status              |
| assignedWarehouseId | ObjectId | No       |          | Warehouse                   | Assigned warehouse       |
| isVerified          | Boolean  | No       | false    |                             | Email verified           |
| verificationToken   | String   | No       |          |                             | Email verification token |
| ...timestamps       | Date     | No       |          |                             | createdAt, updatedAt     |

---

## Product

**Collection:** `products`

| Field              | Type       | Required | Default | Enum/Ref                               | Description                    |
| ------------------ | ---------- | -------- | ------- | -------------------------------------- | ------------------------------ |
| productName        | String     | Yes      |         |                                        | Name of the product            |
| productImage       | String     | Yes      |         |                                        | Image URL                      |
| unit               | String     | Yes      |         |                                        | Unit of measurement            |
| manufacturer       | String     | No       |         |                                        | Manufacturer name              |
| productCategory    | String     | No       |         | electronics, apparel, decor, furniture | Product category               |
| sku                | String     | Yes      |         | unique                                 | Stock keeping unit (unique)    |
| price              | Number     | Yes      |         |                                        | Price per unit                 |
| quantity           | Number     | Yes      | 0       |                                        | Current stock quantity         |
| weight             | Number     | No       | 0       |                                        | Weight per unit                |
| dimension          | Object     | Yes      |         |                                        | { length, breadth, height }    |
| volume             | Number     | No       |         |                                        | Auto-calculated from dimension |
| thresholdLimit     | Number     | Yes      | 10      |                                        | Restock threshold              |
| restockRecommended | Boolean    | No       |         |                                        | Should restock?                |
| supplierIds        | [ObjectId] | No       |         | ExternalUser                           | Linked suppliers               |
| ...timestamps      | Date       | No       |         |                                        | createdAt, updatedAt           |

---

## Batch

**Collection:** `batches`

| Field         | Type     | Required | Default | Enum/Ref              | Description          |
| ------------- | -------- | -------- | ------- | --------------------- | -------------------- |
| batchNumber   | String   | Yes      |         | unique                | Batch identifier     |
| productId     | ObjectId | Yes      |         | Product               | Linked product       |
| warehouseId   | ObjectId | Yes      |         | Warehouse             | Linked warehouse     |
| supplierId    | ObjectId | Yes      |         | ExternalUser          | Linked supplier      |
| quantity      | Number   | Yes      |         |                       | Quantity in batch    |
| mfgDate       | Date     | Yes      |         |                       | Manufacturing date   |
| expDate       | Date     | Yes      |         |                       | Expiry date          |
| receivedAt    | Date     | No       | now     |                       | Date received        |
| condition     | String   | No       | new     | new, damaged, expired | Batch condition      |
| status        | String   | No       | active  | active, used, expired | Batch status         |
| ...timestamps | Date     | No       |         |                       | createdAt, updatedAt |

---

## Inventory

**Collection:** `inventories`

| Field         | Type     | Required | Default | Enum/Ref  | Description           |
| ------------- | -------- | -------- | ------- | --------- | --------------------- |
| batchId       | ObjectId | Yes      |         | Batch     | Linked batch          |
| quantity      | Number   | Yes      |         |           | Quantity in inventory |
| warehouseId   | ObjectId | Yes      |         | Warehouse | Linked warehouse      |
| ...timestamps | Date     | No       |         |           | createdAt, updatedAt  |

---

## Item

**Collection:** `items`

| Field              | Type     | Required | Default  | Enum/Ref                                | Description             |
| ------------------ | -------- | -------- | -------- | --------------------------------------- | ----------------------- |
| batchId            | ObjectId | Yes      |          | Batch                                   | Linked batch            |
| productId          | ObjectId | Yes      |          | Product                                 | Linked product          |
| serialNumber       | String   | Yes      |          | unique                                  | Unique serial number    |
| currentWarehouseId | ObjectId | No       |          | Warehouse                               | Current warehouse       |
| status             | String   | No       | in_stock | in_stock, dispatched, returned, damaged | Item status             |
| history            | [Object] | No       |          |                                         | Array of action records |
| ...timestamps      | Date     | No       |          |                                         | createdAt, updatedAt    |

---

## Warehouse

**Collection:** `warehouses`

| Field         | Type     | Required | Default | Enum/Ref                      | Description                               |
| ------------- | -------- | -------- | ------- | ----------------------------- | ----------------------------------------- |
| warehouseName | String   | No       |         |                               | Name of warehouse                         |
| capacity      | Number   | Yes      |         |                               | Capacity                                  |
| unit          | String   | Yes      |         |                               | Unit of capacity                          |
| adminId       | ObjectId | Yes      |         | User                          | Warehouse admin                           |
| address       | Object   | Yes      |         |                               | { street, city, state, zipcode, country } |
| status        | String   | No       | active  | active, inactive, maintenance | Warehouse status                          |
| createdAt     | Date     | No       | now     |                               | Creation date                             |
| updatedAt     | Date     | No       | now     |                               | Last update date                          |

---

## ExternalUser

**Collection:** `externalusers`

| Field       | Type     | Required | Default  | Enum/Ref                    | Description           |
| ----------- | -------- | -------- | -------- | --------------------------- | --------------------- |
| fullName    | String   | Yes      |          |                             | Name of external user |
| companyName | String   | Yes      |          |                             | Company name          |
| email       | String   | Yes      |          | unique                      | Email (unique)        |
| password    | String   | Yes      |          |                             | Hashed password       |
| phone       | String   | Yes      |          |                             | Phone number          |
| rating      | Number   | No       |          | 1-5                         | User rating           |
| role        | String   | Yes      |          | supplier, transporter       | External user type    |
| status      | String   | No       | inactive | active, inactive, suspended | User status           |
| warehouseId | ObjectId | No       |          | Warehouse                   | Linked warehouse      |
| createdAt   | Date     | No       | now      |                             | Creation date         |
| updatedAt   | Date     | No       | now      |                             | Last update date      |

---

## Transport

**Collection:** `transports`

| Field          | Type     | Required | Default | Enum/Ref                                            | Description            |
| -------------- | -------- | -------- | ------- | --------------------------------------------------- | ---------------------- |
| packageId      | String   | Yes      |         |                                                     | Package identifier     |
| trackingNumber | String   | Yes      |         | unique                                              | Tracking number        |
| transportCost  | Number   | Yes      |         |                                                     | Cost of transport      |
| totalWeight    | Number   | Yes      |         |                                                     | Total weight           |
| totalVolume    | Number   | Yes      |         |                                                     | Total volume           |
| totalValue     | Number   | Yes      |         |                                                     | Total value            |
| status         | String   | Yes      |         | pending, dispatched, intransit, delivered, returned | Transport status       |
| products       | [Object] | Yes      |         | { batchId, quantity }                               | Products in transport  |
| location       | Object   | Yes      |         | { from, to }                                        | Source and destination |
| assignedTo     | ObjectId | Yes      |         | ExternalUser                                        | Assigned transporter   |
| dispatchedAt   | Date     | No       |         |                                                     | Dispatch date          |
| deliveredAt    | Date     | No       |         |                                                     | Delivery date          |
| ...timestamps  | Date     | No       |         |                                                     | createdAt, updatedAt   |

---

## IncomingSupply

**Collection:** `incomingsupplies`

| Field      | Type     | Required | Default | Enum/Ref | Description              |
| ---------- | -------- | -------- | ------- | -------- | ------------------------ |
| batchId    | ObjectId | Yes      |         | Batch    | Linked batch             |
| receivedBy | ObjectId | No       |         | User     | Staff/admin who received |
| receivedAt | Date     | No       | now     |          | Date received            |
| notes      | String   | No       |         |          | Notes                    |

---

## Wage

**Collection:** `wages`

| Field         | Type     | Required | Default | Enum/Ref      | Description          |
| ------------- | -------- | -------- | ------- | ------------- | -------------------- |
| userId        | ObjectId | Yes      |         | User          | Linked user          |
| month         | String   | Yes      |         |               | Month (YYYY-MM)      |
| generatedAt   | Date     | No       | now     |               | Date wage generated  |
| wageForMonth  | Number   | Yes      |         |               | Wage for the month   |
| hoursWorked   | Number   | Yes      |         |               | Hours worked         |
| overTime      | Number   | No       | 0       |               | Overtime hours       |
| wagePerHour   | Number   | Yes      |         |               | Hourly wage          |
| totalPay      | Number   | Yes      |         |               | Total pay            |
| paidStatus    | String   | No       | pending | pending, paid | Payment status       |
| paidAt        | Date     | No       |         |               | Date paid            |
| ...timestamps | Date     | No       |         |               | createdAt, updatedAt |

---

## Field Details for Nested Objects

### Product.dimension

- **Type:** Object
- **Fields:**
  - `length` (Number, required)
  - `breadth` (Number, required)
  - `height` (Number, required)
- **Description:** Physical dimensions of the product (in cm, m, etc.)

### Warehouse.address

- **Type:** Object
- **Fields:**
  - `street` (String, required)
  - `city` (String, required)
  - `state` (String, required)
  - `zipcode` (String, required)
  - `country` (String, required)
- **Description:** Full address of the warehouse

### Transport.products

- **Type:** Array of Objects
- **Fields:**
  - `batchId` (ObjectId, required, ref: Batch)
  - `quantity` (Number, required)
- **Description:** List of batches and their quantities in the transport

### Transport.location

- **Type:** Object
- **Fields:**
  - `from` (String, required)
  - `to` (String, required)
- **Description:** Source and destination locations for the transport

### Item.history

- **Type:** Array of Objects
- **Fields:**
  - `action` (String, enum: ["added", "dispatched", "returned", "transferred", "damaged"])
  - `date` (Date, default: now)
  - `location` (String)
  - `notes` (String)
- **Description:** Log of actions performed on the item

---

## Example Documents

### Product Example

```json
{
  "productName": "LED TV",
  "productImage": "https://...",
  "unit": "pcs",
  "manufacturer": "Sony",
  "productCategory": "electronics",
  "sku": "SONYTV123",
  "price": 35000,
  "quantity": 100,
  "weight": 12.5,
  "dimension": { "length": 120, "breadth": 20, "height": 70 },
  "thresholdLimit": 10
}
```

### Warehouse Example

```json
{
  "warehouseName": "Main Warehouse",
  "capacity": 10000,
  "unit": "pcs",
  "adminId": "<userId>",
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

### Transport Example

```json
{
  "packageId": "PKG-12345678",
  "trackingNumber": "TRK-87654321",
  "transportCost": 5000,
  "totalWeight": 250,
  "totalVolume": 1000,
  "totalValue": 350000,
  "status": "dispatched",
  "products": [{ "batchId": "<batchId>", "quantity": 50 }],
  "location": { "from": "Main Warehouse", "to": "Store 1" },
  "assignedTo": "<externalUserId>"
}
```

### Item Example

```json
{
  "batchId": "<batchId>",
  "productId": "<productId>",
  "serialNumber": "SONYTV123-UUID",
  "currentWarehouseId": "<warehouseId>",
  "status": "in_stock",
  "history": [
    {
      "action": "added",
      "date": "2025-07-01T10:00:00Z",
      "location": "Main Warehouse",
      "notes": "Initial stock"
    }
  ]
}
```

---

For detailed schema and validation logic, refer to the model files or contact the backend team.
