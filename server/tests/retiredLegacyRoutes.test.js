import express from 'express';
import request from 'supertest';
import app from '../app.js';
import { recordSale } from '../controllers/sales.controller.js';
import {
  createSalesOrder,
  deleteSalesOrder,
  getAllSalesOrders,
  updateSalesOrder,
} from '../controllers/salesOrder.controller.js';

const buildSalesRetirementApp = () => {
  const salesRetirementApp = express();
  salesRetirementApp.use(express.json());
  salesRetirementApp.post('/api/v1/sales/record', recordSale);
  return salesRetirementApp;
};

const buildSalesOrderRetirementApp = () => {
  const salesOrderRetirementApp = express();
  salesOrderRetirementApp.use(express.json());
  salesOrderRetirementApp.post('/api/v1/sales-order', createSalesOrder);
  salesOrderRetirementApp.get('/api/v1/sales-order', getAllSalesOrders);
  salesOrderRetirementApp.put('/api/v1/sales-order/:id', updateSalesOrder);
  salesOrderRetirementApp.delete('/api/v1/sales-order/:id', deleteSalesOrder);
  return salesOrderRetirementApp;
};

describe('retired legacy workflow endpoints', () => {
  it.each(['get', 'post', 'put', 'delete'])(
    'returns 410 for %s /api/v1/fulfillment-order',
    async (method) => {
      const res = await request(app)[method]('/api/v1/fulfillment-order').send({});

      expect(res.statusCode).toBe(410);
      expect(res.body).toMatchObject({
        message: expect.stringMatching(/fulfillment-order workflow has been retired/i),
        replacementRoutes: [
          '/api/v1/order',
          '/api/v1/package',
          '/api/v1/transport',
          '/api/v1/return',
        ],
      });
    },
  );

  it('returns 410 for manual sales recording', async () => {
    const res = await request(buildSalesRetirementApp())
      .post('/api/v1/sales/record')
      .send({
        packageId: '507f1f77bcf86cd799439011',
        saleAmount: 2500,
      });

    expect(res.statusCode).toBe(410);
    expect(res.body).toEqual({
      message: 'Manual sales recording has been retired. Sales history is created from delivered packages and sale confirmation.',
      replacementFlow: '/api/v1/order',
    });
  });

  it.each([
    ['get', '/api/v1/sales-order'],
    ['post', '/api/v1/sales-order'],
    ['put', '/api/v1/sales-order/507f1f77bcf86cd799439011'],
    ['delete', '/api/v1/sales-order/507f1f77bcf86cd799439011'],
  ])('returns 410 for retired legacy sales-order %s %s', async (method, path) => {
    const res = await request(buildSalesOrderRetirementApp())[method](path)
      .send({
        customerId: '507f1f77bcf86cd799439011',
        productId: '507f1f77bcf86cd799439012',
        quantity: 1,
        unitPrice: 100,
        totalPrice: 100,
      });

    expect(res.statusCode).toBe(410);
    expect(res.body).toMatchObject({
      message: expect.stringMatching(/sales-order workflow is retired|direct sales-order creation is retired/i),
      replacementRoutes: expect.arrayContaining(['/api/v1/order/create']),
    });
  });
});
