import mongoose from 'mongoose';
import { PaymentReceived, SalesInvoice, SalesOrder } from '../models/index.js';
import { catchAsyncErrors } from '../middlewares/index.js';

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

const getCompletedPaymentSummary = async (salesInvoiceId, session) => {
  const [summary] = await PaymentReceived.aggregate([
    { $match: { salesInvoiceId: asObjectId(salesInvoiceId), status: 'completed' } },
    {
      $group: {
        _id: '$salesInvoiceId',
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

const syncSalesOrderForInvoice = async (invoice, session) => {
  if (!invoice?.salesOrderId) return;

  await SalesOrder.findByIdAndUpdate(
    invoice.salesOrderId,
    {
      $set: {
        salesInvoiceId: invoice._id,
        paymentStatus: invoiceStatusToPaymentStatus(invoice.status),
      },
    },
    withSession(UPDATE_OPTIONS, session)
  );
};

const syncSalesInvoiceStatus = async (salesInvoiceId, session) => {
  const invoice = await SalesInvoice.findById(salesInvoiceId).session(session);
  if (!invoice) return null;

  const { paidAmount, paidDate } = await getCompletedPaymentSummary(invoice._id, session);
  const status = deriveInvoiceStatus(invoice, paidAmount);
  const update = { $set: { status } };

  if (status === 'paid') {
    update.$set.paidDate = paidDate || invoice.paidDate || new Date();
  } else {
    update.$unset = { paidDate: '' };
  }

  const syncedInvoice = await SalesInvoice.findByIdAndUpdate(
    invoice._id,
    update,
    withSession(UPDATE_OPTIONS, session)
  );

  await syncSalesOrderForInvoice(syncedInvoice, session);
  return syncedInvoice;
};

// Create Payment Received
export const createPaymentReceived = catchAsyncErrors(async (req, res) => {
  const { salesInvoiceId, amount, date, method, status } = req.body;
  if (!salesInvoiceId || !amount || !date || !method) {
    return res.status(400).json({ message: 'All required fields must be provided.' });
  }
  if (amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number.' });
  }

  const session = await mongoose.startSession();
  let payment;

  try {
    await session.withTransaction(async () => {
      payment = new PaymentReceived({ salesInvoiceId, amount, date, method, status });
      await payment.save({ session });
      await syncSalesInvoiceStatus(payment.salesInvoiceId, session);
    });
  } finally {
    await session.endSession();
  }

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
  const session = await mongoose.startSession();
  let payment;

  try {
    await session.withTransaction(async () => {
      const existingPayment = await PaymentReceived.findById(id).session(session);
      payment = await PaymentReceived.findByIdAndUpdate(id, req.body, withSession(UPDATE_OPTIONS, session));

      if (
        existingPayment?.salesInvoiceId
        && payment?.salesInvoiceId
        && existingPayment.salesInvoiceId.toString() !== payment.salesInvoiceId.toString()
      ) {
        await syncSalesInvoiceStatus(existingPayment.salesInvoiceId, session);
      }

      if (payment?.salesInvoiceId) {
        await syncSalesInvoiceStatus(payment.salesInvoiceId, session);
      }
    });
  } finally {
    await session.endSession();
  }

  res.json(payment);
});

// Delete Payment Received
export const deletePaymentReceived = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const payment = await PaymentReceived.findById(id).session(session);
      await PaymentReceived.findByIdAndDelete(id).session(session);

      if (payment?.salesInvoiceId) {
        await syncSalesInvoiceStatus(payment.salesInvoiceId, session);
      }
    });
  } finally {
    await session.endSession();
  }

  res.json({ message: 'Payment received deleted' });
});
