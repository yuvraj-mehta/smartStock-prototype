import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  packageId: {
    type: String,
    required: true,
    unique: true,
    default: function () {
      return `PKG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    }
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  allocatedItems: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    itemIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item'
    }]
  }],
  packageStatus: {
    type: String,
    enum: ['created', 'ready_for_dispatch', 'dispatched', 'in_transit', 'delivered', 'returned'],
    default: 'created'
  },
  totalWeight: {
    type: Number,
    required: true
  },
  totalVolume: {
    type: Number,
    required: true
  },
  totalValue: {
    type: Number,
    required: true
  },
  packedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  packedAt: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  }
}, { timestamps: true });

export const Package = mongoose.model('Package', packageSchema);
