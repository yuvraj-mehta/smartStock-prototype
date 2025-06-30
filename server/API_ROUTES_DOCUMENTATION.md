# SmartStock API Routes Documentation

This document provides a comprehensive overview of all API routes in the SmartStock server, including their purpose, authentication requirements, request/response structure, payloads, and implementation details.

---

## 1. Auth Routes (`/auth`)

### `POST /auth/login`

- **Purpose:** User login.
- **Auth:** None
- **Payload:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response:** JWT token and user info.
- **How it works:**
  - Validates credentials.
  - Checks if user is active.
  - Updates last login time.
  - Returns JWT if valid.

### `GET /auth/logout`

- **Purpose:** User logout (client should discard token).
- **Auth:** Yes
- **Payload:** None
- **Response:** `{ "message": "Logout successful" }`
- **How it works:**
  - Returns a success message. (Client is responsible for discarding the token.)

### `POST /auth/change-password`

- **Purpose:** Change user password.
- **Auth:** Yes
- **Payload:**
  ```json
  {
    "oldPassword": "string",
    "newPassword": "string"
  }
  ```
- **Response:** Success message and user info.
- **How it works:**
  - Verifies old password.
  - Hashes and updates to new password.

---

## 2. User Routes (`/user`)

### `GET /user/me`

- **Purpose:** Get current user's details.
- **Auth:** Yes
- **Payload:** None
- **Response:** User info.
- **How it works:** Returns authenticated user's data from the JWT.

### `POST /user/create`

- **Purpose:** Create a new user (admin only).
- **Auth:** Yes (admin)
- **Payload:**
  ```json
  {
    "fullName": "string",
    "email": "string",
    "password": "string",
    "phone": "string",
    "wagePerHour": number,
    "role": "staff|viewer"
  }
  ```
- **Response:** Created user info.
- **How it works:**
  - Validates input.
  - Checks for existing email.
  - Hashes password.
  - Creates user in DB.

### `POST /user/create-supplier`

- **Purpose:** Create a new supplier user (admin only).
- **Auth:** Yes (admin)
- **Payload:**
  ```json
  {
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "companyName": "string",
    "gstNumber": "string"
  }
  ```
- **Response:** Created supplier info.
- **How it works:**
  - Validates input.
  - Checks for existing email.
  - Creates supplier user in DB.

### `POST /user/create-transporter`

- **Purpose:** Create a new transporter user (admin only).
- **Auth:** Yes (admin)
- **Payload:**
  ```json
  {
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "vehicleNumber": "string",
    "licenseNumber": "string"
  }
  ```
- **Response:** Created transporter info.
- **How it works:**
  - Validates input.
  - Checks for existing email.
  - Creates transporter user in DB.

### `GET /user/all`

- **Purpose:** Get all users (admin only).
- **Auth:** Yes (admin)
- **Payload:** None
- **Response:** List of users.
- **How it works:**
  - Returns all users for the admin's assigned location.

### `GET /user/:id`

- **Purpose:** Get details of a specific user.
- **Auth:** Yes
- **Payload:** None
- **Response:** User info.
- **How it works:**
  - Checks permissions.
  - Returns user details if permitted.

### `PUT /user/update/:id`

- **Purpose:** Update user details (admin only).
- **Auth:** Yes (admin)
- **Payload:**
  ```json
  {
    "fullName": "string",
    "email": "string",
    "role": "admin|staff|viewer",
    "status": "active|inactive|suspended",
    "phone": "string",
    "avatar": "string",
    "shift": "morning|afternoon|night",
    "wagePerHour": number,
    "hoursThisMonth": number
  }
  ```
- **Response:** Updated user info.
- **How it works:**
  - Validates and updates only provided fields.

### `DELETE /user/delete/:id`

- **Purpose:** Delete a user (admin only).
- **Auth:** Yes (admin)
- **Payload:** None
- **Response:** Success message.
- **How it works:**
  - Deletes user if not self.

---

## 3. Product Routes (`/product`)

### `POST /product/add`

- **Purpose:** Create a new product (admin only).
- **Auth:** Yes (admin)
- **Payload:**
  ```json
  {
    "productName": "string",
    "productImage": "string",
    "unit": "string",
    "manufacturer": "string",
    "productCategory": "string",
    "sku": "string",
    "price": number,
    "weight": number,
    "dimension": "string",
    "thresholdLimit": number,
    "shelfLifeDays": number
  }
  ```
- **Response:** Created product info.
- **How it works:**
  - Validates SKU uniqueness.
  - Creates product in DB.

### `GET /product/all`

- **Purpose:** Get all products.
- **Auth:** Yes (admin, staff)
- **Payload:** None
- **Response:** List of products.
- **How it works:**
  - Returns all products, with more details for admins.

### `GET /product/:id`

- **Purpose:** Get product by ID.
- **Auth:** Yes (admin, staff)
- **Payload:** None
- **Response:** Product info.
- **How it works:**
  - Returns product, hides sensitive info for non-admins.

### `DELETE /product/delete/:id`

- **Purpose:** Delete a product (admin only).
- **Auth:** Yes (admin)
- **Payload:** None
- **Response:** Success message.
- **How it works:**
  - Deletes product by ID.

### `PUT /product/update/:id`

- **Purpose:** Update a product (admin only).
- **Auth:** Yes (admin)
- **Payload:**
  ```json
  {
    "productName": "string",
    "productImage": "string",
    "unit": "string",
    "manufacturer": "string",
    "productCategory": "string",
    "sku": "string",
    "price": number,
    "quantity": number,
    "weight": number,
    "dimension": "string",
    "thresholdLimit": number,
    "shelfLifeDays": number,
    "isActive": boolean
  }
  ```
- **Response:** Updated product info.
- **How it works:**
  - Updates only provided fields.

---

## 4. Inventory Routes (`/inventory`)

### `POST /inventory/add-supply`

- **Purpose:** Add new supply to inventory.
- **Auth:** Yes
- **Payload:**
  ```json
  {
    "productId": "string",
    "supplierId": "string",
    "warehouseId": "string",
    "quantity": number,
    "mfgDate": "YYYY-MM-DD",
    "expDate": "YYYY-MM-DD",
    "notes": "string"
  }
  ```
- **Response:** Success message, batch ID, items created.
- **How it works:**
  - Creates batch, logs supply, updates inventory and product, creates items.

### `GET /inventory/all`

- **Purpose:** View all inventory batches.
- **Auth:** Yes (admin, staff)
- **Payload:** None
- **Response:** List of inventory batches.
- **How it works:**
  - Populates batch, product, supplier, and warehouse info.

### `GET /inventory/product/:productId`

- **Purpose:** Get inventory for a specific product.
- **Auth:** Yes (admin, staff)
- **Payload:** None
- **Response:** Inventory entries for product.
- **How it works:**
  - Filters inventory by product ID.

### `POST /inventory/transport`

- **Purpose:** Create a transport record (dispatch inventory).
- **Auth:** Yes (admin, staff)
- **Payload:**
  ```json
  {
    "transportCost": number,
    "products": [
      { "batchId": "string", "quantity": number }
    ],
    "location": { "from": "string", "to": "string" },
    "assignedTo": "string",
    "transportMode": "string"
  }
  ```
- **Response:** Success message, transport info.
- **How it works:**
  - Updates inventory, item status, product quantity, creates transport record.

### `POST /inventory/mark-damaged`

- **Purpose:** Mark inventory items as damaged.
- **Auth:** Yes (admin, staff)
- **Payload:**
  ```json
  {
    "batchId": "string",
    "quantity": number,
    "reason": "string"
  }
  ```
- **Response:** Success message.
- **How it works:**
  - Reduces inventory, updates item status, adjusts product quantity.

---

## 5. Miscellaneous Routes

### `GET /health`

- **Purpose:** Health check for the server.
- **Auth:** None
- **Payload:** None
- **Response:**
  ```json
  {
    "status": "healthy",
    "timestamp": "ISO8601 string",
    "uptime": number,
    "memory": { "rss": "string", "heapUsed": "string" }
  }
  ```
- **How it works:** Returns server health info.

### `GET /forecast`, `GET /location`, `GET /assistant`, `GET /alert`

- **Purpose:** Placeholder endpoints for future features.
- **Auth:** None
- **Payload:** None
- **Response:** Welcome message.
- **How it works:** Returns a welcome message for each API.

---

## Notes

- All routes requiring authentication expect a valid JWT in the `Authorization` header.
- Admin-only routes require the user to have the `admin` role.
- Validation is performed on all create/update routes; errors are returned with appropriate messages.

---

For detailed request/response examples and error codes, refer to the controller files or contact the backend team.
