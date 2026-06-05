import mongoose from 'mongoose';
import { PurchaseOrder, Invoice, Payment } from '../models/index.js';
import { catchAsyncErrors } from '../middlewares/index.js';
import { logAudit } from '../utils/auditLogger.js';

const UPDATE_OPTIONS = { new: true, runValidators: true };

const withSession = (options, session) => ({ ...options, session });

const invoiceStatusToPaymentStatus = (status) => {
  if (status === 'paid') return 'paid';
  if (status === 'partial') return 'partial';
  return 'unpaid';
};

const syncPurchaseOrderFromInvoice = async (invoiceId, session) => {
  const invoice = await Invoice.findById(invoiceId).session(session);

  if (!invoice?.purchaseOrderId) {
    return null;
  }

  return PurchaseOrder.findByIdAndUpdate(
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

// Create Purchase Order
export const createPurchaseOrder = catchAsyncErrors(async (req, res) => {
  const { supplierId, productId, quantity, unitCost, totalCost, status, paymentStatus, invoiceId } = req.body;
  if (!supplierId || !productId || !quantity || !unitCost || !totalCost) {
    return res.status(400).json({ message: 'All required fields must be provided.' });
  }
  if (quantity <= 0 || unitCost <= 0 || totalCost <= 0) {
    return res.status(400).json({ message: 'Quantity, unit cost, and total cost must be positive numbers.' });
  }

  const session = await mongoose.startSession();
  let po;

  try {
    await session.withTransaction(async () => {
      po = new PurchaseOrder({ supplierId, productId, quantity, unitCost, totalCost, status, paymentStatus, invoiceId });
      await po.save({ session });

      if (invoiceId) {
        await Invoice.findByIdAndUpdate(
          invoiceId,
          { $set: { purchaseOrderId: po._id } },
          withSession(UPDATE_OPTIONS, session)
        );

        po = await syncPurchaseOrderFromInvoice(invoiceId, session) || po;
      }
    });
  } finally {
    await session.endSession();
  }

  // Audit log
  await logAudit({
    userId: req.user?._id,
    action: "CREATE_PURCHASE_ORDER",
    entityType: "PurchaseOrder",
    entityId: po._id,
    value: totalCost,
    details: `Supplier: ${supplierId}, Product: ${productId}, Quantity: ${quantity}`
  });
  res.status(201).json({ message: 'Purchase order created', purchaseOrder: po });
});

// Get all Purchase Orders
export const getAllPurchaseOrders = catchAsyncErrors(async (req, res) => {
  const pos = await PurchaseOrder.find().populate('supplierId productId invoiceId');
  res.json(pos);
});

// Update Purchase Order
export const updatePurchaseOrder = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();
  let po;

  try {
    await session.withTransaction(async () => {
      po = await PurchaseOrder.findByIdAndUpdate(id, req.body, withSession(UPDATE_OPTIONS, session));

      if (po?.invoiceId) {
        await Invoice.findByIdAndUpdate(
          po.invoiceId,
          { $set: { purchaseOrderId: po._id } },
          withSession(UPDATE_OPTIONS, session)
        );

        po = await syncPurchaseOrderFromInvoice(po.invoiceId, session) || po;
      }
    });
  } finally {
    await session.endSession();
  }

  res.json(po);
});

// Delete Purchase Order
export const deletePurchaseOrder = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const po = await PurchaseOrder.findById(id).session(session);
      const invoiceQuery = po?.invoiceId
        ? { $or: [{ purchaseOrderId: id }, { _id: po.invoiceId }] }
        : { purchaseOrderId: id };
      const invoices = await Invoice.find(invoiceQuery).session(session);
      const invoiceIds = invoices.map((invoice) => invoice._id);

      if (invoiceIds.length > 0) {
        await Payment.deleteMany({ invoiceId: { $in: invoiceIds } }).session(session);
        await Invoice.deleteMany({ _id: { $in: invoiceIds } }).session(session);
      }

      await PurchaseOrder.findByIdAndDelete(id).session(session);
    });
  } finally {
    await session.endSession();
  }

  res.json({ message: 'Purchase order deleted' });
});
