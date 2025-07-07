# SmartStock Inventory Management System - Backend Rewrite

## Overview

This is the rewritten backend for the SmartStock inventory management system, designed for internal warehouse operations with a streamlined order fulfillment flow.

## New Architecture

### Core Flow

1. **Orders** → Manual entry by staff from e-commerce platforms
2. **Package Creation** → Automatic generation when order is processed
3. **Transport Assignment** → Assign transporter for delivery/return
4. **Delivery Tracking** → Track packages through delivery lifecycle
5. **Auto Sale Confirmation** → Automatic confirmation after 10 days
6. **Returns Processing** → Handle returns within 10-day window

### Models

#### 1. Order Model (`order.model.js`)

- Simplified order structure with only essential data
- No customer information stored
- Links to products and quantities only
- Status flow: `pending → processing → packaged → dispatched → delivered → sale_confirmed/returned`

#### 2. Package Model (`package.model.js`)

- Links order to allocated inventory items
- Automatically created when order is processed
- Contains weight, volume, and value calculations
- Status flow: `created → ready_for_dispatch → dispatched → in_transit → delivered → returned`

#### 3. Transport Model (`transport.model.js`)

- Links packages to transporters
- Supports both forward (delivery) and reverse (return) transport
- Simplified status tracking: `dispatched → in_transit → delivered`

#### 4. Return Model (`returns.model.js`)

- Links to packages and orders
- Tracks returned items and quantities
- No customer data, only operational tracking
- Status flow: `initiated → pickup_scheduled → picked_up → received → processed`

#### 5. SalesHistory Model (`sales.history.model.js`)

- Records confirmed sales (after 10-day window)
- Links to packages and orders
- Contains delivery confirmation details

### Controllers

#### Order Controller (`order.controller.js`)

- `createOrder` - Manual order entry by staff
- `processOrder` - Allocate inventory and create package
- `assignTransport` - Assign transporter to package
- `dispatchPackage` - Mark package as dispatched
- `markDelivered` - Mark package as delivered
- `autoConfirmSale` - Auto-confirm sales after 10 days

#### Package Controller (`package.controller.js`)

- `getAllPackages` - List all packages with filtering
- `getPackageById` - Get detailed package information
- `getPackagesByOrderId` - Get packages for specific order
- `updatePackageStatus` - Update package status manually

#### Transport Controller (`transport.controller.js`)

- `getAllTransports` - List transports (filtered by user role)
- `getTransportById` - Get detailed transport information
- `updateTransportStatus` - Update transport status (for transporters)
- `getTransportsByPackageId` - Get transport history for package

#### Return Controller (`return.controller.js`)

- `initiateReturn` - Start return process within 10-day window
- `schedulePickup` - Schedule pickup with transporter
- `markPickedUp` - Mark return as picked up
- `processReturn` - Process return at warehouse and restore inventory

### API Endpoints

#### Orders

```
POST   /api/v1/order/create                    - Create new order
POST   /api/v1/order/process/:orderId          - Process order and create package
POST   /api/v1/order/assign-transport/:packageId - Assign transport
POST   /api/v1/order/dispatch/:packageId       - Dispatch package
POST   /api/v1/order/delivered/:packageId      - Mark as delivered
POST   /api/v1/order/auto-confirm-sales        - Auto-confirm sales
GET    /api/v1/order/all                       - Get all orders
GET    /api/v1/order/:orderId                  - Get order by ID
```

#### Packages

```
GET    /api/v1/package/all                     - Get all packages
GET    /api/v1/package/:packageId              - Get package by ID
GET    /api/v1/package/order/:orderId          - Get packages by order
PATCH  /api/v1/package/status/:packageId       - Update package status
```

#### Transport

```
GET    /api/v1/transport/all                   - Get all transports
GET    /api/v1/transport/:transportId          - Get transport by ID
GET    /api/v1/transport/package/:packageId    - Get transports by package
PATCH  /api/v1/transport/status/:transportId   - Update transport status
```

#### Returns

```
POST   /api/v1/return/initiate                 - Initiate return
POST   /api/v1/return/schedule-pickup/:returnId - Schedule pickup
POST   /api/v1/return/picked-up/:returnId      - Mark as picked up
POST   /api/v1/return/process/:returnId        - Process return
GET    /api/v1/return/all                      - Get all returns
GET    /api/v1/return/:returnId                - Get return by ID
```

### Business Logic

#### Order Processing Flow

1. Staff manually enters order from e-commerce platform
2. System validates products and inventory availability
3. FIFO inventory allocation with database transactions
4. Package is automatically created with allocated items
5. Transport assignment and status tracking
6. Delivery confirmation
7. Auto sale confirmation after 10 days

#### Return Processing Flow

1. Return can only be initiated within 10 days of delivery
2. System validates returned items against original package
3. Reverse transport is scheduled for pickup
4. Items are restored to inventory upon processing
5. Product quantities are updated

#### Key Features

- **FIFO Inventory Management** - First In, First Out allocation
- **Database Transactions** - Ensures data consistency
- **Auto Sale Confirmation** - Scheduled job runs daily
- **10-Day Return Window** - Enforced business rule
- **No Customer Data** - Internal operations only
- **Item-Level Traceability** - Track individual items through the system

### Preserved Functionality

- Product and warehouse management
- Supplier and batch management
- Item-level tracking and history
- User authentication and authorization
- Inventory supply management

### Removed Functionality

- Customer model and related logic
- Payment processing
- Shipping/billing addresses
- Complex order calculations
- Refund processing
- Customer profiles and history

### Technical Improvements

- Proper error handling with transactions
- Consistent FIFO implementation
- Modular controller structure
- Comprehensive validation
- Status history tracking
- Scheduled automation

## Usage

1. **Create Order**: Staff enters orders manually from e-commerce platforms
2. **Process Order**: System allocates inventory and creates packages
3. **Assign Transport**: Assign transporters for delivery
4. **Track Delivery**: Monitor package status through delivery
5. **Handle Returns**: Process returns within 10-day window
6. **Confirm Sales**: Automatic confirmation after 10 days

## Installation

Ensure you have the following dependencies in your `package.json`:

```json
{
  "dependencies": {
    "node-cron": "^3.0.0"
  }
}
```

Then start the scheduled jobs in your main server file:

```javascript
import { startScheduledJobs } from "./utils/scheduler.js";

// Start the server and scheduled jobs
startScheduledJobs();
```
