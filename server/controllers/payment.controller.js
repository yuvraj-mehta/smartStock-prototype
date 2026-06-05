import mongoose from 'mongoose';
import { Invoice, Payment, PurchaseOrder } from '../models/index.js';
import { assertWarehouseAccess, catchAsyncErrors, requireAssignedWarehouseId } from '../middlewares/index.js';
import { logAudit } from '../utils/auditLogger.js';
import {
  assertPaymentDoesNotOverpay,
  createProcurementError,
  syncInvoiceStatus,
  withSession,
} from '../services/procurement/procurement.service.js';

const UPDATE_OPTIONS = { new: true, runValidators: true };

const runWithOptionalSession = (query, session) => (session ? query.session(session) : query);

const assertInvoiceWarehouseAccess = async (req, invoiceId, session) => {
  const invoice = await runWithOptionalSession(Invoice.findById(invoiceId), session);
  if (!invoice) {
    throw createProcurementError(404, 'Invoice not found.');
  }

  const purchaseOrder = await runWithOptionalSession(PurchaseOrder.findById(invoice.purchaseOrderId), session);
  if (!purchaseOrder) {
    throw createProcurementError(404, 'Purchase order not found.');
  }

  assertWarehouseAccess(req, purchaseOrder.warehouseId);
  return invoice;
};

const getScopedInvoiceIds = async (req) => {
  const warehouseId = requireAssignedWarehouseId(req);
  const purchaseOrderIds = await PurchaseOrder.find({ warehouseId }).distinct('_id');
  return Invoice.find({ purchaseOrderId: { $in: purchaseOrderIds } }).distinct('_id');
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
      await assertInvoiceWarehouseAccess(req, invoiceId, session);
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
  const invoiceIds = await getScopedInvoiceIds(req);
  const payments = await Payment.find({ invoiceId: { $in: invoiceIds } }).populate('invoiceId');
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

      await assertInvoiceWarehouseAccess(req, existingPayment.invoiceId, session);
      if (req.body.invoiceId !== undefined) {
        await assertInvoiceWarehouseAccess(req, req.body.invoiceId, session);
      }

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
      if (!payment) {
        throw createProcurementError(404, 'Payment not found.');
      }

      await assertInvoiceWarehouseAccess(req, payment.invoiceId, session);
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
