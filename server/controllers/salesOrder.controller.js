import { SalesOrder, Item, Batch, Product, InventoryMovement } from '../models/index.js';
import { catchAsyncErrors } from '../middlewares/index.js';
import { logAudit } from '../utils/auditLogger.js';
import mongoose from 'mongoose';
import { normalizeId, transitionItemsStatus } from '../services/inventory/index.js';

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const getAssignedWarehouseId = (req) => normalizeId(req.user?.assignedWarehouseId);

// Create Sales Order
export const createSalesOrder = catchAsyncErrors(async (req, res) => {
  const { customerId, productId, quantity, unitPrice, totalPrice, salesInvoiceId } = req.body;

  if (!customerId || !productId || quantity === undefined || unitPrice === undefined || totalPrice === undefined) {
    return res.status(400).json({ message: 'All required fields must be provided.' });
  }

  const orderQuantity = Number(quantity);
  const orderUnitPrice = Number(unitPrice);
  const orderTotalPrice = Number(totalPrice);

  if (!Number.isInteger(orderQuantity) || orderQuantity <= 0 || orderUnitPrice <= 0 || orderTotalPrice <= 0) {
    return res.status(400).json({ message: 'Quantity, unit price, and total price must be positive numbers.' });
  }

  const assignedWarehouseId = getAssignedWarehouseId(req);
  const session = await mongoose.startSession();
  let order;
  let cogs = 0;
  let profit = 0;

  try {
    session.startTransaction();

    const product = await Product.findById(productId).session(session);
    if (!product) {
      throw httpError(404, 'Product not found.');
    }

    const batchQuery = { productId };
    if (assignedWarehouseId) batchQuery.warehouseId = assignedWarehouseId;

    const batches = await Batch.find(batchQuery)
      .sort({ mfgDate: 1, receivedAt: 1, createdAt: 1 })
      .session(session);

    let remainingQuantity = orderQuantity;
    const selectedItems = [];
    const batchCostMap = new Map();
    const batchWarehouseMap = new Map();
    const batchItemIdsMap = new Map();

    for (const batch of batches) {
      if (remainingQuantity <= 0) break;

      const items = await Item.find({
        batchId: batch._id,
        productId,
        status: 'in_stock'
      })
        .limit(remainingQuantity)
        .session(session);

      if (items.length === 0) continue;

      selectedItems.push(...items);
      const batchId = batch._id.toString();
      batchCostMap.set(batchId, batch.unitCost || 0);
      batchWarehouseMap.set(batchId, batch.warehouseId);
      batchItemIdsMap.set(batchId, [
        ...(batchItemIdsMap.get(batchId) || []),
        ...items.map((item) => item._id),
      ]);
      remainingQuantity -= items.length;
    }

    if (remainingQuantity > 0) {
      throw httpError(400, 'Not enough in-stock items to fulfill the order.');
    }

    cogs = selectedItems.reduce((sum, item) => {
      if (typeof item.purchasePrice === 'number') return sum + item.purchasePrice;
      return sum + (batchCostMap.get(item.batchId.toString()) || 0);
    }, 0);
    profit = orderTotalPrice - cogs;

    [order] = await SalesOrder.create([{
      customerId,
      productId,
      quantity: orderQuantity,
      unitPrice: orderUnitPrice,
      totalPrice: orderTotalPrice,
      status: 'fulfilled',
      salesInvoiceId,
      fulfilledItems: [...batchItemIdsMap.entries()].map(([batchId, itemIds]) => ({
        batchId,
        itemIds,
        quantity: itemIds.length,
      })),
    }], { session });

    for (const [batchId, itemIds] of batchItemIdsMap.entries()) {
      const transitionResult = await transitionItemsStatus({
        itemIds,
        fromStatus: 'in_stock',
        toStatus: 'dispatched',
        actorId: req.user?._id,
        warehouseId: batchWarehouseMap.get(batchId),
        notes: 'Sold via sales order',
        referenceType: 'SalesOrder',
        referenceId: order._id,
        movementType: 'dispatch',
        session
      });

      if (transitionResult.modifiedCount !== itemIds.length) {
        throw httpError(409, 'Inventory changed while creating the sales order.');
      }
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    return res.status(error.statusCode || 400).json({ message: error.message });
  } finally {
    session.endSession();
  }

  // Audit log
  await logAudit({
    userId: req.user?._id,
    action: 'CREATE_SALES_ORDER',
    entityType: 'SalesOrder',
    entityId: order._id,
    value: profit,
    details: `COGS: ${cogs}, Profit: ${profit}, Quantity: ${orderQuantity}`
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
  const hasDispatchedInventory = Boolean(await InventoryMovement.exists({
    referenceType: 'SalesOrder',
    referenceId: id,
    movementType: 'dispatch',
  }));

  const allowedPostDispatchFields = ['paymentStatus', 'salesInvoiceId'];
  const requestedFields = Object.keys(req.body || {});
  if (
    hasDispatchedInventory &&
    requestedFields.some((field) => !allowedPostDispatchFields.includes(field))
  ) {
    return res.status(400).json({
      message: 'Sales orders with dispatched inventory can only update paymentStatus or salesInvoiceId.',
    });
  }

  const order = await SalesOrder.findByIdAndUpdate(id, req.body, { new: true });
  res.json(order);
});

// Delete Sales Order
export const deleteSalesOrder = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const hasDispatchedInventory = Boolean(await InventoryMovement.exists({
    referenceType: 'SalesOrder',
    referenceId: id,
    movementType: 'dispatch',
  }));

  if (hasDispatchedInventory) {
    return res.status(400).json({
      message: 'Sales orders with dispatched inventory cannot be deleted. Create an explicit reversal flow instead.',
    });
  }

  await SalesOrder.findByIdAndDelete(id);
  res.json({ message: 'Sales order deleted' });
});
