import mongoose from 'mongoose';

const warehouseSchema = new mongoose.Schema({
  warehouseName: { type: String },
  capacity: { type: Number, required: true },
  unit: { type: String, required: true }, // e.g., "kg", "liters", "pcs"
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipcode: { type: String, required: true },
    country: { type: String, required: true }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Warehouse = mongoose.model('Warehouse', warehouseSchema);