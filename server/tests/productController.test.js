import { jest } from '@jest/globals';

const Product = {
  find: jest.fn(),
};

jest.unstable_mockModule('../models/product.model.js', () => ({ Product }));
jest.unstable_mockModule('../middlewares/index.js', () => ({
  catchAsyncErrors: (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next),
}));

const productController = await import('../controllers/product.controller.js');

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

    controller({
      body: {},
      params: {},
      query: {},
      user: { role: 'admin' },
      ...req,
    }, res, reject);
  });

describe('product controller list contracts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty product list as a successful admin response', async () => {
    Product.find.mockResolvedValue([]);

    const res = await invokeJsonController(productController.getAllProducts, {
      user: { role: 'admin' },
    });

    expect(Product.find).toHaveBeenCalledWith({ isDeleted: { $ne: true } });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({
      numberOfProducts: 0,
      message: 'Products fetched successfully.',
      products: [],
    });
  });

  it('returns an empty filtered product list as a successful viewer response', async () => {
    Product.find.mockResolvedValue([]);

    const res = await invokeJsonController(productController.getAllProducts, {
      user: { role: 'viewer' },
    });

    expect(Product.find).toHaveBeenCalledWith(
      { isDeleted: { $ne: true } },
      '-createdAt -updatedAt -__v -restockRecommended -supplierIds -quantity'
    );
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({
      numberOfProducts: 0,
      message: 'Products fetched successfully.',
      products: [],
    });
  });
});
