import mongoose from 'mongoose';
import { PaymentReceived, SalesInvoice, SalesOrder } from '../models/index.js';
import { catchAsyncErrors } from '../middlewares/index.js';
import {
  recordCustomerPaymentEvent,
  reverseUnreversedFinancialEventsForSource,
} from '../services/finance/index.js';

const UPDATE_OPTIONS = { new: true, runValidators: true };
const COMPLETED_STATUS = 'completed';
const CUSTOMER_PAYMENT_EVENT_TYPE = 'customer_payment';
const PAYMENT_RECEIVED_SOURCE_MODEL = 'PaymentReceived';

const withSession = (options, session) => ({ ...options, session });

const asObjectId = (id) => (
  id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id)
);

const invoiceStatusToPaymentStatus = (status) => {
  if (status === 'paid') return 'paid';
  if (status === 'partial') return 'partial';
  return 'unpaid';
};

const normalizeId = (id) => (id?._id || id)?.toString();

const normalizePaymentStatus = (payment) => payment?.status || 'pending';

const normalizePaymentAmount = (payment) => Number(payment?.amount) || 0;

const normalizePaymentDate = (payment) => (
  payment?.date ? new Date(payment.date).getTime() : undefined
);

const isCompletedPayment = (payment) => normalizePaymentStatus(payment) === COMPLETED_STATUS;

const hasLedgerRelevantChange = (previousPayment, payment) => {
  if (!previousPayment) return isCompletedPayment(payment);
  if (!payment) return isCompletedPayment(previousPayment);

  return (
    normalizePaymentStatus(previousPayment) !== normalizePaymentStatus(payment)
    || normalizeId(previousPayment.salesInvoiceId) !== normalizeId(payment.salesInvoiceId)
    || normalizePaymentAmount(previousPayment) !== normalizePaymentAmount(payment)
    || normalizePaymentDate(previousPayment) !== normalizePaymentDate(payment)
  );
};

const deriveInvoiceStatus = (invoice, paidAmount) => {
  const amount = Number(invoice.amount) || 0;

  if (amount <= 0 || paidAmount >= amount) return 'paid';
  if (paidAmount > 0) return 'partial';
  if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) return 'overdue';
  return 'unpaid';
};

const getCompletedPaymentSummary = async (salesInvoiceId, session, excludePaymentId) => {
  const match = { salesInvoiceId: asObjectId(salesInvoiceId), status: 'completed' };
  if (excludePaymentId) match._id = { $ne: asObjectId(excludePaymentId) };

  const [summary] = await PaymentReceived.aggregate([
    { $match: match },
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

const assertCompletedReceiptDoesNotOverpay = async ({
  salesInvoiceId,
  amount,
  status,
  session,
  excludePaymentId,
}) => {
  if (status !== 'completed') return;

  const invoice = await SalesInvoice.findById(salesInvoiceId).session(session);
  if (!invoice) {
    throw Object.assign(new Error('Sales invoice not found.'), { statusCode: 404 });
  }

  const { paidAmount } = await getCompletedPaymentSummary(salesInvoiceId, session, excludePaymentId);
  const nextPaidAmount = paidAmount + (Number(amount) || 0);
  const invoiceAmount = Number(invoice.amount) || 0;

  if (nextPaidAmount > invoiceAmount) {
    throw Object.assign(new Error('Payment received exceeds the sales invoice amount.'), { statusCode: 400 });
  }
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

const reverseCustomerPaymentLedger = async ({ payment, actorId, session }) => {
  await reverseUnreversedFinancialEventsForSource({
    eventType: CUSTOMER_PAYMENT_EVENT_TYPE,
    sourceModel: PAYMENT_RECEIVED_SOURCE_MODEL,
    sourceDocumentId: payment._id,
    actorId,
    memo: 'Customer payment receipt changed',
    session,
  });
};

const recordCustomerPaymentLedger = async ({ payment, actorId, warehouseId, session }) => {
  await recordCustomerPaymentEvent({
    amount: payment.amount,
    salesInvoiceId: payment.salesInvoiceId,
    paymentReceivedId: payment._id,
    warehouseId,
    occurredAt: payment.date,
    actorId,
    session,
  });
};

const syncCustomerPaymentLedger = async ({
  previousPayment,
  payment,
  actorId,
  warehouseId,
  session,
}) => {
  const ledgerChanged = hasLedgerRelevantChange(previousPayment, payment);
  if (!ledgerChanged) return;

  if (isCompletedPayment(previousPayment)) {
    await reverseCustomerPaymentLedger({ payment: previousPayment, actorId, session });
  }

  if (isCompletedPayment(payment)) {
    await recordCustomerPaymentLedger({ payment, actorId, warehouseId, session });
  }
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
      await assertCompletedReceiptDoesNotOverpay({
        salesInvoiceId,
        amount,
        status: status || 'pending',
        session,
      });
      payment = new PaymentReceived({ salesInvoiceId, amount, date, method, status });
      await payment.save({ session });
      await syncSalesInvoiceStatus(payment.salesInvoiceId, session);
      await syncCustomerPaymentLedger({
        previousPayment: null,
        payment,
        actorId: req.user?._id,
        warehouseId: req.user?.assignedWarehouseId,
        session,
      });
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
      if (!existingPayment) {
        throw Object.assign(new Error('Payment received not found.'), { statusCode: 404 });
      }

      await assertCompletedReceiptDoesNotOverpay({
        salesInvoiceId: req.body.salesInvoiceId || existingPayment.salesInvoiceId,
        amount: req.body.amount ?? existingPayment.amount,
        status: req.body.status || existingPayment.status,
        session,
        excludePaymentId: existingPayment._id,
      });
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

      await syncCustomerPaymentLedger({
        previousPayment: existingPayment,
        payment,
        actorId: req.user?._id,
        warehouseId: req.user?.assignedWarehouseId,
        session,
      });
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

      await syncCustomerPaymentLedger({
        previousPayment: payment,
        payment: null,
        actorId: req.user?._id,
        warehouseId: req.user?.assignedWarehouseId,
        session,
      });
    });
  } finally {
    await session.endSession();
  }

  res.json({ message: 'Payment received deleted' });
});
