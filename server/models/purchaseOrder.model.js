import mongoose from 'mongoose';

const purchaseOrderSchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExternalUser', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  quantity: { type: Number, required: true, min: 0 },
  receivedQuantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    validate: {
      validator(value) {
        return this.quantity === undefined || value <= this.quantity;
      },
      message: 'Received quantity cannot exceed ordered quantity',
    },
  },
  unitCost: { type: Number, required: true, min: 0 },
  totalCost: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending', 'received', 'cancelled'], default: 'pending' },
  paymentStatus: { type: String, enum: ['unpaid', 'partial', 'paid'], default: 'unpaid' },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
}, { timestamps: true });

export const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
