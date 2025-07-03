# SmartStock API Documentation

## Overview

SmartStock is a comprehensive warehouse management system with role-based access control. The system supports three main user roles: `admin`, `staff`, and `viewer`, plus external users (`supplier` and `transporter`).

## Authentication & Authorization

### Base URL

`/api/v1`

### Authentication

All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### User Roles & Permissions

#### Admin (`admin`)

- **Full system access**
- User management (create, update, delete users)
- Product management (add, update, delete products)
- External user management (create suppliers and transporters)
- All inventory, sales, and fulfillment operations
- Must be assigned to a warehouse

#### Staff (`staff`)

- Read access to products, inventory, and sales
- Can perform fulfillment operations
- Can record sales
- Can manage inventory (add supply, mark damaged)
- Cannot manage users or create/delete products

#### Viewer (`viewer`)

- Read-only access to basic information
- Limited functionality

#### External Users

- **Supplier**: Can add inventory supply
- **Transporter**: Can update transport status

---

## API Endpoints

### 1. Authentication Routes (`/api/v1/auth`)

#### POST `/login`

**Public** - User login

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST `/logout`

**Protected** - User logout

- Returns success message (client should discard token)

#### GET `/me`

**Protected** - Get current user details

- Returns detailed user information including warehouse assignment

#### PUT `/change-password`

**Protected** - Change user password

```json
{
  "oldPassword": "current_password",
  "newPassword": "new_password"
}
```

---

### 2. User Management Routes (`/api/v1/user`)

#### POST `/create`

**Admin Only** - Create new user

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "wagePerHour": 15.0,
  "role": "staff"
}
```

- Cannot create admin users
- Inherits warehouse assignment from creating admin

#### GET `/all`

**Admin Only** - Get all users in assigned warehouse

- Excludes sensitive fields (password, tokens)
- Includes warehouse information

#### GET `/:id`

**Admin or Self** - Get user details

- Admin can view any user in their warehouse
- Users can view their own details

#### PUT `/update/:id`

**Admin Only** - Update user information

```json
{
  "fullName": "Updated Name",
  "role": "staff",
  "status": "active",
  "wagePerHour": 20.0,
  "shift": "morning"
}
```

- Cannot change own role
- Email uniqueness validation

#### DELETE `/delete/:id`

**Admin Only** - Delete user

- Cannot delete own account
- Permanent deletion

#### POST `/create-supplier`

**Admin Only** - Create supplier account

```json
{
  "fullName": "Supplier Name",
  "companyName": "Supplier Corp",
  "email": "supplier@example.com",
  "password": "password123",
  "phone": "+1234567890"
}
```

#### POST `/create-transporter`

**Admin Only** - Create transporter account

```json
{
  "fullName": "Transporter Name",
  "companyName": "Transport Corp",
  "email": "transport@example.com",
  "password": "password123",
  "phone": "+1234567890"
}
```

---

### 3. Product Management Routes (`/api/v1/product`)

#### POST `/add`

**Admin Only** - Create new product

```json
{
  "name": "Product Name",
  "description": "Product description",
  "category": "Electronics",
  "brand": "Brand Name",
  "sku": "SKU123",
  "price": 99.99,
  "specifications": {...}
}
```

#### GET `/all`

**Admin/Staff** - Get all products

- Includes product details and inventory information

#### GET `/:id`

**Admin/Staff** - Get product by ID

- Detailed product information

#### PUT `/update/:id`

**Admin Only** - Update product

- Can update any product field
- SKU uniqueness validation

#### DELETE `/delete/:id`

**Admin Only** - Delete product

- Permanent deletion

---

### 4. Inventory Management Routes (`/api/v1/inventory`)

#### POST `/add-supply`

**All Authenticated** - Add inventory supply

```json
{
  "productId": "product_id",
  "quantity": 100,
  "supplierInfo": {...},
  "expiryDate": "2024-12-31",
  "batchNumber": "BATCH123"
}
```

#### GET `/all`

**Admin/Staff** - View all inventory

- Warehouse-specific inventory
- Includes product details and quantities

#### GET `/product/:productId`

**Admin/Staff** - Get inventory for specific product

- Product-specific inventory details

#### POST `/mark-damaged`

**Admin/Staff** - Mark inventory as damaged

```json
{
  "inventoryId": "inventory_id",
  "damagedQuantity": 5,
  "reason": "Damaged during transport"
}
```

---

### 5. Item Management Routes (`/api/v1/item`)

#### GET `/all`

**Admin/Staff** - Get all items

- Individual item tracking

#### GET `/:id`

**Admin/Staff** - Get item by ID

- Detailed item information

#### GET `/batch/:batchId`

**Admin/Staff** - Get items by batch

- Batch-specific item listing

#### PUT `/update-status/:id`

**Admin/Staff** - Update item status

```json
{
  "status": "sold",
  "location": "Aisle A1"
}
```

---

### 6. Sales Management Routes (`/api/v1/sales`)

#### POST `/record`

**Admin/Staff** - Record a sale

```json
{
  "items": [
    {
      "productId": "product_id",
      "quantity": 2,
      "unitPrice": 99.99
    }
  ],
  "customerInfo": {...},
  "paymentMethod": "credit_card"
}
```

#### GET `/all`

**Admin/Staff** - Get all sales

- Sales history with filters

#### GET `/:id`

**Admin/Staff** - Get sale by ID

- Detailed sale information

#### GET `/package/:packageId`

**Admin/Staff** - Get sale by package ID

- Package-specific sale details

---

### 7. Fulfillment Order Routes (`/api/v1/fulfillment`)

#### POST `/receive`

**Admin/Staff** - Receive new order

```json
{
  "orderNumber": "ORD123",
  "items": [...],
  "customerInfo": {...},
  "shippingAddress": {...}
}
```

#### POST `/process/:orderNumber`

**Admin/Staff** - Process order (allocate inventory)

- Allocates inventory to order

#### POST `/pack/:orderNumber`

**Admin/Staff** - Pack order

- Updates order status to packed

#### POST `/ship/:orderNumber`

**Admin/Staff** - Ship order

```json
{
  "trackingNumber": "TRACK123",
  "carrier": "FedEx",
  "shippingMethod": "Ground"
}
```

#### POST `/delivered/:orderNumber`

**Admin/Staff** - Mark order as delivered

- Final status update

#### GET `/track/:identifier`

**Public** - Track order

- Customer tracking endpoint

#### GET `/`

**Admin/Staff** - Get all orders

- Order listing with filters

#### POST `/return/:orderNumber`

**Admin/Staff** - Process return

```json
{
  "reason": "Defective product",
  "items": [...]
}
```

---

### 8. Transport Management Routes (`/api/v1/transport`)

#### GET `/all`

**Admin/Staff** - Get all transports

- Transport history and status

#### POST `/create`

**Admin/Staff** - Create transport

```json
{
  "orderId": "order_id",
  "transporterId": "transporter_id",
  "route": "Warehouse to Customer",
  "estimatedDelivery": "2024-01-15"
}
```

#### PATCH `/update/:id`

**Transporter Only** - Update transport status

```json
{
  "status": "in_transit",
  "location": "Current location",
  "notes": "On schedule"
}
```

---

### 9. Return Management Routes (`/api/v1/return`)

All return endpoints require Admin/Staff access:

- Create returns
- Process returns
- Update return status
- Track return history

---

### 10. Health Check Route (`/api/v1/health`)

#### GET `/`

**Public** - System health check

- Returns system status

---

## Data Models

### User Model

```javascript
{
  fullName: String,
  email: String (unique),
  password: String (hashed),
  phone: String,
  avatar: String (default provided),
  role: ['admin', 'staff', 'viewer'],
  shift: ['morning', 'afternoon', 'night'],
  wagePerHour: Number,
  hoursThisMonth: Number,
  status: ['active', 'inactive', 'suspended'],
  assignedWarehouseId: ObjectId (ref: Warehouse),
  isVerified: Boolean,
  lastLogin: Date,
  timestamps: true
}
```

### External User Model

```javascript
{
  fullName: String,
  companyName: String,
  email: String (unique),
  password: String (hashed),
  phone: String,
  role: ['supplier', 'transporter'],
  warehouseId: ObjectId,
  status: ['active', 'inactive'],
  timestamps: true
}
```

## Error Handling

The API uses standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

All error responses include a descriptive message:

```json
{
  "message": "Error description"
}
```

## Admin-Only Operations Summary

The following operations are restricted to admin users only:

### User Management

- Create users (`POST /api/v1/user/create`)
- Update users (`PUT /api/v1/user/update/:id`)
- Delete users (`DELETE /api/v1/user/delete/:id`)
- View all users (`GET /api/v1/user/all`)
- Create suppliers (`POST /api/v1/user/create-supplier`)
- Create transporters (`POST /api/v1/user/create-transporter`)

### Product Management

- Create products (`POST /api/v1/product/add`)
- Update products (`PUT /api/v1/product/update/:id`)
- Delete products (`DELETE /api/v1/product/delete/:id`)

These operations form the core administrative functions that would be included in an admin-only component.
