import { jest } from '@jest/globals';

jest.unstable_mockModule('../controllers/index.js', () => ({
  assignTransport: jest.fn(),
  autoConfirmSale: jest.fn(),
  createOrder: jest.fn(),
  dispatchPackage: jest.fn(),
  getAllOrders: jest.fn(),
  getAllPackages: jest.fn(),
  getOrderById: jest.fn(),
  getPackageById: jest.fn(),
  getPackagesByOrderId: jest.fn(),
  markDelivered: jest.fn(),
  processOrder: jest.fn(),
  updatePackageStatus: jest.fn(),
}));

const { default: orderRouter } = await import('../routes/order.route.js');
const { default: packageRouter } = await import('../routes/package.route.js');

const findRoute = (router, method, path) => router.stack.find(
  (layer) => layer.route?.path === path && layer.route.methods?.[method],
);

const invokeJsonHandler = (handler, req = {}) =>
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

    handler({ body: {}, params: {}, ...req }, res, reject);
  });

describe('delivery owner route guardrails', () => {
  it('keeps the old order delivery route wired to the retired 410 handler', async () => {
    const route = findRoute(orderRouter, 'post', '/delivered/:packageId');

    expect(route).toBeDefined();
    const deliveryHandler = route.route.stack.at(-1).handle;
    expect(deliveryHandler.name).toBe('retiredOrderDeliveryRoute');

    const res = await invokeJsonHandler(deliveryHandler, {
      params: { packageId: '507f1f77bcf86cd799439031' },
      body: { notes: 'Delivered at front desk' },
    });

    expect(res.statusCode).toBe(410);
    expect(res.payload).toEqual({
      message: 'Order delivery is completed through transport status updates.',
      replacementRoute: '/api/v1/transport/status/:transportId',
    });
  });

  it('does not expose a package delivery route outside transport status updates', () => {
    const packageMutationRoutes = packageRouter.stack
      .filter((layer) => layer.route?.methods?.post || layer.route?.methods?.patch)
      .map((layer) => layer.route.path);

    expect(packageMutationRoutes).toEqual(['/status/:packageId']);
  });
});
