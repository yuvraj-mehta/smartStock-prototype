import { jest } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { conf } from '../config/config.js';

const ok = jest.fn((req, res) => res.status(200).json({ ok: true }));

const controllerMocks = {
  createProduct: ok,
  getProductById: ok,
  getAllProducts: ok,
  deleteProductById: ok,
  updateProductById: ok,
  addInventorySupply: ok,
  viewInventory: ok,
  getInventoryByProduct: ok,
  markDamagedInventory: ok,
  getRealTimeInventoryStatus: ok,
  trackBatchByNumber: ok,
  getAllTransports: ok,
  getTransportById: ok,
  updateTransportStatus: ok,
  getTransportsByPackageId: ok,
};

const itemControllerMocks = {
  getAllItems: ok,
  getItemById: ok,
  getItemsByBatch: ok,
  updateItemStatus: ok,
  trackItemBySerial: ok,
  getProductMovementHistory: ok,
};

const viewerUser = {
  _id: '507f1f77bcf86cd799439101',
  email: 'viewer@example.com',
  role: 'viewer',
  assignedWarehouseId: '507f1f77bcf86cd799439102',
};

const User = {
  findById: jest.fn(() => ({
    populate: jest.fn().mockResolvedValue(viewerUser),
  })),
};

jest.unstable_mockModule('../controllers/index.js', () => controllerMocks);
jest.unstable_mockModule('../controllers/item.controller.js', () => itemControllerMocks);
jest.unstable_mockModule('../models/user.model.js', () => ({ User }));

const { default: productRouter } = await import('../routes/product.route.js');
const { default: inventoryRouter } = await import('../routes/inventory.route.js');
const { default: itemRouter } = await import('../routes/item.route.js');
const { default: transportRouter } = await import('../routes/transport.route.js');

const app = express();
app.use(express.json());
app.use('/api/v1/product', productRouter);
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v1/item', itemRouter);
app.use('/api/v1/transport', transportRouter);

const viewerToken = jwt.sign(
  {
    id: viewerUser._id,
    email: viewerUser.email,
    role: viewerUser.role,
  },
  conf.jwtSecret,
  {
    ...conf.jwtSignOptions,
    expiresIn: '1h',
  },
);

describe('viewer read-only operational routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    '/api/v1/product',
    '/api/v1/product/all',
    '/api/v1/product/507f1f77bcf86cd799439111',
    '/api/v1/inventory',
    '/api/v1/inventory/all',
    '/api/v1/inventory/product/507f1f77bcf86cd799439112',
    '/api/v1/inventory/real-time',
    '/api/v1/inventory/batch/track/BATCH-1',
    '/api/v1/item',
    '/api/v1/item/all',
    '/api/v1/item/batch/507f1f77bcf86cd799439113',
    '/api/v1/item/track/SER-1',
    '/api/v1/item/product/507f1f77bcf86cd799439114/movement-history',
    '/api/v1/item/507f1f77bcf86cd799439115',
    '/api/v1/transport',
    '/api/v1/transport/all',
    '/api/v1/transport/package/507f1f77bcf86cd799439116',
    '/api/v1/transport/507f1f77bcf86cd799439117',
  ])('allows viewer access to GET %s', async (path) => {
    const res = await request(app)
      .get(path)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.statusCode).toBe(200);
  });
});
