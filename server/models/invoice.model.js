import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  purchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder', required: true },
  amount: { type: Number, required: true, min: 0 },
  dueDate: { type: Date, required: true },
  paidDate: { type: Date },
  status: { type: String, enum: ['unpaid', 'partial', 'paid', 'overdue'], default: 'unpaid' },
}, { timestamps: true });

export const Invoice = mongoose.model('Invoice', invoiceSchema);
