import { jest } from '@jest/globals';

const ExternalUser = {
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOne: jest.fn(),
};

jest.unstable_mockModule('../models/externalUsers.model.js', () => ({ ExternalUser }));
jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    hash: jest.fn().mockResolvedValue('hashed-password'),
  },
}));
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

    controller({
      body: {},
      params: {},
      user: {
        _id: '507f1f77bcf86cd799439001',
        role: 'admin',
        assignedWarehouseId: '507f1f77bcf86cd799439012',
      },
      ...req,
    }, res, reject);
  });

let externalUserController;

describe('external user controller warehouse scope', () => {
  beforeAll(async () => {
    externalUserController = await import('../controllers/externalUser.controller.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates transporters as active by default so transporter login can work', async () => {
    ExternalUser.findOne.mockResolvedValue(null);
    ExternalUser.create.mockResolvedValue({
      _id: '507f1f77bcf86cd799439021',
      fullName: 'Driver One',
      companyName: 'Fast Logistics',
      email: 'driver@example.com',
      phone: '9999999999',
      address: 'Main road',
      contactPerson: 'Dispatch',
      role: 'transporter',
      warehouseId: '507f1f77bcf86cd799439012',
      status: 'active',
    });

    const res = await invokeJsonController(externalUserController.createTransporter, {
      body: {
        fullName: 'Driver One',
        companyName: 'Fast Logistics',
        email: 'driver@example.com',
        password: 'password123',
        phone: '9999999999',
        address: 'Main road',
        contactPerson: 'Dispatch',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(ExternalUser.create).toHaveBeenCalledWith(expect.objectContaining({
      email: 'driver@example.com',
      role: 'transporter',
      status: 'active',
      warehouseId: '507f1f77bcf86cd799439012',
    }));
    expect(res.payload.transporter.status).toBe('active');
  });

  it('updates external user status inside the assigned warehouse', async () => {
    ExternalUser.findById.mockResolvedValue({
      _id: '507f1f77bcf86cd799439021',
      email: 'driver@example.com',
      warehouseId: '507f1f77bcf86cd799439012',
    });
    ExternalUser.findByIdAndUpdate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439021',
      fullName: 'Driver One',
      email: 'driver@example.com',
      phone: '9999999999',
      companyName: 'Fast Logistics',
      address: 'Main road',
      contactPerson: 'Dispatch',
      role: 'transporter',
      status: 'suspended',
      warehouseId: '507f1f77bcf86cd799439012',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });

    const res = await invokeJsonController(externalUserController.updateExternalUser, {
      params: { id: '507f1f77bcf86cd799439021' },
      body: { fullName: 'Driver One', status: 'suspended' },
    });

    expect(res.statusCode).toBe(200);
    expect(ExternalUser.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439021',
      expect.objectContaining({ status: 'suspended' }),
      { new: true },
    );
    expect(res.payload.externalUser.status).toBe('suspended');
  });

  it('blocks admin updates for external users in another warehouse', async () => {
    ExternalUser.findById.mockResolvedValue({
      _id: '507f1f77bcf86cd799439021',
      warehouseId: '507f1f77bcf86cd799439099',
    });

    const res = await invokeJsonController(externalUserController.updateExternalUser, {
      params: { id: '507f1f77bcf86cd799439021' },
      body: { fullName: 'Updated Supplier' },
    });

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ message: 'Access denied.' });
    expect(ExternalUser.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('blocks admin deletes for external users in another warehouse', async () => {
    ExternalUser.findById.mockResolvedValue({
      _id: '507f1f77bcf86cd799439021',
      warehouseId: '507f1f77bcf86cd799439099',
    });

    const res = await invokeJsonController(externalUserController.deleteExternalUser, {
      params: { id: '507f1f77bcf86cd799439021' },
    });

    expect(res.statusCode).toBe(403);
    expect(res.payload).toEqual({ message: 'Access denied.' });
    expect(ExternalUser.findByIdAndDelete).not.toHaveBeenCalled();
  });
});
