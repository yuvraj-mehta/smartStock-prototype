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

const User = {
  findById: jest.fn(() => ({
    populate: jest.fn().mockResolvedValue(viewerUser),
  })),
};

jest.unstable_mockModule('../models/user.model.js', () => ({ User }));

const { default: app } = await import('../app.js');

describe('inventory route RBAC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
