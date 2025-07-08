import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  batchNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExternalUser',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  mfgDate: {
    type: Date,
    required: true
  },
  expDate: {
    type: Date,
    required: true
  },
  receivedAt: {
    type: Date,
    default: Date.now
  },
  condition: {
    type: String,
    enum: ['new', 'damaged', 'expired'],
    default: 'new'
  },
  status: {
    type: String,
    enum: ['active', 'used', 'expired'],
    default: 'active'
  },
  // Financial Tracking Fields
  unitCost: {
    type: Number,
    min: 0,
    required: false
  },
  totalCost: {
    type: Number,
    min: 0,
    required: false
  },
  currency: {
    type: String,
    default: 'INR'
  },
  purchaseOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: false
  }
}, { timestamps: true });

export const Batch = mongoose.model('Batch', batchSchema);