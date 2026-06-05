import mongoose from 'mongoose';
import { Payment, Invoice, PurchaseOrder } from '../models/index.js';
import { catchAsyncErrors } from '../middlewares/index.js';
import { logAudit } from '../utils/auditLogger.js';

const UPDATE_OPTIONS = { new: true, runValidators: true };

const withSession = (options, session) => ({ ...options, session });

const asObjectId = (id) => (
  id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id)
);

const invoiceStatusToPaymentStatus = (status) => {
  if (status === 'paid') return 'paid';
  if (status === 'partial') return 'partial';
  return 'unpaid';
};

const deriveInvoiceStatus = (invoice, paidAmount) => {
  const amount = Number(invoice.amount) || 0;

  if (amount <= 0 || paidAmount >= amount) return 'paid';
  if (paidAmount > 0) return 'partial';
  if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) return 'overdue';
  return 'unpaid';
};

const getCompletedPaymentSummary = async (invoiceId, session) => {
  const [summary] = await Payment.aggregate([
    { $match: { invoiceId: asObjectId(invoiceId), status: 'completed' } },
    {
      $group: {
        _id: '$invoiceId',
        paidAmount: { $sum: { $ifNull: ['$amount', 0] } },
        paidDate: { $max: '$date' },
      },
    },
  ]).session(session);

  return {
    paidAmount: summary?.paidAmount || 0,
    paidDate: summary?.paidDate,
  };
};

const syncPurchaseOrderForInvoice = async (invoice, session) => {
  if (!invoice?.purchaseOrderId) return;

  await PurchaseOrder.findByIdAndUpdate(
    invoice.purchaseOrderId,
    {
      $set: {
        invoiceId: invoice._id,
        paymentStatus: invoiceStatusToPaymentStatus(invoice.status),
      },
    },
    withSession(UPDATE_OPTIONS, session)
  );
};

const syncInvoiceStatus = async (invoiceId, session) => {
  const invoice = await Invoice.findById(invoiceId).session(session);
  if (!invoice) return null;

  const { paidAmount, paidDate } = await getCompletedPaymentSummary(invoice._id, session);
  const status = deriveInvoiceStatus(invoice, paidAmount);
  const update = { $set: { status } };

  if (status === 'paid') {
    update.$set.paidDate = paidDate || invoice.paidDate || new Date();
  } else {
    update.$unset = { paidDate: '' };
  }

  const syncedInvoice = await Invoice.findByIdAndUpdate(
    invoice._id,
    update,
    withSession(UPDATE_OPTIONS, session)
  );

  await syncPurchaseOrderForInvoice(syncedInvoice, session);
  return syncedInvoice;
};

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
