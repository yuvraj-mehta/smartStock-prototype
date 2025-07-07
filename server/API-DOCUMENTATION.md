# SmartStock API Documentation

## Authentication Required

All endpoints require authentication unless specified otherwise. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Order Management

### Create Order

```http
POST /api/v1/order/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "platformOrderId": "AMZ-12345-67890",
  "items": [
    {
      "productId": "product_id_here",
      "quantity": 2
    }
  ],
  "notes": "Optional notes"
}
```

### Process Order

```http
POST /api/v1/order/process/:orderId
Authorization: Bearer <token>
Content-Type: application/json

{
  "notes": "Optional processing notes"
}
```

### Assign Transport

```http
POST /api/v1/order/assign-transport/:packageId
Authorization: Bearer <token>
Content-Type: application/json

{
  "transporterId": "transporter_id_here",
  "notes": "Optional transport notes"
}
```

### Get All Orders

```http
GET /api/v1/order/all?status=pending&page=1&limit=10
Authorization: Bearer <token>
```

## Package Management

### Get All Packages

```http
GET /api/v1/package/all?status=created&page=1&limit=10
Authorization: Bearer <token>
```

### Get Package by ID

```http
GET /api/v1/package/:packageId
Authorization: Bearer <token>
```

## Transport Management

### Get All Transports

```http
GET /api/v1/transport/all?status=dispatched&page=1&limit=10
Authorization: Bearer <token>
```

### Update Transport Status

```http
POST /api/v1/transport/update-status/:transportId
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "delivered",
  "notes": "Delivered successfully"
}
```

## Return Management

### Initiate Return

```http
POST /api/v1/return/initiate
Authorization: Bearer <token>
Content-Type: application/json

{
  "packageId": "package_id_here",
  "returnedItems": [
    {
      "productId": "product_id_here",
      "batchId": "batch_id_here",
      "quantity": 1
    }
  ],
  "returnReason": "Damaged item",
  "notes": "Optional notes"
}
```

### Schedule Pickup

```http
POST /api/v1/return/schedule-pickup/:returnId
Authorization: Bearer <token>
Content-Type: application/json

{
  "transporterId": "transporter_id_here",
  "notes": "Optional pickup notes"
}
```

## Inventory Management

### Add Inventory Supply

```http
POST /api/v1/inventory/add-supply
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "product_id_here",
  "supplierId": "supplier_id_here",
  "quantity": 50,
  "mfgDate": "2024-01-01",
  "expDate": "2026-01-01",
  "notes": "Optional supply notes"
}
```

### View All Inventory

```http
GET /api/v1/inventory/all
Authorization: Bearer <token>
```

## Authentication

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@smartstock.com",
  "password": "admin123"
}
```

### Register User

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@smartstock.com",
  "password": "password123",
  "phone": "+1234567890",
  "role": "staff",
  "shift": "morning",
  "wagePerHour": 18,
  "assignedWarehouseId": "warehouse_id_here"
}
```

## Status Enums

### Order Status

- `pending` - Order created but not processed
- `processing` - Order being processed
- `packaged` - Package created and ready
- `dispatched` - Package dispatched for delivery
- `delivered` - Package delivered to customer
- `sale_confirmed` - Sale confirmed (auto after 10 days)
- `returned` - Order returned

### Package Status

- `created` - Package created
- `ready_for_dispatch` - Ready for transport
- `dispatched` - Package dispatched
- `in_transit` - Package in transit
- `delivered` - Package delivered
- `returned` - Package returned

### Transport Status

- `assigned` - Transport assigned
- `dispatched` - Transport dispatched
- `in_transit` - Transport in transit
- `delivered` - Transport delivered

### Return Status

- `initiated` - Return initiated
- `pickup_scheduled` - Pickup scheduled
- `picked_up` - Return picked up
- `received` - Return received at warehouse
- `processed` - Return processed and inventory restored

## Error Responses

All errors follow this format:

```json
{
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error message",
      "value": "invalid_value"
    }
  ]
}
```

## Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error
