import mongoose from 'mongoose';
import { Payment } from '../models/index.js';
import { catchAsyncErrors } from '../middlewares/index.js';
import { logAudit } from '../utils/auditLogger.js';
import {
  assertPaymentDoesNotOverpay,
  createProcurementError,
  syncInvoiceStatus,
  withSession,
} from '../services/procurement/procurement.service.js';

const UPDATE_OPTIONS = { new: true, runValidators: true };

// Create Payment
export const createPayment = catchAsyncErrors(async (req, res) => {
  const { invoiceId, amount, date, method, status } = req.body;
  if (!invoiceId || !amount || !date || !method) {
    return res.status(400).json({ message: 'All required fields must be provided.' });
  }
  if (amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number.' });
  }

  const session = await mongoose.startSession();
  let payment;

  try {
    await session.withTransaction(async () => {
      await assertPaymentDoesNotOverpay({
        invoiceId,
        amount,
        status: status || 'pending',
        session,
      });

      payment = new Payment({ invoiceId, amount, date, method, status });
      await payment.save({ session });
      await syncInvoiceStatus(payment.invoiceId, session);
    });
  } finally {
    await session.endSession();
  }

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
  const session = await mongoose.startSession();
  let payment;

  try {
    await session.withTransaction(async () => {
      const existingPayment = await Payment.findById(id).session(session);
      if (!existingPayment) {
        throw createProcurementError(404, 'Payment not found.');
      }

      const nextInvoiceId = req.body.invoiceId ?? existingPayment.invoiceId;
      const nextAmount = req.body.amount ?? existingPayment.amount;
      const nextStatus = req.body.status ?? existingPayment.status;

      await assertPaymentDoesNotOverpay({
        invoiceId: nextInvoiceId,
        amount: nextAmount,
        status: nextStatus,
        session,
        excludePaymentId: existingPayment._id,
      });

      payment = await Payment.findByIdAndUpdate(id, req.body, withSession(UPDATE_OPTIONS, session));

      if (
        existingPayment?.invoiceId
        && payment?.invoiceId
        && existingPayment.invoiceId.toString() !== payment.invoiceId.toString()
      ) {
        await syncInvoiceStatus(existingPayment.invoiceId, session);
      }

      if (payment?.invoiceId) {
        await syncInvoiceStatus(payment.invoiceId, session);
      }
    });
  } finally {
    await session.endSession();
  }

  res.json(payment);
});

// Delete Payment
export const deletePayment = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findById(id).session(session);
      await Payment.findByIdAndDelete(id).session(session);

      if (payment?.invoiceId) {
        await syncInvoiceStatus(payment.invoiceId, session);
      }
    });
  } finally {
    await session.endSession();
  }

  res.json({ message: 'Payment deleted' });
});
