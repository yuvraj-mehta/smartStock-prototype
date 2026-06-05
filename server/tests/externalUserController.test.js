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
