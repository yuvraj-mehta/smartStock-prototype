import { jest } from '@jest/globals';

const ExternalUser = {
  findOne: jest.fn(),
};
const User = {
  findOne: jest.fn(),
};
const bcrypt = {
  compare: jest.fn(),
};
const generateToken = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  ExternalUser,
  User,
}));
jest.unstable_mockModule('bcryptjs', () => ({ default: bcrypt }));
jest.unstable_mockModule('../utils/index.js', () => ({
  generateToken,
}));
jest.unstable_mockModule('../middlewares/index.js', () => ({
  catchAsyncErrors: (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next),
}));

const TRANSPORTER_ID = '507f1f77bcf86cd799439201';
const WAREHOUSE_ID = '507f1f77bcf86cd799439202';

const buildFindOneQuery = (value) => ({
  select: jest.fn().mockResolvedValue(value),
});

const buildInternalFindOneQuery = (value) => ({
  populate: jest.fn().mockReturnThis(),
  select: jest.fn().mockResolvedValue(value),
});

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

    controller({ body: {}, ...req }, res, reject);
  });

let authController;

describe('auth controller external transporter login', () => {
  beforeAll(async () => {
    authController = await import('../controllers/auth.controller.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.compare.mockResolvedValue(true);
    generateToken.mockReturnValue('transport-token');
  });

  it('issues a token for active transporter accounts assigned to a warehouse', async () => {
    const transporter = {
      _id: TRANSPORTER_ID,
      fullName: 'Driver One',
      companyName: 'Fast Logistics',
      email: 'driver@example.com',
      password: 'hashed-password',
      role: 'transporter',
      status: 'active',
      warehouseId: WAREHOUSE_ID,
    };
    ExternalUser.findOne.mockReturnValue(buildFindOneQuery(transporter));

    const res = await invokeJsonController(authController.loginTransporter, {
      body: {
        email: 'driver@example.com',
        password: 'secret',
      },
    });

    expect(ExternalUser.findOne).toHaveBeenCalledWith({
      email: 'driver@example.com',
      role: 'transporter',
      status: 'active',
    });
    expect(bcrypt.compare).toHaveBeenCalledWith('secret', 'hashed-password');
    expect(generateToken).toHaveBeenCalledWith({
      _id: TRANSPORTER_ID,
      email: 'driver@example.com',
      role: 'transporter',
      assignedWarehouseId: WAREHOUSE_ID,
    });
    expect(res.statusCode).toBe(200);
    expect(res.payload).toEqual({
      message: 'Transporter login successful',
      token: 'transport-token',
      user: {
        id: TRANSPORTER_ID,
        fullName: 'Driver One',
        email: 'driver@example.com',
        role: 'transporter',
        companyName: 'Fast Logistics',
        assignedWarehouseId: WAREHOUSE_ID,
        status: 'active',
      },
    });
  });

  it('rejects inactive or missing transporter accounts', async () => {
    ExternalUser.findOne.mockReturnValue(buildFindOneQuery(null));

    const res = await invokeJsonController(authController.loginTransporter, {
      body: {
        email: 'driver@example.com',
        password: 'secret',
      },
    });

    expect(res.statusCode).toBe(404);
    expect(res.payload.message).toMatch(/not found or inactive/i);
    expect(generateToken).not.toHaveBeenCalled();
  });

  it('rejects active transporters without a warehouse assignment', async () => {
    ExternalUser.findOne.mockReturnValue(buildFindOneQuery({
      _id: TRANSPORTER_ID,
      email: 'driver@example.com',
      password: 'hashed-password',
      role: 'transporter',
      status: 'active',
      warehouseId: null,
    }));

    const res = await invokeJsonController(authController.loginTransporter, {
      body: {
        email: 'driver@example.com',
        password: 'secret',
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.payload.message).toMatch(/assigned to a warehouse/i);
    expect(generateToken).not.toHaveBeenCalled();
  });
});

describe('auth controller internal login warehouse boundary', () => {
  beforeAll(async () => {
    authController = await import('../controllers/auth.controller.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.compare.mockResolvedValue(true);
    generateToken.mockReturnValue('internal-token');
  });

  it.each(['admin', 'staff', 'viewer'])(
    'rejects active %s users without an assigned warehouse',
    async (role) => {
      User.findOne.mockReturnValue(buildInternalFindOneQuery({
        _id: 'internal-user-1',
        fullName: 'Internal User',
        email: `${role}@example.com`,
        password: 'hashed-password',
        role,
        assignedWarehouseId: null,
      }));

      const res = await invokeJsonController(authController.login, {
        body: {
          email: `${role}@example.com`,
          password: 'secret',
        },
      });

      expect(User.findOne).toHaveBeenCalledWith({
        email: `${role}@example.com`,
        status: 'active',
      });
      expect(res.statusCode).toBe(403);
      expect(res.payload.message).toMatch(/assigned to a warehouse/i);
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(generateToken).not.toHaveBeenCalled();
    },
  );

  it('issues internal login tokens only after warehouse assignment and password validation', async () => {
    const user = {
      _id: 'internal-user-1',
      fullName: 'Staff User',
      email: 'staff@example.com',
      password: 'hashed-password',
      role: 'staff',
      assignedWarehouseId: WAREHOUSE_ID,
      avatar: 'avatar.png',
      lastLogin: null,
      save: jest.fn().mockResolvedValue(undefined),
    };
    User.findOne.mockReturnValue(buildInternalFindOneQuery(user));

    const res = await invokeJsonController(authController.login, {
      body: {
        email: 'staff@example.com',
        password: 'secret',
      },
    });

    expect(bcrypt.compare).toHaveBeenCalledWith('secret', 'hashed-password');
    expect(user.save).toHaveBeenCalled();
    expect(generateToken).toHaveBeenCalledWith(user);
    expect(res.statusCode).toBe(200);
    expect(res.payload).toMatchObject({
      message: 'Login successful',
      token: 'internal-token',
      user: {
        id: 'internal-user-1',
        email: 'staff@example.com',
        role: 'staff',
        assignedWarehouseId: WAREHOUSE_ID,
      },
    });
  });
});
