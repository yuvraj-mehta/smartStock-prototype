import { SalesOrder, InventoryMovement } from '../models/index.js';
import { catchAsyncErrors } from '../middlewares/index.js';

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

  const order = await SalesOrder.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
    context: 'query',
  });
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
