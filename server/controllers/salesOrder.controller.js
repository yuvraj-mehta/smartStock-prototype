import { SalesOrder, Item, Inventory, Batch, Product } from '../models/index.js';
import { catchAsyncErrors } from '../middlewares/index.js';
import { logAudit } from '../utils/auditLogger.js';
import mongoose from 'mongoose';

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const normalizeId = (id) => (id?._id || id)?.toString();

const getAssignedWarehouseId = (req) => normalizeId(req.user?.assignedWarehouseId);

const runWithOptionalSession = (query, session) => (session ? query.session(session) : query);

const getInventoryValueForBatch = async (batchId, session) => {
  const items = await runWithOptionalSession(
    Item.find({ batchId, status: 'in_stock' }).select('purchasePrice'),
    session
  );

  if (items.every((item) => typeof item.purchasePrice === 'number')) {
    return items.reduce((sum, item) => sum + item.purchasePrice, 0);
  }

  const batch = await runWithOptionalSession(Batch.findById(batchId).select('unitCost'), session);
  return (batch?.unitCost || 0) * items.length;
};

const syncInventoryForBatch = async (batchId, warehouseId, session) => {
  const [quantity, inventoryValue] = await Promise.all([
    runWithOptionalSession(Item.countDocuments({ batchId, status: 'in_stock' }), session),
    getInventoryValueForBatch(batchId, session),
  ]);

  await Inventory.updateOne(
    { batchId, warehouseId },
    {
      $set: { quantity, inventoryValue },
      $setOnInsert: { batchId, warehouseId },
    },
    { upsert: true, session }
  );
};

// Create Sales Order
export const createSalesOrder = catchAsyncErrors(async (req, res) => {
  const { customerId, productId, quantity, unitPrice, totalPrice, status, salesInvoiceId } = req.body;

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
      batchCostMap.set(batch._id.toString(), batch.unitCost || 0);
      batchWarehouseMap.set(batch._id.toString(), batch.warehouseId);
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

    const itemIds = selectedItems.map((item) => item._id);
    const updateResult = await Item.updateMany(
      { _id: { $in: itemIds }, status: 'in_stock' },
      {
        $set: { status: 'dispatched' },
        $push: {
          history: {
            action: 'dispatched',
            date: new Date(),
            notes: 'Sold via sales order',
          }
        }
      },
      { session }
    );

    const modifiedCount = updateResult.modifiedCount ?? updateResult.nModified ?? 0;
    if (modifiedCount !== itemIds.length) {
      throw httpError(409, 'Inventory changed while creating the sales order.');
    }

    for (const [batchId, warehouseId] of batchWarehouseMap.entries()) {
      await syncInventoryForBatch(batchId, warehouseId, session);
    }

    [order] = await SalesOrder.create([{
      customerId,
      productId,
      quantity: orderQuantity,
      unitPrice: orderUnitPrice,
      totalPrice: orderTotalPrice,
      status,
      salesInvoiceId
    }], { session });

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
  const order = await SalesOrder.findByIdAndUpdate(id, req.body, { new: true });
  res.json(order);
});

// Delete Sales Order
export const deleteSalesOrder = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  await SalesOrder.findByIdAndDelete(id);
  res.json({ message: 'Sales order deleted' });
});
