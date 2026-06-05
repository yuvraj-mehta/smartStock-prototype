import { Batch, SalesOrder, InventoryMovement } from '../models/index.js';
import {
  WAREHOUSE_ACCESS_DENIED_MESSAGE,
  catchAsyncErrors,
  normalizeId,
  requireAssignedWarehouseId,
} from '../middlewares/index.js';

const uniqueIds = (ids) => [...new Set(ids.map(normalizeId).filter(Boolean))];

const getScopedSalesOrderFilter = async (req, filter = {}) => {
  const assignedWarehouseId = requireAssignedWarehouseId(req);
  const batchIds = await Batch.find({ warehouseId: assignedWarehouseId }).distinct('_id');

  return {
    ...filter,
    'fulfilledItems.batchId': { $in: batchIds },
  };
};

const assertFulfilledItemsWarehouseAccess = async (req, fulfilledItems = []) => {
  const assignedWarehouseId = requireAssignedWarehouseId(req);
  const batchIds = uniqueIds(fulfilledItems.map((item) => item.batchId));
  if (batchIds.length === 0) return;

  const scopedBatchCount = await Batch.countDocuments({
    _id: { $in: batchIds },
    warehouseId: assignedWarehouseId,
  });

  if (scopedBatchCount !== batchIds.length) {
    throw Object.assign(new Error(WAREHOUSE_ACCESS_DENIED_MESSAGE), { statusCode: 403 });
  }
};

// Create Sales Order
export const createSalesOrder = catchAsyncErrors(async (req, res) => {
  res.status(410).json({
    message: 'Direct sales-order creation is retired. Use /api/v1/order for allocation, packaging, transport, delivery, and returns.',
    replacementRoutes: [
      '/api/v1/order/create',
      '/api/v1/order/process/:orderId',
      '/api/v1/order/assign-transport/:packageId',
      '/api/v1/transport/status/:transportId',
      '/api/v1/return/initiate',
    ],
  });
});

// Get all Sales Orders
export const getAllSalesOrders = catchAsyncErrors(async (req, res) => {
  const orders = await SalesOrder.find(await getScopedSalesOrderFilter(req)).populate('customerId productId salesInvoiceId');
  res.json(orders);
});

// Update Sales Order
export const updateSalesOrder = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const scopedFilter = await getScopedSalesOrderFilter(req, { _id: id });
  const existingOrder = await SalesOrder.findOne(scopedFilter);
  if (!existingOrder) {
    return res.status(404).json({ message: 'Sales order not found.' });
  }

  if (req.body.fulfilledItems !== undefined) {
    await assertFulfilledItemsWarehouseAccess(req, req.body.fulfilledItems);
  }

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

  const order = await SalesOrder.findByIdAndUpdate(existingOrder._id, req.body, {
    new: true,
    runValidators: true,
    context: 'query',
  });
  res.json(order);
});

// Delete Sales Order
export const deleteSalesOrder = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const scopedFilter = await getScopedSalesOrderFilter(req, { _id: id });
  const existingOrder = await SalesOrder.findOne(scopedFilter);
  if (!existingOrder) {
    return res.status(404).json({ message: 'Sales order not found.' });
  }

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

  await SalesOrder.findByIdAndDelete(existingOrder._id);
  res.json({ message: 'Sales order deleted' });
});
