# Order Processing Improvements

## 1. Unified Order Model

```javascript
// Single comprehensive order model
const orderSchema = new mongoose.Schema({
  orderNumber: String,
  orderType: { type: String, enum: ["direct", "fulfillment", "backorder"] },
  source: { type: String, enum: ["website", "shopify", "amazon", "manual"] },

  // Customer info (embedded for fulfillment orders)
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: function () {
      return this.orderType === "direct";
    },
  },
  customerInfo: {
    name: String,
    email: String,
    phone: String,
    // Only for fulfillment orders
    required: function () {
      return this.orderType === "fulfillment";
    },
  },

  // Order items with reservation tracking
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number,
      unitPrice: Number,
      reservedQuantity: { type: Number, default: 0 },
      reservedAt: Date,
      reservationExpiry: Date,
      allocatedBatches: [
        {
          batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
          quantity: Number,
          allocatedAt: Date,
        },
      ],
    },
  ],

  // Enhanced status tracking
  status: {
    type: String,
    enum: [
      "pending",
      "reserved",
      "confirmed",
      "processing",
      "packed",
      "shipped",
      "delivered",
      "cancelled",
      "returned",
    ],
    default: "pending",
  },

  // Payment integration
  payment: {
    method: String,
    status: { type: String, enum: ["pending", "paid", "failed", "refunded"] },
    transactionId: String,
    amount: Number,
    currency: { type: String, default: "USD" },
  },

  // Fulfillment tracking
  fulfillment: {
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Warehouse" },
    priority: { type: String, enum: ["low", "normal", "high", "urgent"] },
    estimatedShipDate: Date,
    actualShipDate: Date,
    trackingNumber: String,
    carrier: String,
  },
});
```

## 2. Order State Machine

```javascript
// Implement proper state transitions
const ORDER_TRANSITIONS = {
  pending: ["reserved", "cancelled"],
  reserved: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};
```

## 3. Partial Fulfillment Support

- Allow partial shipments
- Track backordered items
- Automatic reorder for out-of-stock items
- Customer notifications for partial fulfillment

## 4. Order Cancellation Logic

- Implement cancellation workflows
- Automatic inventory release
- Refund processing integration
- Cancellation fees calculation
