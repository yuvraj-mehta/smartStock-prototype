import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { conf } from '../config/config.js';

const viewerUser = {
  _id: '507f1f77bcf86cd799439011',
  email: 'viewer@example.com',
  role: 'viewer',
  assignedWarehouseId: '507f1f77bcf86cd799439012',
};
const staffUser = {
  _id: '507f1f77bcf86cd799439021',
  email: 'staff@example.com',
  role: 'staff',
  assignedWarehouseId: '507f1f77bcf86cd799439022',
};
let authUser = viewerUser;

const User = {
  findById: jest.fn(() => ({
    populate: jest.fn().mockResolvedValue(authUser),
  })),
};

jest.unstable_mockModule('../models/user.model.js', () => ({ User }));

const { default: app } = await import('../app.js');

describe('inventory route RBAC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authUser = viewerUser;
  });

  it('rejects viewer users before inventory supply intake can mutate stock', async () => {
    const token = jwt.sign(
      {
        id: viewerUser._id,
        email: viewerUser.email,
        role: viewerUser.role,
      },
      conf.jwtSecret,
      { expiresIn: '1h' },
    );

    const res = await request(app)
      .post('/api/v1/inventory/add-supply')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/not authorized/i);
  });

  it('rejects viewer users before AI routes can generate or mutate insights', async () => {
    const token = jwt.sign(
      {
        id: viewerUser._id,
        email: viewerUser.email,
        role: viewerUser.role,
      },
      conf.jwtSecret,
      { expiresIn: '1h' },
    );

    const res = await request(app)
      .post('/api/v1/ai/optimize/stock')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/not authorized/i);
  });

  it('rejects staff users from the admin-only manual item status route', async () => {
    authUser = staffUser;
    const token = jwt.sign(
      {
        id: staffUser._id,
        email: staffUser.email,
        role: staffUser.role,
      },
      conf.jwtSecret,
      { expiresIn: '1h' },
    );

    const res = await request(app)
      .put('/api/v1/item/update-status/507f1f77bcf86cd799439031')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'damaged', reason: 'Cycle count correction' });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/not authorized/i);
  });

  it('rejects AI requests scoped to a different warehouse', async () => {
    authUser = staffUser;
    const token = jwt.sign(
      {
        id: staffUser._id,
        email: staffUser.email,
        role: staffUser.role,
      },
      conf.jwtSecret,
      { expiresIn: '1h' },
    );

    const res = await request(app)
      .post('/api/v1/ai/optimize/stock')
      .set('Authorization', `Bearer ${token}`)
      .send({ warehouseId: '507f1f77bcf86cd799439099' });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/access denied/i);
  });
});
