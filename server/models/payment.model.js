import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
  method: { type: String, enum: ['cash', 'bank', 'cheque', 'upi', 'other'], default: 'other' },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
}, { timestamps: true });

export const Payment = mongoose.model('Payment', paymentSchema);
