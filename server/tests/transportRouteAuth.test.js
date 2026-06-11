import { jest } from '@jest/globals';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { conf } from '../config/config.js';

const getAllTransports = jest.fn((req, res) => res.status(200).json({}));
const getTransportById = jest.fn((req, res) => res.status(200).json({}));
const getTransportsByPackageId = jest.fn((req, res) => res.status(200).json({}));
const updateTransportStatus = jest.fn((req, res) => res.status(200).json({
  role: req.user.role,
  userId: req.user._id.toString(),
  assignedWarehouseId: req.user.assignedWarehouseId?.toString(),
}));

const User = {
  findById: jest.fn(),
};

const ExternalUser = {
  findById: jest.fn(),
};

jest.unstable_mockModule('../controllers/index.js', () => ({
  getAllTransports,
  getTransportById,
  getTransportsByPackageId,
  updateTransportStatus,
}));
jest.unstable_mockModule('../models/user.model.js', () => ({ User }));
jest.unstable_mockModule('../models/externalUsers.model.js', () => ({ ExternalUser }));

const { default: transportRouter } = await import('../routes/transport.route.js');

const app = express();
app.use(express.json());
app.use('/api/v1/transport', transportRouter);

const buildUserQuery = (user) => ({
  populate: jest.fn().mockResolvedValue(user),
});

const signToken = (payload) => jwt.sign(payload, conf.jwtSecret, {
  ...conf.jwtSignOptions,
  expiresIn: '1h',
});

describe('transport route auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockReturnValue(buildUserQuery(null));
    ExternalUser.findById.mockResolvedValue(null);
  });

  it('allows external transporter tokens to reach transport status updates', async () => {
    const transporterId = '507f1f77bcf86cd799439041';
    const warehouseId = '507f1f77bcf86cd799439042';
    ExternalUser.findById.mockResolvedValue({
      _id: transporterId,
      email: 'driver@example.com',
      role: 'transporter',
      status: 'active',
      warehouseId,
    });

    const res = await request(app)
      .patch('/api/v1/transport/status/507f1f77bcf86cd799439043')
      .set('Authorization', `Bearer ${signToken({
        id: transporterId,
        email: 'driver@example.com',
        role: 'transporter',
      })}`)
      .send({ status: 'in_transit' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      role: 'transporter',
      userId: transporterId,
      assignedWarehouseId: warehouseId,
    });
    expect(User.findById).toHaveBeenCalledWith(transporterId);
    expect(ExternalUser.findById).toHaveBeenCalledWith(transporterId);
    expect(updateTransportStatus).toHaveBeenCalledTimes(1);
  });

  it('blocks inactive external transporter tokens from transport status updates', async () => {
    const transporterId = '507f1f77bcf86cd799439071';
    ExternalUser.findById.mockResolvedValue({
      _id: transporterId,
      email: 'driver@example.com',
      role: 'transporter',
      status: 'suspended',
      warehouseId: '507f1f77bcf86cd799439072',
    });

    const res = await request(app)
      .patch('/api/v1/transport/status/507f1f77bcf86cd799439073')
      .set('Authorization', `Bearer ${signToken({
        id: transporterId,
        email: 'driver@example.com',
        role: 'transporter',
      })}`)
      .send({ status: 'in_transit' });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Transporter is inactive or suspended.');
    expect(updateTransportStatus).not.toHaveBeenCalled();
  });

  it('blocks external transporter tokens without a warehouse assignment', async () => {
    const transporterId = '507f1f77bcf86cd799439081';
    ExternalUser.findById.mockResolvedValue({
      _id: transporterId,
      email: 'driver@example.com',
      role: 'transporter',
      status: 'active',
      warehouseId: null,
    });

    const res = await request(app)
      .patch('/api/v1/transport/status/507f1f77bcf86cd799439083')
      .set('Authorization', `Bearer ${signToken({
        id: transporterId,
        email: 'driver@example.com',
        role: 'transporter',
      })}`)
      .send({ status: 'in_transit' });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Transporter must be assigned to a warehouse.');
    expect(updateTransportStatus).not.toHaveBeenCalled();
  });

  it('keeps internal staff users allowed on transport status updates', async () => {
    const staffId = '507f1f77bcf86cd799439061';
    const warehouseId = '507f1f77bcf86cd799439062';
    User.findById.mockReturnValue(buildUserQuery({
      _id: staffId,
      email: 'staff@example.com',
      role: 'staff',
      assignedWarehouseId: warehouseId,
    }));

    const res = await request(app)
      .patch('/api/v1/transport/status/507f1f77bcf86cd799439063')
      .set('Authorization', `Bearer ${signToken({
        id: staffId,
        email: 'staff@example.com',
        role: 'staff',
      })}`)
      .send({ status: 'in_transit' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      role: 'staff',
      userId: staffId,
      assignedWarehouseId: warehouseId,
    });
    expect(ExternalUser.findById).not.toHaveBeenCalled();
    expect(updateTransportStatus).toHaveBeenCalledTimes(1);
  });

  it('keeps internal viewers blocked from transport status updates', async () => {
    const viewerId = '507f1f77bcf86cd799439051';
    User.findById.mockReturnValue(buildUserQuery({
      _id: viewerId,
      email: 'viewer@example.com',
      role: 'viewer',
      assignedWarehouseId: '507f1f77bcf86cd799439052',
    }));

    const res = await request(app)
      .patch('/api/v1/transport/status/507f1f77bcf86cd799439053')
      .set('Authorization', `Bearer ${signToken({
        id: viewerId,
        email: 'viewer@example.com',
        role: 'viewer',
      })}`)
      .send({ status: 'in_transit' });

    expect(res.statusCode).toBe(403);
    expect(res.body.message).toMatch(/not authorized/i);
    expect(ExternalUser.findById).not.toHaveBeenCalled();
    expect(updateTransportStatus).not.toHaveBeenCalled();
  });
});
