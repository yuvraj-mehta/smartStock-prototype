import mongoose from 'mongoose';
import { Batch, SalesInvoice, SalesOrder, PaymentReceived } from '../models/index.js';
import { catchAsyncErrors, normalizeId, requireAssignedWarehouseId } from '../middlewares/index.js';
import { reverseUnreversedFinancialEventsForSource } from '../services/finance/index.js';

const UPDATE_OPTIONS = { new: true, runValidators: true };

const withSession = (options, session) => ({ ...options, session });
const CUSTOMER_PAYMENT_EVENT_TYPE = 'customer_payment';
const PAYMENT_RECEIVED_SOURCE_MODEL = 'PaymentReceived';

const asObjectId = (id) => (
  id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id)
);

const uniqueIds = (ids) => [...new Set(ids.map(normalizeId).filter(Boolean))];

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

const getScopedSalesOrderIds = async (req) => {
  const warehouseId = requireAssignedWarehouseId(req);
  const batchIds = await Batch.find({ warehouseId }).distinct('_id');
  if (batchIds.length === 0) return [];

  return SalesOrder.find({ 'fulfilledItems.batchId': { $in: batchIds } }).distinct('_id');
};

const assertSalesOrderWarehouseAccess = async (req, salesOrderId, session) => {
  const warehouseId = requireAssignedWarehouseId(req);
  const salesOrder = await SalesOrder.findById(salesOrderId).session(session);
  if (!salesOrder) {
    throw Object.assign(new Error('Sales order not found.'), { statusCode: 404 });
  }

  const batchIds = uniqueIds(salesOrder.fulfilledItems?.map((item) => item.batchId) || []);
  if (batchIds.length === 0) {
    throw Object.assign(new Error('Sales order has no warehouse-scoped fulfilled inventory.'), { statusCode: 403 });
  }

  const scopedBatchCount = await Batch.countDocuments({
    _id: { $in: batchIds },
    warehouseId,
  }).session(session);

  if (scopedBatchCount !== batchIds.length) {
    throw Object.assign(new Error('Access denied for this warehouse.'), { statusCode: 403 });
  }

  return salesOrder;
};

const assertSalesInvoiceWarehouseAccess = async (req, salesInvoiceId, session) => {
  const invoice = await SalesInvoice.findById(salesInvoiceId).session(session);
  if (!invoice) {
    throw Object.assign(new Error('Sales invoice not found.'), { statusCode: 404 });
  }

  await assertSalesOrderWarehouseAccess(req, invoice.salesOrderId, session);
  return invoice;
};

const assertSalesInvoiceAmountCoversCompletedReceipts = async ({
  salesInvoiceId,
  amount,
  session,
}) => {
  const { paidAmount } = await getCompletedPaymentSummary(salesInvoiceId, session);
  if (paidAmount > (Number(amount) || 0)) {
    throw Object.assign(new Error('Sales invoice amount cannot be less than completed received payments.'), { statusCode: 400 });
  }
};

const reverseCustomerPaymentLedgerForPayments = async ({ payments, actorId, session }) => {
  for (const payment of payments) {
    await reverseUnreversedFinancialEventsForSource({
      eventType: CUSTOMER_PAYMENT_EVENT_TYPE,
      sourceModel: PAYMENT_RECEIVED_SOURCE_MODEL,
      sourceDocumentId: payment._id,
      actorId,
      memo: 'Sales invoice deleted',
      session,
    });
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

const clearSalesOrderInvoice = async (salesOrderId, salesInvoiceId, session) => {
  if (!salesOrderId) return;

  await SalesOrder.updateOne(
    { _id: salesOrderId, salesInvoiceId },
    { $unset: { salesInvoiceId: '' }, $set: { paymentStatus: 'unpaid' } },
    { session, runValidators: true }
  );
};

// Create Sales Invoice
export const createSalesInvoice = catchAsyncErrors(async (req, res) => {
  const { salesOrderId, amount, dueDate, paidDate, status } = req.body;
  if (!salesOrderId || !amount || !dueDate) {
    return res.status(400).json({ message: 'All required fields must be provided.' });
  }
  if (amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number.' });
  }

  const session = await mongoose.startSession();
  let invoice;

  try {
    await session.withTransaction(async () => {
      await assertSalesOrderWarehouseAccess(req, salesOrderId, session);
      invoice = new SalesInvoice({ salesOrderId, amount, dueDate, paidDate, status });
      await invoice.save({ session });
      invoice = await syncSalesInvoiceStatus(invoice._id, session) || invoice;
    });
  } finally {
    await session.endSession();
  }

  res.status(201).json({ message: 'Sales invoice created', salesInvoice: invoice });
});

// Get all Sales Invoices
export const getAllSalesInvoices = catchAsyncErrors(async (req, res) => {
  const salesOrderIds = await getScopedSalesOrderIds(req);
  const invoices = await SalesInvoice.find({ salesOrderId: { $in: salesOrderIds } }).populate('salesOrderId');
  res.json(invoices);
});

// Update Sales Invoice
export const updateSalesInvoice = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();
  let invoice;

  try {
    await session.withTransaction(async () => {
      const existingInvoice = await assertSalesInvoiceWarehouseAccess(req, id, session);
      if (req.body.salesOrderId !== undefined) {
        await assertSalesOrderWarehouseAccess(req, req.body.salesOrderId, session);
      }

      const nextAmount = req.body.amount ?? existingInvoice.amount;
      await assertSalesInvoiceAmountCoversCompletedReceipts({
        salesInvoiceId: existingInvoice._id,
        amount: nextAmount,
        session,
      });

      invoice = await SalesInvoice.findByIdAndUpdate(id, req.body, withSession(UPDATE_OPTIONS, session));

      if (
        existingInvoice?.salesOrderId
        && invoice?.salesOrderId
        && existingInvoice.salesOrderId.toString() !== invoice.salesOrderId.toString()
      ) {
        await clearSalesOrderInvoice(existingInvoice.salesOrderId, invoice._id, session);
      }

      if (invoice) {
        invoice = await syncSalesInvoiceStatus(invoice._id, session) || invoice;
      }
    });
  } finally {
    await session.endSession();
  }

  res.json(invoice);
});

// Delete Sales Invoice
export const deleteSalesInvoice = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const invoice = await assertSalesInvoiceWarehouseAccess(req, id, session);

      if (invoice) {
        const completedPayments = await PaymentReceived.find({
          salesInvoiceId: invoice._id,
          status: 'completed',
        }).session(session);
        await reverseCustomerPaymentLedgerForPayments({
          payments: completedPayments,
          actorId: req.user?._id,
          session,
        });
        await PaymentReceived.deleteMany({ salesInvoiceId: invoice._id }).session(session);
        await SalesInvoice.findByIdAndDelete(id).session(session);
        await clearSalesOrderInvoice(invoice.salesOrderId, invoice._id, session);
      }
    });
  } finally {
    await session.endSession();
  }

  res.json({ message: 'Sales invoice deleted' });
});
