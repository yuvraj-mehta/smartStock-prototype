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
}, { timestamps: true });

export const Inventory = mongoose.model('Inventory', inventorySchema);
