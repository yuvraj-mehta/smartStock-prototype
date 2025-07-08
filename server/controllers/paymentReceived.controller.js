import { PaymentReceived } from '../models/index.js';
import { catchAsyncErrors } from '../middlewares/index.js';

// Create Payment Received
export const createPaymentReceived = catchAsyncErrors(async (req, res) => {
  const { salesInvoiceId, amount, date, method, status } = req.body;
  if (!salesInvoiceId || !amount || !date || !method) {
    return res.status(400).json({ message: 'All required fields must be provided.' });
  }
  if (amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number.' });
  }
  const payment = await PaymentReceived.create({ salesInvoiceId, amount, date, method, status });
  res.status(201).json({ message: 'Payment received recorded', paymentReceived: payment });
});

// Get all Payments Received
export const getAllPaymentsReceived = catchAsyncErrors(async (req, res) => {
  const payments = await PaymentReceived.find().populate('salesInvoiceId');
  res.json(payments);
});

// Update Payment Received
export const updatePaymentReceived = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const payment = await PaymentReceived.findByIdAndUpdate(id, req.body, { new: true });
  res.json(payment);
});

// Delete Payment Received
export const deletePaymentReceived = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  await PaymentReceived.findByIdAndDelete(id);
  res.json({ message: 'Payment received deleted' });
});
