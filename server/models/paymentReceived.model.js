import mongoose from 'mongoose';

const paymentReceivedSchema = new mongoose.Schema({
  salesInvoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalesInvoice' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  amount: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
  method: { type: String, enum: ['cash', 'bank', 'cheque', 'upi', 'other'], default: 'other' },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
}, { timestamps: true });

paymentReceivedSchema.pre('validate', function validateReceivableTarget(next) {
  const hasSalesInvoice = Boolean(this.salesInvoiceId);
  const hasOrder = Boolean(this.orderId);

  if (hasSalesInvoice === hasOrder) {
    return next(new Error('Payment received must reference exactly one sales invoice or canonical order.'));
  }

  return next();
});

paymentReceivedSchema.index({ salesInvoiceId: 1 });
paymentReceivedSchema.index({ orderId: 1 });

export const PaymentReceived = mongoose.model('PaymentReceived', paymentReceivedSchema);
