import { jest } from '@jest/globals';

const Item = {
  findOne: jest.fn(),
  find: jest.fn(),
};

const transitionItemStatus = jest.fn();

jest.unstable_mockModule('../models/item.model.js', () => ({ Item }));
jest.unstable_mockModule('../services/inventory/index.js', () => ({
  normalizeId: (id) => (id?._id || id)?.toString(),
  transitionItemStatus,
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

    controller(req, res, reject);
  });

const buildTrackQuery = (item) => {
  let populateCount = 0;
  return {
    select: jest.fn().mockReturnThis(),
    populate: jest.fn(function populate() {
      populateCount += 1;
      return populateCount >= 2 ? Promise.resolve(item) : this;
    }),
  };
};

let itemController;

describe('item controller architecture contracts', () => {
  beforeAll(async () => {
    itemController = await import('../controllers/item.controller.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns only customer-safe fields from public serial tracking', async () => {
    const item = {
      serialNumber: 'SER-1',
      status: 'delivered',
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      productId: {
        productName: 'Desk Lamp',
        sku: 'DL-1',
        price: 500,
      },
      batchId: {
        batchNumber: 'BATCH-1',
        expDate: new Date('2027-01-01T00:00:00Z'),
        mfgDate: new Date('2025-01-01T00:00:00Z'),
      },
      currentWarehouseId: {
        warehouseName: 'Internal Warehouse',
        address: { city: 'Hidden' },
      },
      history: [{ action: 'delivered' }],
    };
    Item.findOne.mockReturnValue(buildTrackQuery(item));

    const res = await invokeJsonController(itemController.trackItemBySerial, {
      params: { serialNumber: 'SER-1' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.payload.item).toEqual({
      serialNumber: 'SER-1',
      currentStatus: 'delivered',
      product: {
        productName: 'Desk Lamp',
        sku: 'DL-1',
      },
      batch: {
        batchNumber: 'BATCH-1',
        expDate: item.batchId.expDate,
      },
      lastUpdated: item.updatedAt,
    });
    expect(res.payload.item).not.toHaveProperty('warehouse');
    expect(res.payload.item).not.toHaveProperty('statusHistory');
    expect(res.payload.item.product).not.toHaveProperty('price');
    expect(Item.findOne.mock.results[0].value.select).toHaveBeenCalledWith('serialNumber status updatedAt');
  });

  it('uses the inventory transition service for protected status updates inside warehouse scope', async () => {
    const item = {
      _id: 'item-1',
      currentWarehouseId: 'warehouse-1',
      status: 'in_stock',
    };
    Item.findOne.mockResolvedValue(item);
    transitionItemStatus.mockResolvedValue({
      item: {
        ...item,
        status: 'damaged',
      },
    });

    const res = await invokeJsonController(itemController.updateItemStatus, {
      params: { id: 'item-1' },
      body: {
        status: 'damaged',
        notes: { message: 'Cycle count adjustment' },
      },
      user: {
        _id: 'user-1',
        assignedWarehouseId: 'warehouse-1',
      },
    });

    expect(Item.findOne).toHaveBeenCalledWith({
      _id: 'item-1',
      currentWarehouseId: 'warehouse-1',
    });
    expect(transitionItemStatus).toHaveBeenCalledWith(item, 'damaged', expect.objectContaining({
      actorId: 'user-1',
      warehouseId: 'warehouse-1',
      referenceType: 'Item',
      referenceId: 'item-1',
      movementType: 'adjustment',
      notes: 'Cycle count adjustment',
    }));
    expect(res.statusCode).toBe(200);
    expect(res.payload.item.status).toBe('damaged');
  });
});
