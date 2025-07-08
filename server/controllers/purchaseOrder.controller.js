import { PurchaseOrder } from '../models/index.js';
import { catchAsyncErrors } from '../middlewares/index.js';
import { logAudit } from '../utils/auditLogger.js';

// Create Purchase Order
export const createPurchaseOrder = catchAsyncErrors(async (req, res) => {
  const { supplierId, productId, quantity, unitCost, totalCost, status, paymentStatus, invoiceId } = req.body;
  if (!supplierId || !productId || !quantity || !unitCost || !totalCost) {
    return res.status(400).json({ message: 'All required fields must be provided.' });
  }
  if (quantity <= 0 || unitCost <= 0 || totalCost <= 0) {
    return res.status(400).json({ message: 'Quantity, unit cost, and total cost must be positive numbers.' });
  }
  const po = await PurchaseOrder.create({ supplierId, productId, quantity, unitCost, totalCost, status, paymentStatus, invoiceId });
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
  const po = await PurchaseOrder.findByIdAndUpdate(id, req.body, { new: true });
  res.json(po);
});

// Delete Purchase Order
export const deletePurchaseOrder = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  await PurchaseOrder.findByIdAndDelete(id);
  res.json({ message: 'Purchase order deleted' });
});
