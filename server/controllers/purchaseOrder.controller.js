import mongoose from 'mongoose';
import { PurchaseOrder, Invoice, Payment } from '../models/index.js';
import {
  assertWarehouseAccess,
  catchAsyncErrors,
  requireAssignedWarehouseId,
} from '../middlewares/index.js';
import { logAudit } from '../utils/auditLogger.js';
import {
  assertInvoiceCanBeAssignedToPurchaseOrder,
  assertValidProcurementRelationship,
  createProcurementError,
  syncInvoiceStatus,
  validatePurchaseOrderAmounts,
  withSession,
} from '../services/procurement/procurement.service.js';

const UPDATE_OPTIONS = { new: true, runValidators: true };

const assignDefined = (target, source, fields) => {
  for (const field of fields) {
    if (source[field] !== undefined) {
      target[field] = source[field];
    }
  }
  return target;
};

// Create Purchase Order
export const createPurchaseOrder = catchAsyncErrors(async (req, res) => {
  const {
    supplierId,
    productId,
    warehouseId,
    quantity,
    receivedQuantity = 0,
    unitCost,
    totalCost,
    status,
    paymentStatus,
    invoiceId
  } = req.body;
  if (!supplierId || !productId || !warehouseId || quantity === undefined || unitCost === undefined || totalCost === undefined) {
    return res.status(400).json({ message: 'All required fields must be provided.' });
  }

  let scopedWarehouseId;
  try {
    scopedWarehouseId = assertWarehouseAccess(req, warehouseId);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message });
  }

  const normalizedAmounts = validatePurchaseOrderAmounts({
    quantity,
    receivedQuantity,
    unitCost,
    totalCost,
  });

  const session = await mongoose.startSession();
  let po;

  try {
    await session.withTransaction(async () => {
      await assertValidProcurementRelationship({ supplierId, productId, warehouseId: scopedWarehouseId, session });
      await assertInvoiceCanBeAssignedToPurchaseOrder({ invoiceId, session });

      const purchaseOrderPayload = {
        supplierId,
        productId,
        warehouseId: scopedWarehouseId,
        ...normalizedAmounts,
        status,
        paymentStatus,
      };

      if (invoiceId) {
        purchaseOrderPayload.invoiceId = invoiceId;
      }

      po = new PurchaseOrder(purchaseOrderPayload);
      await po.save({ session });

      if (invoiceId) {
        await Invoice.findByIdAndUpdate(
          invoiceId,
          { $set: { purchaseOrderId: po._id } },
          withSession(UPDATE_OPTIONS, session)
        );

        await syncInvoiceStatus(invoiceId, session);
        po = await PurchaseOrder.findById(po._id).session(session) || po;
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
    value: normalizedAmounts.totalCost,
    details: `Supplier: ${supplierId}, Product: ${productId}, Warehouse: ${scopedWarehouseId}, Quantity: ${normalizedAmounts.quantity}`
  });
  res.status(201).json({ message: 'Purchase order created', purchaseOrder: po });
});

// Get all Purchase Orders
export const getAllPurchaseOrders = catchAsyncErrors(async (req, res) => {
  const warehouseId = requireAssignedWarehouseId(req);
  const pos = await PurchaseOrder.find({ warehouseId }).populate('supplierId productId warehouseId invoiceId');
  res.json(pos);
});

// Update Purchase Order
export const updatePurchaseOrder = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();
  let po;

  try {
    await session.withTransaction(async () => {
      const existingPo = await PurchaseOrder.findById(id).session(session);
      if (!existingPo) {
        throw createProcurementError(404, 'Purchase order not found.');
      }

      assertWarehouseAccess(req, existingPo.warehouseId);
      if (req.body.warehouseId !== undefined) {
        assertWarehouseAccess(req, req.body.warehouseId);
      }

      const nextValues = {
        supplierId: req.body.supplierId ?? existingPo.supplierId,
        productId: req.body.productId ?? existingPo.productId,
        warehouseId: req.body.warehouseId ?? existingPo.warehouseId,
        quantity: req.body.quantity ?? existingPo.quantity,
        receivedQuantity: req.body.receivedQuantity ?? existingPo.receivedQuantity,
        unitCost: req.body.unitCost ?? existingPo.unitCost,
        totalCost: req.body.totalCost ?? existingPo.totalCost,
      };

      const normalizedAmounts = validatePurchaseOrderAmounts(nextValues);
      await assertValidProcurementRelationship({
        supplierId: nextValues.supplierId,
        productId: nextValues.productId,
        warehouseId: nextValues.warehouseId,
        session,
      });

      if (req.body.invoiceId !== undefined) {
        await assertInvoiceCanBeAssignedToPurchaseOrder({
          invoiceId: req.body.invoiceId,
          purchaseOrderId: existingPo._id,
          session,
        });
      }

      const updatePayload = assignDefined({ ...req.body }, normalizedAmounts, [
        'quantity',
        'receivedQuantity',
        'unitCost',
        'totalCost',
      ]);

      po = await PurchaseOrder.findByIdAndUpdate(id, updatePayload, withSession(UPDATE_OPTIONS, session));

      if (po?.invoiceId) {
        await Invoice.findByIdAndUpdate(
          po.invoiceId,
          { $set: { purchaseOrderId: po._id } },
          withSession(UPDATE_OPTIONS, session)
        );

        await syncInvoiceStatus(po.invoiceId, session);
        po = await PurchaseOrder.findById(po._id).session(session) || po;
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
      if (!po) {
        throw createProcurementError(404, 'Purchase order not found.');
      }

      assertWarehouseAccess(req, po.warehouseId);

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
