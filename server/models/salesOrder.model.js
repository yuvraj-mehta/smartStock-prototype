import mongoose from 'mongoose';

const salesOrderSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending', 'fulfilled', 'cancelled'], default: 'pending' },
  salesInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesInvoice' },
}, { timestamps: true });

export const SalesOrder = mongoose.model('SalesOrder', salesOrderSchema);
