import mongoose from 'mongoose';

const salesInvoiceSchema = new mongoose.Schema({
  salesOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesOrder', required: true },
  amount: { type: Number, required: true, min: 0 },
  dueDate: { type: Date, required: true },
  paidDate: { type: Date },
  status: { type: String, enum: ['unpaid', 'partial', 'paid', 'overdue'], default: 'unpaid' },
}, { timestamps: true });

export const SalesInvoice = mongoose.model('SalesInvoice', salesInvoiceSchema);
