import { Payment } from '../models/index.js';
import { catchAsyncErrors } from '../middlewares/index.js';
import { logAudit } from '../utils/auditLogger.js';

// Create Payment
export const createPayment = catchAsyncErrors(async (req, res) => {
  const { invoiceId, amount, date, method, status } = req.body;
  if (!invoiceId || !amount || !date || !method) {
    return res.status(400).json({ message: 'All required fields must be provided.' });
  }
  if (amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number.' });
  }
  const payment = await Payment.create({ invoiceId, amount, date, method, status });
  // Audit log
  await logAudit({
    userId: req.user?._id,
    action: "CREATE_PAYMENT",
    entityType: "Payment",
    entityId: payment._id,
    value: amount,
    details: `Invoice: ${invoiceId}, Method: ${method}`
  });
  res.status(201).json({ message: 'Payment recorded', payment });
});

// Get all Payments
export const getAllPayments = catchAsyncErrors(async (req, res) => {
  const payments = await Payment.find().populate('invoiceId');
  res.json(payments);
});

// Update Payment
export const updatePayment = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const payment = await Payment.findByIdAndUpdate(id, req.body, { new: true });
  res.json(payment);
});

// Delete Payment
export const deletePayment = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  await Payment.findByIdAndDelete(id);
  res.json({ message: 'Payment deleted' });
});
