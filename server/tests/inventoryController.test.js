import { jest } from '@jest/globals';

const Batch = {
  create: jest.fn(),
};
const ExternalUser = {
  findById: jest.fn(),
};
const Inventory = {
  create: jest.fn(),
};
const IncomingSupply = {
  create: jest.fn(),
};
const InventoryMovement = {
  insertMany: jest.fn(),
};
const Item = {
  insertMany: jest.fn(),
};
const Product = {
  findOne: jest.fn(),
};

const mongooseMock = {
  Types: {
    ObjectId: {
      isValid: jest.fn(() => true),
    },
  },
  startSession: jest.fn(),
};

jest.unstable_mockModule('mongoose', () => ({ default: mongooseMock }));
jest.unstable_mockModule('../models/index.js', () => ({
  Batch,
  ExternalUser,
  Inventory,
  IncomingSupply,
  InventoryMovement,
  Item,
  Product,
}));
jest.unstable_mockModule('../middlewares/index.js', () => ({
  catchAsyncErrors: (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next),
}));
jest.unstable_mockModule('../utils/auditLogger.js', () => ({
  logAudit: jest.fn(),
}));
jest.unstable_mockModule('../services/procurement/procurement.service.js', () => ({
  recordPurchaseOrderReceipt: jest.fn(),
}));
jest.unstable_mockModule('../services/inventory/index.js', () => ({
  transitionItemsStatus: jest.fn(),
}));

const inventoryController = await import('../controllers/inventory.controller.js');

const warehouseId = '507f1f77bcf86cd799439012';
const supplierId = '507f1f77bcf86cd799439021';

const buildSupplyBody = (overrides = {}) => ({
  productId: '507f1f77bcf86cd799439031',
  supplierId,
  quantity: 1,
  mfgDate: '2026-01-01',
  expDate: '2027-01-01',
  unitCost: 10,
  ...overrides,
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

    controller({
      body: buildSupplyBody(),
      params: {},
      query: {},
      user: {
        _id: '507f1f77bcf86cd799439001',
        assignedWarehouseId: warehouseId,
      },
      ...req,
    }, res, reject);
  });

const expectNoInventoryMutation = () => {
  expect(mongooseMock.startSession).not.toHaveBeenCalled();
  expect(Product.findOne).not.toHaveBeenCalled();
  expect(Batch.create).not.toHaveBeenCalled();
  expect(IncomingSupply.create).not.toHaveBeenCalled();
  expect(Inventory.create).not.toHaveBeenCalled();
  expect(Item.insertMany).not.toHaveBeenCalled();
  expect(InventoryMovement.insertMany).not.toHaveBeenCalled();
};

describe('inventory supply supplier validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mongooseMock.Types.ObjectId.isValid.mockReturnValue(true);
  });

  it('rejects direct inventory supply when the supplier does not exist', async () => {
    ExternalUser.findById.mockResolvedValue(null);

    const res = await invokeJsonController(inventoryController.addInventorySupply);

    expect(ExternalUser.findById).toHaveBeenCalledWith(supplierId);
    expect(res.statusCode).toBe(404);
    expect(res.payload.message).toMatch(/supplier not found/i);
    expectNoInventoryMutation();
  });

  it('rejects direct inventory supply when the external user is not a supplier', async () => {
    ExternalUser.findById.mockResolvedValue({
      _id: supplierId,
      role: 'transporter',
      warehouseId,
    });

    const res = await invokeJsonController(inventoryController.addInventorySupply);

    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toMatch(/supplier role/i);
    expectNoInventoryMutation();
  });

  it('rejects direct inventory supply for a supplier outside the assigned warehouse', async () => {
    ExternalUser.findById.mockResolvedValue({
      _id: supplierId,
      role: 'supplier',
      warehouseId: '507f1f77bcf86cd799439099',
    });

    const res = await invokeJsonController(inventoryController.addInventorySupply);

    expect(res.statusCode).toBe(403);
    expect(res.payload.message).toMatch(/warehouse/i);
    expectNoInventoryMutation();
  });
});
