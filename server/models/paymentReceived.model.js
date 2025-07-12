import mongoose from 'mongoose';

const paymentReceivedSchema = new mongoose.Schema({
  salesInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesInvoice', required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
  method: { type: String, enum: ['cash', 'bank', 'cheque', 'upi', 'other'], default: 'other' },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
}, { timestamps: true });

export const PaymentReceived = mongoose.model('PaymentReceived', paymentReceivedSchema);
