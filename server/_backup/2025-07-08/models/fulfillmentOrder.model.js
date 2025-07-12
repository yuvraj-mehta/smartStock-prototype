import mongoose from 'mongoose';

const fulfillmentOrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    default: function () {
      return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    }
  },

  // E-commerce platform details
  platformOrderId: {
    type: String,
    required: true,
    unique: true // Order ID from the e-commerce platform
  },
  platform: {
    type: String,
    enum: ['shopify', 'amazon', 'website', 'manual'],
    default: 'manual'
  },

  // Customer delivery details (no customer entity needed)
  customerInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true }
  },

  // Shipping address
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipcode: { type: String, required: true },
    country: { type: String, required: true, default: 'USA' }
  },

  // Order items
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    sku: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },

    // Fulfillment details
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch'
    },
    allocatedItemIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item'
    }]
  }],

  // Order financial details
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  total: { type: Number, required: true },

  // Order status tracking
  orderStatus: {
    type: String,
    enum: ['received', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'received'
  },

  // Processing details
  receivedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  packedAt: { type: Date },
  shippedAt: { type: Date },
  deliveredAt: { type: Date },

  // Staff assignment
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Staff who entered the order
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Staff who processed the order
  },
  packedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Staff who packed the order
  },

  // Shipping details
  packageId: { type: String },
  trackingNumber: { type: String },
  transportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transport'
  },
  shippingMethod: {
    type: String,
    enum: ['standard', 'express', 'overnight', 'ground'],
    default: 'standard'
  },

  // Analytics data
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // Processing time tracking (for analysis)
  processingTimes: {
    orderToProcessing: { type: Number }, // minutes
    processingToPacked: { type: Number }, // minutes
    packedToShipped: { type: Number }, // minutes
    shippedToDelivered: { type: Number } // hours
  },

  // Special instructions
  packingNotes: { type: String },
  shippingNotes: { type: String },
  specialInstructions: { type: String },

  // Return information
  returnReason: { type: String },
  returnDate: { type: Date },
  returnProcessed: { type: Boolean, default: false },

  // Status history for tracking
  statusHistory: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    notes: { type: String }
  }]

}, {
  timestamps: true,
  // Add indexes for performance
  indexes: [
    { platformOrderId: 1 },
    { orderStatus: 1 },
    { receivedAt: 1 },
    { 'customerInfo.email': 1 }
  ]
});

// Middleware to update status history
fulfillmentOrderSchema.pre('save', function (next) {
  if (this.isModified('orderStatus')) {
    this.statusHistory.push({
      status: this.orderStatus,
      timestamp: new Date()
    });
  }
  next();
});

export const FulfillmentOrder = mongoose.model('FulfillmentOrder', fulfillmentOrderSchema);
