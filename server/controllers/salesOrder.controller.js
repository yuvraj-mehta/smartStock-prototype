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

const retiredSalesOrderResponse = (res) => res.status(410).json({
  message: 'The legacy sales-order workflow is retired. Use /api/v1/order for allocation, packaging, transport, delivery, and returns.',
  replacementRoutes: [
    '/api/v1/order/create',
    '/api/v1/order/process/:orderId',
    '/api/v1/package',
    '/api/v1/transport/status/:transportId',
    '/api/v1/return',
  ],
});

// Get all Sales Orders
export const getAllSalesOrders = catchAsyncErrors(async (req, res) => {
  retiredSalesOrderResponse(res);
});

// Update Sales Order
export const updateSalesOrder = catchAsyncErrors(async (req, res) => {
  retiredSalesOrderResponse(res);
});

// Delete Sales Order
export const deleteSalesOrder = catchAsyncErrors(async (req, res) => {
  retiredSalesOrderResponse(res);
});
