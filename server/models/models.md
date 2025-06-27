# Models Documentation

This document provides an overview of the Mongoose models defined in the `models` directory.

---

## Alert Model (`alertModel.js`)

**Collection:** Alert

| Field       | Type     | Description                                                   |
| ----------- | -------- | ------------------------------------------------------------- |
| productId   | ObjectId | Reference to Product, required                                |
| locationId  | ObjectId | Reference to Location, required                               |
| type        | String   | Alert type: 'low-stock', 'surge', 'forecast-error' (required) |
| message     | String   | Alert message, required                                       |
| triggeredAt | Date     | When the alert was triggered, required                        |
| status      | String   | 'open', 'acknowledged', 'closed' (required)                   |
| createdAt   | Date     | Creation date, default: now                                   |

---

## Forecast Model (`forecastModel.js`)

**Collection:** Forecast

| Field           | Type     | Description                     |
| --------------- | -------- | ------------------------------- |
| productId       | ObjectId | Reference to Product, required  |
| locationId      | ObjectId | Reference to Location, required |
| forecastData    | Date     | Date of forecast, required      |
| forecastPeriod  | Number   | Forecast period, required       |
| predictedDemand | Number   | Predicted demand, required      |
| method          | String   | Forecasting method              |
| accuracy        | Number   | Forecast accuracy               |
| notes           | String   | Additional notes                |
| createdBy       | ObjectId | Reference to User, required     |
| createdAt       | Date     | Creation date, default: now     |

---

## Inventory Model (`inventoryModel.js`)

**Collection:** Inventory

| Field           | Type     | Description                                 |
| --------------- | -------- | ------------------------------------------- |
| name            | String   | Inventory name, required                    |
| type            | String   | 'on-hand', 'damaged', 'reserved' (required) |
| code            | String   | Unique code, required                       |
| status          | String   | 'active', 'archived', 'pending' (required)  |
| productId       | ObjectId | Reference to Product, required              |
| locationId      | ObjectId | Reference to Location, required             |
| quantity        | Number   | Quantity, required                          |
| incomingStock   | Number   | Incoming stock, default: 0                  |
| lastRestockedAt | Date     | Last restocked date                         |
| lastUpdated     | Date     | Last updated date, default: now             |
| notes           | String   | Additional notes                            |
| updatedBy       | ObjectId | Reference to User                           |

---

## Location Model (`locationModel.js`)

**Collection:** Location

| Field     | Type   | Description                                    |
| --------- | ------ | ---------------------------------------------- |
| cityName  | String | City name, required                            |
| address   | String | Address, required                              |
| zipCode   | String | Zip code, required                             |
| type      | String | 'warehouse', 'retail', 'store' (required)      |
| code      | String | Unique code, required                          |
| status    | String | 'active', 'inactive', 'maintenance' (required) |
| createdAt | Date   | Creation date, default: now                    |

---

## Product Model (`productModel.js`)

**Collection:** Product

| Field           | Type    | Description                                           |
| --------------- | ------- | ----------------------------------------------------- |
| name            | String  | Product name, required                                |
| sku             | String  | Unique SKU, required                                  |
| description     | String  | Product description                                   |
| category        | String  | 'electronics', 'clothing', 'food', 'other' (required) |
| reorderPoint    | Number  | Reorder point, required                               |
| restockTime     | Number  | Restock time                                          |
| quantity        | Number  | Quantity, required                                    |
| incomingStock   | Number  | Incoming stock, default: 0                            |
| lastRestockedAt | Date    | Last restocked date                                   |
| lastUpdated     | Date    | Last updated date, default: now                       |
| notes           | String  | Additional notes                                      |
| unit            | String  | Unit, required                                        |
| active          | Boolean | Is active, required (default: true)                   |
| createdAt       | Date    | Creation date, default: now                           |
| updatedAt       | Date    | Last updated date, default: now                       |

---

## User Model (`userModel.js`)

**Collection:** User

| Field                     | Type     | Description                                             |
| ------------------------- | -------- | ------------------------------------------------------- |
| fullName                  | String   | Full name, required                                     |
| email                     | String   | Unique email, required                                  |
| password                  | String   | Password, required                                      |
| role                      | String   | 'admin', 'staff', 'viewer' (default: 'viewer')          |
| assignedLocation          | ObjectId | Reference to Location                                   |
| status                    | String   | 'active', 'inactive', 'suspended' (default: 'inactive') |
| emailVerified             | Boolean  | Email verification status (default: false)              |
| createdAt                 | Date     | Creation date, default: now                             |
| updatedAt                 | Date     | Last updated date                                       |
| lastLogin                 | Date     | Last login date                                         |
| passwordResetToken        | String   | Token for password reset functionality                  |
| passwordResetTokenExpires | Date     | Expiration date for password reset token                |
| passwordChangedAt         | Date     | Date when password was last changed                     |


## 🛡️ Role-Based Permissions Matrix

| Module / Feature | **Admin** | **Staff** | **Viewer** |
| --- | --- | --- | --- |
| **User Management** | ✅ Full CRUD | ❌ None | ❌ None |
| **Assign Roles** | ✅ Yes | ❌ No | ❌ No |
| **View Users** | ✅ Yes | ❌ No | ❌ No |
| **Product Management** | ✅ Full CRUD | ✏️ Update `quantity` only🔘 Toggle Active/Inactive | 🔍 Read-only |
| **Inventory Management** | ✅ Full CRUD | ✏️ Update `quantity` only | 🔍 Read-only |
| **Location Management** | ✅ Full CRUD | ❌ No Access | 🔍 View-only |
| **Forecast Management** | ✅ Full CRUD | ❌ No Access | 🔍 View-only |
| **Alerts** | ✅ View & Close | 🔍 View-only | 🔍 View-only |
| **View Dashboards / Stats** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Audit Logs / Activity** | ✅ Full Access | ❌ No Access | ❌ No Access |