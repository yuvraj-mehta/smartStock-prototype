import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema({
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true,
  },
  // Financial Tracking (optional)
  inventoryValue: {
    type: Number,
    min: 0,
    required: false
  }
}, { timestamps: true });

inventorySchema.index({ batchId: 1, warehouseId: 1 }, { unique: true });

export const Inventory = mongoose.model('Inventory', inventorySchema);
