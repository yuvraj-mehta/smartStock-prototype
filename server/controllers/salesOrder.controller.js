import { SalesOrder, Item, Inventory, Batch } from '../models/index.js';
import { catchAsyncErrors } from '../middlewares/index.js';
import { logAudit } from '../utils/auditLogger.js';

// Create Sales Order
export const createSalesOrder = catchAsyncErrors(async (req, res) => {
  const { customerId, productId, quantity, unitPrice, totalPrice, status, salesInvoiceId } = req.body;
  if (!customerId || !productId || !quantity || !unitPrice || !totalPrice) {
    return res.status(400).json({ message: 'All required fields must be provided.' });
  }
  if (quantity <= 0 || unitPrice <= 0 || totalPrice <= 0) {
    return res.status(400).json({ message: 'Quantity, unit price, and total price must be positive numbers.' });
  }

  // Find in-stock items for this product
  const items = await Item.find({ productId, status: 'in_stock' }).limit(quantity);
  if (items.length < quantity) {
    return res.status(400).json({ message: 'Not enough in-stock items to fulfill the order.' });
  }

  // Calculate COGS (sum of purchasePrice or fallback to batch.unitCost)
  let cogs = 0;
  let missingPurchasePrice = false;
  for (const item of items) {
    if (typeof item.purchasePrice === 'number') {
      cogs += item.purchasePrice;
    } else {
      missingPurchasePrice = true;
    }
  }
  if (missingPurchasePrice) {
    // Fallback: use batch.unitCost
    const batchIds = [...new Set(items.map(i => i.batchId))];
    for (const batchId of batchIds) {
      const batch = await Batch.findById(batchId);
      if (batch && typeof batch.unitCost === 'number') {
        cogs += batch.unitCost * items.filter(i => i.batchId.equals(batchId)).length;
      }
    }
  }

  // Calculate profit
  const profit = totalPrice - cogs;

  // Mark items as sold/dispatched
  const now = new Date();
  const historyEntry = {
    action: 'dispatched',
    date: now,
    notes: 'Sold via sales order',
  };
  const itemIds = items.map(i => i._id);
  await Item.updateMany(
    { _id: { $in: itemIds } },
    { $set: { status: 'dispatched' }, $push: { history: historyEntry } }
  );

  // Update inventory (reduce quantity for each batch)
  for (const item of items) {
    await Inventory.updateOne(
      { batchId: item.batchId },
      { $inc: { quantity: -1, inventoryValue: -1 * (item.purchasePrice || 0) } }
    );
  }

  // Create sales order
  const order = await SalesOrder.create({ customerId, productId, quantity, unitPrice, totalPrice, status, salesInvoiceId });

  // Audit log
  await logAudit({
    userId: req.user?._id,
    action: 'CREATE_SALES_ORDER',
    entityType: 'SalesOrder',
    entityId: order._id,
    value: profit,
    details: `COGS: ${cogs}, Profit: ${profit}, Quantity: ${quantity}`
  });

  res.status(201).json({ message: 'Sales order created', salesOrder: order, cogs, profit });
});

// Get all Sales Orders
export const getAllSalesOrders = catchAsyncErrors(async (req, res) => {
  const orders = await SalesOrder.find().populate('customerId productId salesInvoiceId');
  res.json(orders);
});

// Update Sales Order
export const updateSalesOrder = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const order = await SalesOrder.findByIdAndUpdate(id, req.body, { new: true });
  res.json(order);
});

// Delete Sales Order
export const deleteSalesOrder = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  await SalesOrder.findByIdAndDelete(id);
  res.json({ message: 'Sales order deleted' });
});
