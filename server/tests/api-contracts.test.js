import { jest } from '@jest/globals';
import childProcess from 'node:child_process';
import express from 'express';
import request from 'supertest';
import app from '../app.js';
import {
  createProductValidation,
  addSupplyValidation,
} from '../validators/index.js';
import handleValidationErrors from '../middlewares/validationErrors.middleware.js';
import { Return } from '../models/index.js';
import { getAllReturns } from '../controllers/return.controller.js';

const buildValidationApp = (validators) => {
  const validationApp = express();
  validationApp.use(express.json());
  validationApp.post('/validate', validators, handleValidationErrors, (req, res) => {
    res.status(204).send();
  });
  return validationApp;
};

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

    controller({ query: {}, ...req }, res, reject);
  });

const createReturnFindChain = (payload) => ({
  populate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockResolvedValue(payload),
});

describe('API contract smoke tests', () => {
  describe('public health routes', () => {
    it('returns a root readiness response', async () => {
      const res = await request(app).get('/');

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({
        status: 'ok',
        message: 'SmartStock API is running',
      });
    });

    it('returns detailed health status', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(typeof res.body.timestamp).toBe('string');
      expect(res.body.memory).toEqual(
        expect.objectContaining({
          rss: expect.any(String),
          heapUsed: expect.any(String),
        }),
      );
    });
  });

  describe('unauthenticated sensitive route protection', () => {
    it.each([
      ['GET', '/api/v1/user/me'],
      ['GET', '/api/v1/user/all'],
      ['POST', '/api/v1/user/create'],
      ['GET', '/api/v1/product/all'],
      ['POST', '/api/v1/product/add'],
      ['GET', '/api/v1/inventory/all'],
      ['POST', '/api/v1/inventory/add-supply'],
      ['GET', '/api/v1/order/all'],
      ['POST', '/api/v1/order/create'],
      ['GET', '/api/v1/package/all'],
      ['GET', '/api/v1/transport/all'],
      ['GET', '/api/v1/return/all'],
      ['POST', '/api/v1/return/initiate'],
      ['GET', '/api/v1/ai/dashboard'],
    ])('%s %s returns 401 without a bearer token', async (method, path) => {
      const res = await request(app)[method.toLowerCase()](path).send({});

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/token|authorization/i);
    });
  });

  describe('auth-protected finance route protection', () => {
    it.each([
      ['GET', '/api/v1/purchase-order'],
      ['POST', '/api/v1/purchase-order'],
      ['GET', '/api/v1/invoice'],
      ['POST', '/api/v1/invoice'],
      ['GET', '/api/v1/payment'],
      ['POST', '/api/v1/payment'],
      ['GET', '/api/v1/financial-report/inventory-value'],
      ['GET', '/api/v1/financial-report/cogs-profit'],
      ['GET', '/api/v1/financial-report/payables'],
      ['GET', '/api/v1/financial-report/receivables'],
      ['GET', '/api/v1/financial-report/damaged-lost-value'],
    ])('%s %s returns 401 without a bearer token', async (method, path) => {
      const res = await request(app)[method.toLowerCase()](path).send({});

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/token|authorization/i);
    });
  });

  describe('AI configuration safety', () => {
    it('imports the app without an AI provider key', () => {
      const result = childProcess.spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          "delete process.env.GEMINI_API_KEY; delete process.env.GOOGLE_API_KEY; await import('./app.js');",
        ],
        {
          cwd: new URL('..', import.meta.url),
          encoding: 'utf8',
          env: {
            ...process.env,
            GEMINI_API_KEY: '',
            GOOGLE_API_KEY: '',
          },
        },
      );

      expect(result.status).toBe(0);
      expect(result.stderr).toBe('');
    });
  });

  describe('request shape validation contracts', () => {
    it('rejects invalid product create shapes', async () => {
      const validationApp = buildValidationApp(createProductValidation);

      const res = await request(validationApp)
        .post('/validate')
        .send({
          productName: 'TV',
          productImage: 'not-a-url',
          sku: 'A',
          price: 'free',
          dimension: { length: 1 },
          shelfLifeDays: 'soon',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Input validation failed');
      expect(res.body.errors.map((error) => error.message)).toEqual(
        expect.arrayContaining([
          'Product name must be at least 3 characters long',
          'Product image must be a valid URL',
          'Unit is required',
          'Manufacturer is required',
          'Product category is required',
          'SKU must be at least 3 characters long',
          'Price must be a number',
          'Dimension must include length, breadth, and height',
          'Shelf life days must be a number',
        ]),
      );
    });

    it('rejects invalid add-supply shapes', async () => {
      const validationApp = buildValidationApp(addSupplyValidation);

      const res = await request(validationApp)
        .post('/validate')
        .send({
          productId: 'bad-product',
          supplierId: 'bad-supplier',
          quantity: 0,
          mfgDate: 'not-a-date',
          expDate: 'not-a-date',
          notes: 123,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Input validation failed');
      expect(res.body.errors.map((error) => error.message)).toEqual(
        expect.arrayContaining([
          'Product ID must be a valid Mongo ID',
          'Supplier ID must be a valid Mongo ID',
          'Quantity must be a positive integer',
          'Manufacturing date must be a valid date (YYYY-MM-DD)',
          'Expiry date must be a valid date (YYYY-MM-DD)',
          'Notes must be a string',
        ]),
      );
    });
  });

  describe('returns list contract', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('includes populated package, product, order, and processed-by fields when returns exist', async () => {
      const populatedReturns = [
        {
          _id: 'return-1',
          returnNumber: 'RET-1',
          returnStatus: 'processed',
          packageId: {
            packageId: 'PKG-1',
            allocatedItems: [
              {
                productId: {
                  productName: 'Desk Lamp',
                  price: 1200,
                },
                quantity: 1,
              },
            ],
          },
          orderId: {
            orderNumber: 'ORD-1',
          },
          processedBy: {
            fullName: 'Admin User',
          },
        },
      ];
      const findChain = createReturnFindChain(populatedReturns);
      jest.spyOn(Return, 'find').mockReturnValue(findChain);
      jest.spyOn(Return, 'countDocuments').mockResolvedValue(1);

      const { statusCode, payload } = await invokeJsonController(getAllReturns);

      expect(statusCode).toBe(200);
      expect(payload).toMatchObject({
        returns: populatedReturns,
        totalPages: 1,
        currentPage: 1,
        total: 1,
      });
      expect(payload.returns[0].packageId.allocatedItems[0].productId).toEqual(
        expect.objectContaining({
          productName: 'Desk Lamp',
          price: 1200,
        }),
      );
      expect(payload.returns[0].orderId.orderNumber).toBe('ORD-1');
      expect(payload.returns[0].processedBy.fullName).toBe('Admin User');
      expect(findChain.populate).toHaveBeenCalled();
    });

    it('gracefully returns an empty paged list when no returns exist', async () => {
      const findChain = createReturnFindChain([]);
      jest.spyOn(Return, 'find').mockReturnValue(findChain);
      jest.spyOn(Return, 'countDocuments').mockResolvedValue(0);

      const { statusCode, payload } = await invokeJsonController(getAllReturns);

      expect(statusCode).toBe(200);
      expect(payload).toEqual({
        returns: [],
        totalPages: 0,
        currentPage: 1,
        total: 0,
      });
    });
  });
});
