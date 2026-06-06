import mongoose from 'mongoose';
import { Batch, FinancialEvent, Order, PaymentReceived, SalesInvoice, SalesOrder } from '../models/index.js';
import { catchAsyncErrors, normalizeId, requireAssignedWarehouseId } from '../middlewares/index.js';
import {
  recordCustomerPaymentEvent,
  reverseUnreversedFinancialEventsForSource,
} from '../services/finance/index.js';

const UPDATE_OPTIONS = { new: true, runValidators: true };
const TRANSACTION_OPTIONS = {
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' },
};
const COMPLETED_STATUS = 'completed';
const CUSTOMER_PAYMENT_EVENT_TYPE = 'customer_payment';
const PAYMENT_RECEIVED_SOURCE_MODEL = 'PaymentReceived';

const withSession = (options, session) => ({ ...options, session });
const uniqueIds = (ids) => [...new Set(ids.map(normalizeId).filter(Boolean))];
const hasValue = (value) => value !== undefined && value !== null && value !== '';

const asObjectId = (id) => (
  id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id)
);

const invoiceStatusToPaymentStatus = (status) => {
  if (status === 'paid') return 'paid';
  if (status === 'partial') return 'partial';
  return 'unpaid';
};

const normalizePaymentStatus = (payment) => payment?.status || 'pending';

const normalizePaymentAmount = (payment) => Number(payment?.amount) || 0;

const normalizePaymentDate = (payment) => (
  payment?.date ? new Date(payment.date).getTime() : undefined
);

const isCompletedPayment = (payment) => normalizePaymentStatus(payment) === COMPLETED_STATUS;

const getReceivableTarget = ({ salesInvoiceId, orderId }) => {
  if (hasValue(salesInvoiceId) === hasValue(orderId)) {
    throw Object.assign(new Error('Payment received must reference exactly one sales invoice or canonical order.'), { statusCode: 400 });
  }

  return hasValue(orderId)
    ? { type: 'order', field: 'orderId', id: orderId }
    : { type: 'salesInvoice', field: 'salesInvoiceId', id: salesInvoiceId };
};

const getNextReceivableTarget = (existingPayment, body) => getReceivableTarget({
  salesInvoiceId: body.salesInvoiceId !== undefined ? body.salesInvoiceId : existingPayment.salesInvoiceId,
  orderId: body.orderId !== undefined ? body.orderId : existingPayment.orderId,
});

const sameReceivableTarget = (leftPayment, rightPayment) => (
  normalizeId(leftPayment?.salesInvoiceId) === normalizeId(rightPayment?.salesInvoiceId)
  && normalizeId(leftPayment?.orderId) === normalizeId(rightPayment?.orderId)
);

const getTargetLockKey = (target) => `${target.type}:${normalizeId(target.id)}`;

const assertLockMatched = (result, message) => {
  if (result?.matchedCount === 0) {
    throw Object.assign(new Error(message), { statusCode: 404 });
  }
};

const lockReceivableTarget = async (target, session) => {
  // Touch the receivable document so concurrent payment writers serialize on the same Mongo write lock.
  const update = { $set: { updatedAt: new Date() } };
  const options = { session, timestamps: false };

  if (target.type === 'order') {
    const result = await Order.updateOne(
      { _id: asObjectId(target.id) },
      update,
      options
    );
    assertLockMatched(result, 'Order not found.');
    return;
  }

  const result = await SalesInvoice.updateOne(
    { _id: asObjectId(target.id) },
    update,
    options
  );
  assertLockMatched(result, 'Sales invoice not found.');
};

const lockReceivableTargets = async (targets, session) => {
  const uniqueTargets = new Map();
  for (const target of targets) {
    uniqueTargets.set(getTargetLockKey(target), target);
  }

  const sortedTargets = [...uniqueTargets.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, target]) => target);

  for (const target of sortedTargets) {
    await lockReceivableTarget(target, session);
  }
};

const hasLedgerRelevantChange = (previousPayment, payment) => {
  if (!previousPayment) return isCompletedPayment(payment);
  if (!payment) return isCompletedPayment(previousPayment);

  return (
    normalizePaymentStatus(previousPayment) !== normalizePaymentStatus(payment)
    || !sameReceivableTarget(previousPayment, payment)
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

const getCompletedOrderPaymentSummary = async (orderId, session, excludePaymentId) => {
  const match = { orderId: asObjectId(orderId), status: 'completed' };
  if (excludePaymentId) match._id = { $ne: asObjectId(excludePaymentId) };

  const [summary] = await PaymentReceived.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$orderId',
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

const getCanonicalOrderReceivableAmount = async ({ orderId, warehouseId, session }) => {
  const events = await FinancialEvent.find({
    eventType: 'sales_invoice',
    referenceType: 'Order',
    referenceId: asObjectId(orderId),
    warehouseId: asObjectId(warehouseId),
  }).session(session);

  return events.reduce((sum, event) => sum + (Number(event.amount) || 0), 0);
};

const getScopedSalesOrderIds = async (req) => {
  const warehouseId = requireAssignedWarehouseId(req);
  const batchIds = await Batch.find({ warehouseId }).distinct('_id');
  if (batchIds.length === 0) return [];

  return SalesOrder.find({ 'fulfilledItems.batchId': { $in: batchIds } }).distinct('_id');
};

const getScopedSalesInvoiceIds = async (req) => {
  const salesOrderIds = await getScopedSalesOrderIds(req);
  if (salesOrderIds.length === 0) return [];

  return SalesInvoice.find({ salesOrderId: { $in: salesOrderIds } }).distinct('_id');
};

const getScopedCanonicalOrderIds = async (req) => {
  const warehouseId = requireAssignedWarehouseId(req);
  const events = await FinancialEvent.find({
    eventType: 'sales_invoice',
    referenceType: 'Order',
    warehouseId,
  }).select('referenceId');

  return uniqueIds(events.map((event) => event.referenceId));
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

const assertCanonicalOrderWarehouseAccess = async (req, orderId, session) => {
  const warehouseId = requireAssignedWarehouseId(req);
  const order = await Order.findById(orderId).session(session);
  if (!order) {
    throw Object.assign(new Error('Order not found.'), { statusCode: 404 });
  }

  const receivableAmount = await getCanonicalOrderReceivableAmount({ orderId, warehouseId, session });
  if (receivableAmount <= 0) {
    throw Object.assign(new Error('Order has no warehouse-scoped receivable to settle.'), { statusCode: 400 });
  }

  return { order, receivableAmount };
};

const assertCompletedReceiptDoesNotOverpay = async ({
  target,
  amount,
  status,
  session,
  excludePaymentId,
}) => {
  if (status !== 'completed') return;

  if (target.type === 'order') {
    const receivableAmount = target.receivableAmount
      ?? (await assertCanonicalOrderWarehouseAccess(target.req, target.id, session)).receivableAmount;
    const { paidAmount } = await getCompletedOrderPaymentSummary(target.id, session, excludePaymentId);
    const nextPaidAmount = paidAmount + (Number(amount) || 0);

    if (nextPaidAmount > receivableAmount) {
      throw Object.assign(new Error('Payment received exceeds the canonical order receivable amount.'), { statusCode: 400 });
    }
    return;
  }

  const invoice = await SalesInvoice.findById(target.id).session(session);
  if (!invoice) {
    throw Object.assign(new Error('Sales invoice not found.'), { statusCode: 404 });
  }

  const { paidAmount } = await getCompletedPaymentSummary(target.id, session, excludePaymentId);
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
    orderId: payment.orderId,
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
  const { salesInvoiceId, orderId, amount, date, method, status } = req.body;
  if (!amount || !date || !method) {
    return res.status(400).json({ message: 'All required fields must be provided.' });
  }
  if (amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number.' });
  }

  const session = await mongoose.startSession();
  let payment;

  try {
    await session.withTransaction(async () => {
      let target = { ...getReceivableTarget({ salesInvoiceId, orderId }), req };

      if (target.type === 'order') {
        const { receivableAmount } = await assertCanonicalOrderWarehouseAccess(req, target.id, session);
        target = { ...target, receivableAmount };
      } else {
        await assertSalesInvoiceWarehouseAccess(req, target.id, session);
      }

      await lockReceivableTargets([target], session);
      await assertCompletedReceiptDoesNotOverpay({
        target,
        amount,
        status: status || 'pending',
        session,
      });
      payment = new PaymentReceived({ salesInvoiceId, orderId, amount, date, method, status });
      await payment.save({ session });
      if (payment.salesInvoiceId) {
        await syncSalesInvoiceStatus(payment.salesInvoiceId, session);
      }
      await syncCustomerPaymentLedger({
        previousPayment: null,
        payment,
        actorId: req.user?._id,
        warehouseId: requireAssignedWarehouseId(req),
        session,
      });
    }, TRANSACTION_OPTIONS);
  } finally {
    await session.endSession();
  }

  res.status(201).json({ message: 'Payment received recorded', paymentReceived: payment });
});

// Get all Payments Received
export const getAllPaymentsReceived = catchAsyncErrors(async (req, res) => {
  const salesInvoiceIds = await getScopedSalesInvoiceIds(req);
  const orderIds = await getScopedCanonicalOrderIds(req);
  const receivableFilters = [];
  if (salesInvoiceIds.length > 0) receivableFilters.push({ salesInvoiceId: { $in: salesInvoiceIds } });
  if (orderIds.length > 0) receivableFilters.push({ orderId: { $in: orderIds } });

  if (receivableFilters.length === 0) {
    return res.json([]);
  }

  const payments = await PaymentReceived.find({ $or: receivableFilters })
    .populate('salesInvoiceId')
    .populate('orderId');
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

      let existingTarget = { ...getReceivableTarget(existingPayment), req };
      let nextTarget = { ...getNextReceivableTarget(existingPayment, req.body), req };

      if (existingTarget.type === 'order') {
        const { receivableAmount } = await assertCanonicalOrderWarehouseAccess(req, existingTarget.id, session);
        existingTarget = { ...existingTarget, receivableAmount };
      } else {
        await assertSalesInvoiceWarehouseAccess(req, existingTarget.id, session);
      }

      if (nextTarget.type === 'order') {
        const { receivableAmount } = sameReceivableTarget(existingPayment, {
          salesInvoiceId: nextTarget.type === 'salesInvoice' ? nextTarget.id : undefined,
          orderId: nextTarget.type === 'order' ? nextTarget.id : undefined,
        })
          ? existingTarget
          : await assertCanonicalOrderWarehouseAccess(req, nextTarget.id, session);
        nextTarget = { ...nextTarget, receivableAmount };
      } else {
        await assertSalesInvoiceWarehouseAccess(req, nextTarget.id, session);
      }

      await lockReceivableTargets([existingTarget, nextTarget], session);
      await assertCompletedReceiptDoesNotOverpay({
        target: nextTarget,
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
        warehouseId: requireAssignedWarehouseId(req),
        session,
      });
    }, TRANSACTION_OPTIONS);
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
      if (!payment) {
        throw Object.assign(new Error('Payment received not found.'), { statusCode: 404 });
      }

      const target = { ...getReceivableTarget(payment), req };
      if (target.type === 'order') {
        await assertCanonicalOrderWarehouseAccess(req, target.id, session);
      } else {
        await assertSalesInvoiceWarehouseAccess(req, target.id, session);
      }
      await lockReceivableTargets([target], session);
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
    }, TRANSACTION_OPTIONS);
  } finally {
    await session.endSession();
  }

  res.json({ message: 'Payment received deleted' });
});
