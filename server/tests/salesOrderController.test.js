import { jest } from '@jest/globals';

jest.unstable_mockModule('../middlewares/index.js', () => ({
  catchAsyncErrors: (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next),
}));

const invokeJsonController = (controller, req = {}) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status: jest.fn((statusCode) => {
        res.statusCode = statusCode;
        return res;
      }),
      json: jest.fn((payload) => {
        resolve({ statusCode: res.statusCode, payload });
        return res;
      }),
    };

    controller({ body: {}, params: {}, ...req }, res, reject);
  });

let salesOrderController;

describe('legacy sales-order retirement', () => {
  beforeAll(async () => {
    salesOrderController = await import('../controllers/salesOrder.controller.js');
  });

  it.each([
    ['read', 'getAllSalesOrders'],
    ['update', 'updateSalesOrder'],
    ['delete', 'deleteSalesOrder'],
  ])('returns 410 for legacy sales-order %s operations', async (_label, controllerName) => {
    const res = await invokeJsonController(salesOrderController[controllerName], {
      params: { id: 'sales-order-1' },
      user: { assignedWarehouseId: 'warehouse-1' },
    });

    expect(res.statusCode).toBe(410);
    expect(res.payload).toMatchObject({
      message: expect.stringMatching(/legacy sales-order workflow is retired/i),
      replacementRoutes: expect.arrayContaining(['/api/v1/order/create']),
    });
  });
});
