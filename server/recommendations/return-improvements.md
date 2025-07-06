# Returns Processing Improvements

## 1. Enhanced Return Model

```javascript
const returnSchema = new mongoose.Schema({
  returnNumber: { type: String, required: true, unique: true },

  // Return source
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },

  // Return details
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      batchId: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
      itemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Item" }],
      quantity: Number,
      returnReason: {
        type: String,
        enum: [
          "defective",
          "damaged",
          "wrong_item",
          "not_as_described",
          "unwanted",
          "quality_issue",
        ],
      },
      condition: {
        type: String,
        enum: ["new", "used", "damaged", "defective"],
      },
      returnableQuantity: Number,
      refundAmount: Number,
      restockFee: { type: Number, default: 0 },
    },
  ],

  // Return process
  status: {
    type: String,
    enum: [
      "initiated",
      "approved",
      "label_sent",
      "in_transit",
      "received",
      "inspected",
      "processed",
      "rejected",
      "completed",
    ],
    default: "initiated",
  },

  // Return authorization
  authorization: {
    rmaNumber: String,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: Date,
    expiresAt: Date,
    returnLabel: String,
    returnCarrier: String,
  },

  // Inspection results
  inspection: {
    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    inspectedAt: Date,
    notes: String,
    photos: [String],
    itemConditions: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: "Item" },
        condition: String,
        decision: { type: String, enum: ["approve", "reject", "partial"] },
        notes: String,
      },
    ],
  },

  // Refund processing
  refund: {
    method: { type: String, enum: ["original", "store_credit", "exchange"] },
    amount: Number,
    processedAt: Date,
    transactionId: String,
    status: { type: String, enum: ["pending", "processed", "failed"] },
  },

  // Restocking
  restocking: {
    restockableItems: [{ type: mongoose.Schema.Types.ObjectId, ref: "Item" }],
    damagedItems: [{ type: mongoose.Schema.Types.ObjectId, ref: "Item" }],
    restockedAt: Date,
    restockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
});
```

## 2. Return Workflow Management

```javascript
// Return state machine
const RETURN_TRANSITIONS = {
  initiated: ["approved", "rejected"],
  approved: ["label_sent", "rejected"],
  label_sent: ["in_transit", "expired"],
  in_transit: ["received"],
  received: ["inspected"],
  inspected: ["processed", "rejected"],
  processed: ["completed"],
  rejected: ["completed"],
  completed: [],
};

// Automated return processing
class ReturnProcessor {
  async processReturn(returnId) {
    const returnOrder = await Return.findById(returnId);

    // Validate return eligibility
    const eligibility = await this.validateReturnEligibility(returnOrder);
    if (!eligibility.valid) {
      return this.rejectReturn(returnOrder, eligibility.reason);
    }

    // Generate RMA
    const rma = await this.generateRMA(returnOrder);

    // Send return label
    await this.sendReturnLabel(returnOrder, rma);

    // Update status
    returnOrder.status = "label_sent";
    await returnOrder.save();
  }

  async validateReturnEligibility(returnOrder) {
    // Check return window
    const returnWindow = 30; // days
    const orderDate = returnOrder.orderId.orderDate;
    const daysSinceOrder = (Date.now() - orderDate) / (1000 * 60 * 60 * 24);

    if (daysSinceOrder > returnWindow) {
      return { valid: false, reason: "Return window expired" };
    }

    // Check product return policy
    // Check order status
    // Check previous returns

    return { valid: true };
  }
}
```

## 3. Return Analytics

- Return rate by product/category
- Return reason analysis
- Return cost analysis
- Supplier quality metrics based on returns

## 4. Advanced Return Features

- Automated return label generation
- Return tracking integration
- Cross-dock returns (direct to supplier)
- Return merchandise authorization (RMA) system
- Return fraud detection
