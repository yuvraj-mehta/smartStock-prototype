import mongoose from 'mongoose';
import { Invoice, Payment, PurchaseOrder } from '../models/index.js';
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

const clearPurchaseOrderInvoice = async (purchaseOrderId, invoiceId, session) => {
  if (!purchaseOrderId) return;

  await PurchaseOrder.updateOne(
    { _id: purchaseOrderId, invoiceId },
    { $unset: { invoiceId: '' }, $set: { paymentStatus: 'unpaid' } },
    { session, runValidators: true }
  );
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
  const invoices = await Invoice.find().populate('purchaseOrderId');
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
