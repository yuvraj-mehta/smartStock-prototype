import mongoose from 'mongoose';
import { Invoice, Payment, PurchaseOrder } from '../models/index.js';
import { assertWarehouseAccess, catchAsyncErrors, requireAssignedWarehouseId } from '../middlewares/index.js';
import { logAudit } from '../utils/auditLogger.js';
import {
  assertCanInvoicePurchaseOrder,
  assertInvoiceAmountCoversCompletedPayments,
  clearPurchaseOrderInvoice,
  createProcurementError,
  syncInvoiceStatus,
  withSession,
} from '../services/procurement/procurement.service.js';

const UPDATE_OPTIONS = { new: true, runValidators: true };

const runWithOptionalSession = (query, session) => (session ? query.session(session) : query);

const assertPurchaseOrderWarehouseAccess = async (req, purchaseOrderId, session) => {
  const purchaseOrder = await runWithOptionalSession(PurchaseOrder.findById(purchaseOrderId), session);
  if (!purchaseOrder) {
    throw createProcurementError(404, 'Purchase order not found.');
  }

  assertWarehouseAccess(req, purchaseOrder.warehouseId);
  return purchaseOrder;
};

const getScopedPurchaseOrderIds = async (req) => {
  const warehouseId = requireAssignedWarehouseId(req);
  return PurchaseOrder.find({ warehouseId }).distinct('_id');
};

// Create Invoice
export const createInvoice = catchAsyncErrors(async (req, res) => {
  const { purchaseOrderId, amount, dueDate, paidDate, status } = req.body;
  if (!purchaseOrderId || !amount || !dueDate) {
    return res.status(400).json({ message: 'All required fields must be provided.' });
  }
  if (amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number.' });
  }

  const session = await mongoose.startSession();
  let invoice;

  try {
    await session.withTransaction(async () => {
      await assertPurchaseOrderWarehouseAccess(req, purchaseOrderId, session);
      await assertCanInvoicePurchaseOrder({ purchaseOrderId, amount, session });
      invoice = new Invoice({ purchaseOrderId, amount, dueDate, paidDate, status });
      await invoice.save({ session });
      invoice = await syncInvoiceStatus(invoice._id, session) || invoice;
    });
  } finally {
    await session.endSession();
  }

  // Audit log
  await logAudit({
    userId: req.user?._id,
    action: "CREATE_INVOICE",
    entityType: "Invoice",
    entityId: invoice._id,
    value: amount,
    details: `PO: ${purchaseOrderId}, Due: ${dueDate}`
  });
  res.status(201).json({ message: 'Invoice created', invoice });
});

// Get all Invoices
export const getAllInvoices = catchAsyncErrors(async (req, res) => {
  const purchaseOrderIds = await getScopedPurchaseOrderIds(req);
  const invoices = await Invoice.find({ purchaseOrderId: { $in: purchaseOrderIds } }).populate('purchaseOrderId');
  res.json(invoices);
});

// Update Invoice
export const updateInvoice = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();
  let invoice;

  try {
    await session.withTransaction(async () => {
      const existingInvoice = await Invoice.findById(id).session(session);
      if (!existingInvoice) {
        throw createProcurementError(404, 'Invoice not found.');
      }

      const nextPurchaseOrderId = req.body.purchaseOrderId ?? existingInvoice.purchaseOrderId;
      const nextAmount = req.body.amount ?? existingInvoice.amount;

      await assertPurchaseOrderWarehouseAccess(req, existingInvoice.purchaseOrderId, session);
      if (req.body.purchaseOrderId !== undefined) {
        await assertPurchaseOrderWarehouseAccess(req, req.body.purchaseOrderId, session);
      }

      await assertCanInvoicePurchaseOrder({
        purchaseOrderId: nextPurchaseOrderId,
        amount: nextAmount,
        session,
        currentInvoiceId: existingInvoice._id,
      });
      await assertInvoiceAmountCoversCompletedPayments({
        invoiceId: existingInvoice._id,
        amount: nextAmount,
        session,
      });

      invoice = await Invoice.findByIdAndUpdate(id, req.body, withSession(UPDATE_OPTIONS, session));

      if (
        existingInvoice?.purchaseOrderId
        && invoice?.purchaseOrderId
        && existingInvoice.purchaseOrderId.toString() !== invoice.purchaseOrderId.toString()
      ) {
        await clearPurchaseOrderInvoice(existingInvoice.purchaseOrderId, invoice._id, session);
      }

      if (invoice) {
        invoice = await syncInvoiceStatus(invoice._id, session) || invoice;
      }
    });
  } finally {
    await session.endSession();
  }

  res.json(invoice);
});

// Delete Invoice
export const deleteInvoice = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const invoice = await Invoice.findById(id).session(session);

      if (invoice) {
        await assertPurchaseOrderWarehouseAccess(req, invoice.purchaseOrderId, session);
        await Payment.deleteMany({ invoiceId: invoice._id }).session(session);
        await Invoice.findByIdAndDelete(id).session(session);
        await clearPurchaseOrderInvoice(invoice.purchaseOrderId, invoice._id, session);
      } else {
        await Invoice.findByIdAndDelete(id).session(session);
      }
    });
  } finally {
    await session.endSession();
  }

  res.json({ message: 'Invoice deleted' });
});
