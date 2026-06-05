import mongoose from 'mongoose';
import { ApiError } from '../../middlewares/error.handler.js';
import {
  ExternalUser,
  Invoice,
  Payment,
  Product,
  PurchaseOrder,
  Warehouse,
} from '../../models/index.js';

const UPDATE_OPTIONS = { new: true, runValidators: true };
const EPSILON = 0.000001;

export const withSession = (options, session) => ({ ...options, session });

export const createProcurementError = (statusCode, message) => new ApiError(statusCode, message);

export const normalizeId = (id) => (id?._id || id)?.toString();

export const asObjectId = (id) => (
  id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(id)
);

const runWithOptionalSession = (query, session) => (session ? query.session(session) : query);

const requireObjectId = (id, label) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw createProcurementError(400, `${label} must be a valid Mongo ID.`);
  }

  return id;
};

const parsePositiveNumber = (value, label) => {
  if (value === undefined || value === null || value === '') {
    throw createProcurementError(400, `${label} is required.`);
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw createProcurementError(400, `${label} must be a positive number.`);
  }

  return number;
};

const parseNonNegativeNumber = (value, label) => {
  if (value === undefined || value === null || value === '') {
    throw createProcurementError(400, `${label} is required.`);
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw createProcurementError(400, `${label} must be a non-negative number.`);
  }

  return number;
};

export const validatePurchaseOrderAmounts = ({
  quantity,
  receivedQuantity = 0,
  unitCost,
  totalCost,
}) => {
  const normalizedQuantity = parsePositiveNumber(quantity, 'Quantity');
  const normalizedReceivedQuantity = parseNonNegativeNumber(receivedQuantity, 'Received quantity');
  const normalizedUnitCost = parsePositiveNumber(unitCost, 'Unit cost');
  const normalizedTotalCost = parsePositiveNumber(totalCost, 'Total cost');

  if (normalizedReceivedQuantity - normalizedQuantity > EPSILON) {
    throw createProcurementError(400, 'Received quantity cannot exceed ordered quantity.');
  }

  return {
    quantity: normalizedQuantity,
    receivedQuantity: normalizedReceivedQuantity,
    unitCost: normalizedUnitCost,
    totalCost: normalizedTotalCost,
  };
};

export const assertValidProcurementRelationship = async ({
  supplierId,
  productId,
  warehouseId,
  session,
}) => {
  requireObjectId(supplierId, 'Supplier ID');
  requireObjectId(productId, 'Product ID');
  requireObjectId(warehouseId, 'Warehouse ID');

  const [supplier, product, warehouse] = await Promise.all([
    runWithOptionalSession(ExternalUser.findById(supplierId), session),
    runWithOptionalSession(Product.findById(productId), session),
    runWithOptionalSession(Warehouse.findById(warehouseId), session),
  ]);

  if (!supplier) {
    throw createProcurementError(404, 'Supplier not found.');
  }

  if (supplier.role !== 'supplier') {
    throw createProcurementError(400, 'External user must have supplier role.');
  }

  if (!product || product.isDeleted) {
    throw createProcurementError(404, 'Product not found.');
  }

  if (!warehouse) {
    throw createProcurementError(404, 'Warehouse not found.');
  }

  const supplierWarehouseId = normalizeId(supplier.warehouseId);
  if (supplierWarehouseId && supplierWarehouseId !== normalizeId(warehouseId)) {
    throw createProcurementError(400, 'Supplier is not assigned to the selected warehouse.');
  }

  const productSupplierIds = (product.supplierIds || []).map(normalizeId).filter(Boolean);
  if (productSupplierIds.length > 0 && !productSupplierIds.includes(normalizeId(supplierId))) {
    throw createProcurementError(400, 'Supplier is not linked to the selected product.');
  }

  return { supplier, product, warehouse };
};

export const assertInvoiceCanBeAssignedToPurchaseOrder = async ({
  invoiceId,
  purchaseOrderId,
  session,
}) => {
  if (!invoiceId) return null;

  requireObjectId(invoiceId, 'Invoice ID');

  const invoice = await runWithOptionalSession(Invoice.findById(invoiceId), session);
  if (!invoice) {
    throw createProcurementError(404, 'Invoice not found.');
  }

  if (!purchaseOrderId && invoice.purchaseOrderId) {
    throw createProcurementError(409, 'Invoice already belongs to another purchase order.');
  }

  if (purchaseOrderId && normalizeId(invoice.purchaseOrderId) !== normalizeId(purchaseOrderId)) {
    throw createProcurementError(409, 'Invoice already belongs to another purchase order.');
  }

  const purchaseOrderFilter = { invoiceId: invoice._id };
  if (purchaseOrderId) {
    purchaseOrderFilter._id = { $ne: asObjectId(purchaseOrderId) };
  }

  const linkedPurchaseOrder = await runWithOptionalSession(
    PurchaseOrder.findOne(purchaseOrderFilter).select('_id'),
    session
  );

  if (linkedPurchaseOrder) {
    throw createProcurementError(409, 'Invoice is already linked to another purchase order.');
  }

  return invoice;
};

export const assertCanInvoicePurchaseOrder = async ({
  purchaseOrderId,
  amount,
  session,
  currentInvoiceId,
}) => {
  requireObjectId(purchaseOrderId, 'Purchase order ID');

  const purchaseOrder = await runWithOptionalSession(PurchaseOrder.findById(purchaseOrderId), session);
  if (!purchaseOrder) {
    throw createProcurementError(404, 'Purchase order not found.');
  }

  if (purchaseOrder.status === 'cancelled') {
    throw createProcurementError(400, 'Cancelled purchase orders cannot be invoiced.');
  }

  const invoiceAmount = parsePositiveNumber(amount, 'Amount');
  if (invoiceAmount - Number(purchaseOrder.totalCost || 0) > EPSILON) {
    throw createProcurementError(400, 'Invoice amount cannot exceed purchase order total cost.');
  }

  const duplicateFilter = { purchaseOrderId: purchaseOrder._id };
  if (currentInvoiceId) {
    requireObjectId(currentInvoiceId, 'Invoice ID');
    duplicateFilter._id = { $ne: asObjectId(currentInvoiceId) };
  }

  const duplicateInvoice = await runWithOptionalSession(
    Invoice.findOne(duplicateFilter).select('_id'),
    session
  );

  if (duplicateInvoice) {
    throw createProcurementError(409, 'Purchase order already has an invoice.');
  }

  if (
    purchaseOrder.invoiceId
    && (!currentInvoiceId || normalizeId(purchaseOrder.invoiceId) !== normalizeId(currentInvoiceId))
  ) {
    throw createProcurementError(409, 'Purchase order already references another invoice.');
  }

  return purchaseOrder;
};

export const invoiceStatusToPaymentStatus = (status) => {
  if (status === 'paid') return 'paid';
  if (status === 'partial') return 'partial';
  return 'unpaid';
};

export const deriveInvoiceStatus = (invoice, paidAmount) => {
  const amount = Number(invoice.amount) || 0;

  if (amount <= 0 || paidAmount >= amount) return 'paid';
  if (paidAmount > 0) return 'partial';
  if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) return 'overdue';
  return 'unpaid';
};

export const getCompletedPaymentSummary = async (invoiceId, session, excludePaymentId) => {
  requireObjectId(invoiceId, 'Invoice ID');

  const match = { invoiceId: asObjectId(invoiceId), status: 'completed' };
  if (excludePaymentId) {
    requireObjectId(excludePaymentId, 'Payment ID');
    match._id = { $ne: asObjectId(excludePaymentId) };
  }

  const aggregate = Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$invoiceId',
        paidAmount: { $sum: { $ifNull: ['$amount', 0] } },
        paidDate: { $max: '$date' },
      },
    },
  ]);

  const [summary] = session ? await aggregate.session(session) : await aggregate;

  return {
    paidAmount: summary?.paidAmount || 0,
    paidDate: summary?.paidDate,
  };
};

export const assertInvoiceAmountCoversCompletedPayments = async ({
  invoiceId,
  amount,
  session,
}) => {
  const invoiceAmount = parsePositiveNumber(amount, 'Amount');
  const { paidAmount } = await getCompletedPaymentSummary(invoiceId, session);

  if (paidAmount - invoiceAmount > EPSILON) {
    throw createProcurementError(400, 'Invoice amount cannot be less than completed payments.');
  }
};

export const assertPaymentDoesNotOverpay = async ({
  invoiceId,
  amount,
  status,
  session,
  excludePaymentId,
}) => {
  requireObjectId(invoiceId, 'Invoice ID');
  const paymentAmount = parsePositiveNumber(amount, 'Amount');

  const invoice = await runWithOptionalSession(Invoice.findById(invoiceId), session);
  if (!invoice) {
    throw createProcurementError(404, 'Invoice not found.');
  }

  if (status === 'completed') {
    const { paidAmount } = await getCompletedPaymentSummary(invoice._id, session, excludePaymentId);
    if ((paidAmount + paymentAmount) - Number(invoice.amount || 0) > EPSILON) {
      throw createProcurementError(400, 'Completed payments cannot exceed invoice amount.');
    }
  }

  return invoice;
};

export const syncPurchaseOrderForInvoice = async (invoice, session) => {
  if (!invoice?.purchaseOrderId) return null;

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

export const syncInvoiceStatus = async (invoiceId, session) => {
  const invoice = await runWithOptionalSession(Invoice.findById(invoiceId), session);
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

export const clearPurchaseOrderInvoice = async (purchaseOrderId, invoiceId, session) => {
  if (!purchaseOrderId) return;

  await PurchaseOrder.updateOne(
    { _id: purchaseOrderId, invoiceId },
    { $unset: { invoiceId: '' }, $set: { paymentStatus: 'unpaid' } },
    { session, runValidators: true }
  );
};

export const recordPurchaseOrderReceipt = async ({
  purchaseOrderId,
  productId,
  supplierId,
  warehouseId,
  quantity,
  session,
}) => {
  if (!purchaseOrderId) return null;

  requireObjectId(purchaseOrderId, 'Purchase order ID');
  const receiptQuantity = parsePositiveNumber(quantity, 'Received quantity');
  const purchaseOrder = await runWithOptionalSession(PurchaseOrder.findById(purchaseOrderId), session);

  if (!purchaseOrder) {
    throw createProcurementError(404, 'Purchase order not found.');
  }

  if (purchaseOrder.status === 'cancelled') {
    throw createProcurementError(400, 'Cancelled purchase orders cannot receive supply.');
  }

  if (
    normalizeId(purchaseOrder.productId) !== normalizeId(productId)
    || normalizeId(purchaseOrder.supplierId) !== normalizeId(supplierId)
    || normalizeId(purchaseOrder.warehouseId) !== normalizeId(warehouseId)
  ) {
    throw createProcurementError(
      400,
      'Received supply must match the purchase order product, supplier, and warehouse.'
    );
  }

  const nextReceivedQuantity = Number(purchaseOrder.receivedQuantity || 0) + receiptQuantity;
  if (nextReceivedQuantity - Number(purchaseOrder.quantity || 0) > EPSILON) {
    throw createProcurementError(400, 'Received quantity cannot exceed ordered quantity.');
  }

  purchaseOrder.receivedQuantity = nextReceivedQuantity;
  if (nextReceivedQuantity >= Number(purchaseOrder.quantity || 0)) {
    purchaseOrder.status = 'received';
  }

  await purchaseOrder.save({ session });
  return purchaseOrder;
};
