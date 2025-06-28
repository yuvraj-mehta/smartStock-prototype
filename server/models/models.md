# Models Documentation

This document provides an overview of the Mongoose models defined in the `models` directory.

---

## Alert Model (`alert.model.js`)

**Collection:** Alert

| Field       | Type     | Description                                                         |
| ----------- | -------- | ------------------------------------------------------------------- |
| productId   | ObjectId | Reference to Product, required                                      |
| locationId  | ObjectId | Reference to Location, required                                     |
| type        | String   | Alert type: enum ['low-stock', 'surge', 'forecast-error'], required |
| message     | String   | Alert message, required                                             |
| triggeredAt | Date     | When the alert was triggered, required                              |
| status      | String   | Alert status: enum ['open', 'acknowledged', 'closed'], required     |
| createdAt   | Date     | Creation date, default: Date.now                                    |

---

## Forecast Model (`forecast.model.js`)

**Collection:** Forecast

| Field           | Type     | Description                      |
| --------------- | -------- | -------------------------------- |
| productId       | ObjectId | Reference to Product, required   |
| locationId      | ObjectId | Reference to Location, required  |
| forecastData    | Date     | Date of forecast, required       |
| forecastPeriod  | Number   | Forecast period, required        |
| predictedDemand | Number   | Predicted demand, required       |
| method          | String   | Forecasting method               |
| accuracy        | Number   | Forecast accuracy                |
| notes           | String   | Additional notes                 |
| createdBy       | ObjectId | Reference to User, required      |
| createdAt       | Date     | Creation date, default: Date.now |

---

## Inventory Model (`inventory.model.js`)

**Collection:** Inventory

| Field           | Type     | Description                                                        |
| --------------- | -------- | ------------------------------------------------------------------ |
| name            | String   | Inventory name, required                                           |
| type            | String   | Inventory type: enum ['on-hand', 'damaged', 'reserved'], required  |
| code            | String   | Unique code, required, unique constraint                           |
| status          | String   | Inventory status: enum ['active', 'archived', 'pending'], required |
| productId       | ObjectId | Reference to Product, required                                     |
| locationId      | ObjectId | Reference to Location, required                                    |
| quantity        | Number   | Quantity, required                                                 |
| incomingStock   | Number   | Incoming stock, default: 0                                         |
| lastRestockedAt | Date     | Last restocked date                                                |
| lastUpdated     | Date     | Last updated date, default: Date.now                               |
| notes           | String   | Additional notes                                                   |
| updatedBy       | ObjectId | Reference to User                                                  |

---

## Location Model (`location.model.js`)

**Collection:** Location

| Field     | Type   | Description                                                           |
| --------- | ------ | --------------------------------------------------------------------- |
| cityName  | String | City name, required                                                   |
| address   | String | Address, required                                                     |
| zipCode   | String | Zip code, required                                                    |
| type      | String | Location type: enum ['warehouse', 'retail', 'store'], required        |
| code      | String | Unique code, required, unique constraint                              |
| status    | String | Location status: enum ['active', 'inactive', 'maintenance'], required |
| createdAt | Date   | Creation date, default: Date.now                                      |

---

## Product Model (`product.model.js`)

**Collection:** Product

| Field           | Type    | Description                                                                   |
| --------------- | ------- | ----------------------------------------------------------------------------- |
| name            | String  | Product name, required                                                        |
| sku             | String  | Unique SKU, required, unique constraint                                       |
| description     | String  | Product description                                                           |
| category        | String  | Product category: enum ['electronics', 'clothing', 'food', 'other'], required |
| reorderPoint    | Number  | Reorder point, required                                                       |
| restockTime     | Number  | Restock time                                                                  |
| quantity        | Number  | Quantity, required                                                            |
| incomingStock   | Number  | Incoming stock, default: 0                                                    |
| lastRestockedAt | Date    | Last restocked date                                                           |
| lastUpdated     | Date    | Last updated date, default: Date.now                                          |
| notes           | String  | Additional notes                                                              |
| unit            | String  | Unit, required                                                                |
| active          | Boolean | Is active, required, default: true                                            |
| createdAt       | Date    | Creation date, default: Date.now                                              |
| updatedAt       | Date    | Last updated date, default: Date.now                                          |

---

## User Model (`user.model.js`)

**Collection:** User

| Field                     | Type     | Description                                                              |
| ------------------------- | -------- | ------------------------------------------------------------------------ |
| fullName                  | String   | Full name, required                                                      |
| email                     | String   | Unique email, required, unique constraint                                |
| password                  | String   | Password, required                                                       |
| role                      | String   | User role: enum ['admin', 'staff', 'viewer'], default: 'viewer'          |
| assignedLocation          | ObjectId | Reference to Location                                                    |
| status                    | String   | User status: enum ['active', 'inactive', 'suspended'], default: 'active' |
| emailVerified             | Boolean  | Email verification status, default: false                                |
| userAvatar                | String   | User avatar URL, default: predefined image URL                           |
| createdAt                 | Date     | Creation date, default: Date.now                                         |
| updatedAt                 | Date     | Last updated date, default: Date.now                                     |
| lastLogin                 | Date     | Last login date, default: null                                           |
| passwordResetToken        | String   | Token for password reset functionality, default: null                    |
| passwordResetTokenExpires | Date     | Expiration date for password reset token, default: null                  |
| passwordChangedAt         | Date     | Date when password was last changed, default: null                       |

---

## Role Permissions Model (`role.permissions.model.js`)

**Collection:** RolePermissions

| Field                        | Type    | Description                      |
| ---------------------------- | ------- | -------------------------------- |
| admin                        | Object  | Admin role permissions           |
| admin.canManageUsers         | Boolean | Can manage users (true)          |
| admin.canEditAllProducts     | Boolean | Can edit all products (true)     |
| admin.canViewAuditLogs       | Boolean | Can view audit logs (true)       |
| staff                        | Object  | Staff role permissions           |
| staff.canEditProductQuantity | Boolean | Can edit product quantity (true) |
| staff.canViewAlerts          | Boolean | Can view alerts (true)           |
| staff.canToggleProductStatus | Boolean | Can toggle product status (true) |
| viewer                       | Object  | Viewer role permissions          |
| viewer.canViewEverything     | Boolean | Can view everything (true)       |

---

## 🛡️ Role-Based Permissions Matrix

_Note: This matrix is based on the intended permissions structure. The actual implementation may vary._

| Module / Feature            | **Admin**       | **Staff**                                          | **Viewer**   |
| --------------------------- | --------------- | -------------------------------------------------- | ------------ |
| **User Management**         | ✅ Full CRUD    | ❌ None                                            | ❌ None      |
| **Assign Roles**            | ✅ Yes          | ❌ No                                              | ❌ No        |
| **View Users**              | ✅ Yes          | ❌ No                                              | ❌ No        |
| **Product Management**      | ✅ Full CRUD    | ✏️ Update `quantity` only • Toggle Active/Inactive | 🔍 Read-only |
| **Inventory Management**    | ✅ Full CRUD    | ✏️ Update `quantity` only                          | 🔍 Read-only |
| **Location Management**     | ✅ Full CRUD    | ❌ No Access                                       | 🔍 View-only |
| **Forecast Management**     | ✅ Full CRUD    | ❌ No Access                                       | 🔍 View-only |
| **Alerts**                  | ✅ View & Close | 🔍 View-only                                       | 🔍 View-only |
| **View Dashboards / Stats** | ✅ Yes          | ✅ Yes                                             | ✅ Yes       |
| **Audit Logs / Activity**   | ✅ Full Access  | ❌ No Access                                       | ❌ No Access |
