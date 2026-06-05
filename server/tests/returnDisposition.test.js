import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import handleValidationErrors from '../middlewares/validationErrors.middleware.js';
import { initiateReturnValidation } from '../validators/return.validator.js';

const buildValidationApp = () => {
  const validationApp = express();
  validationApp.use(express.json());
  validationApp.post('/validate', initiateReturnValidation, handleValidationErrors, (req, res) => {
    res.status(204).send();
  });
  return validationApp;
};

describe('return disposition validation', () => {
  const packageId = '507f1f77bcf86cd799439011';
  const productId = '507f1f77bcf86cd799439012';
  const batchId = '507f1f77bcf86cd799439013';
  const itemId = '507f1f77bcf86cd799439014';

  it('requires explicit item IDs for damaged-style return reasons', async () => {
    const res = await request(buildValidationApp())
      .post('/validate')
      .send({
        packageId,
        returnReason: 'damaged',
        returnedItems: [{ productId, batchId, quantity: 1 }],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.map((error) => error.message)).toContain(
      'Returned item IDs are required for damaged, defective, or quality issue returns',
    );
  });

  it('keeps item IDs optional for saleable return reasons', async () => {
    const res = await request(buildValidationApp())
      .post('/validate')
      .send({
        packageId,
        returnReason: 'customer_request',
        returnedItems: [{ productId, batchId, quantity: 1 }],
      });

    expect(res.statusCode).toBe(204);
  });

  it('requires item IDs for damaged-style reasons even with restock disposition', async () => {
    const res = await request(buildValidationApp())
      .post('/validate')
      .send({
        packageId,
        returnReason: 'damaged',
        returnedItems: [{ productId, batchId, quantity: 1, disposition: 'restock' }],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.map((error) => error.message)).toContain(
      'Returned item IDs are required for damaged, defective, or quality issue returns',
    );
  });

  it('requires explicit item IDs when an item disposition is non-restock', async () => {
    const res = await request(buildValidationApp())
      .post('/validate')
      .send({
        packageId,
        returnReason: 'customer_request',
        returnedItems: [{ productId, batchId, quantity: 1, disposition: 'defective' }],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.map((error) => error.message)).toContain(
      'Returned item IDs are required for damaged, defective, or quality issue returns',
    );
  });

  it('accepts explicit item IDs for non-restock dispositions', async () => {
    const res = await request(buildValidationApp())
      .post('/validate')
      .send({
        packageId,
        returnReason: 'quality_issue',
        returnedItems: [{ productId, batchId, quantity: 1, itemIds: [itemId] }],
      });

    expect(res.statusCode).toBe(204);
  });
});

describe('return disposition processing', () => {
  const session = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  };

  const Return = {
    findById: jest.fn(),
  };
  const Item = {
    updateMany: jest.fn(),
    countDocuments: jest.fn(),
    find: jest.fn(),
  };
  const Inventory = {
    updateOne: jest.fn(),
  };
  const Batch = {
    findById: jest.fn(),
  };

  jest.unstable_mockModule('mongoose', () => ({
    default: {
      startSession: jest.fn().mockResolvedValue(session),
      Types: {
        ObjectId: {
          isValid: jest.fn(() => true),
        },
      },
    },
  }));

  jest.unstable_mockModule('../models/index.js', () => ({
    Return,
    Package: {},
    Batch,
    Item,
    Inventory,
    Transport: {},
    ExternalUser: {},
  }));

  jest.unstable_mockModule('../utils/auditLogger.js', () => ({
    logAudit: jest.fn(),
  }));

  jest.unstable_mockModule('../middlewares/index.js', () => ({
    catchAsyncErrors: (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next),
  }));

  let processReturn;

  const makeQuery = (value) => ({
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    session: jest.fn().mockResolvedValue(value),
  });

  const invokeProcessReturn = async (returnRecord) => {
    Return.findById.mockReturnValue(makeQuery(returnRecord));
    Item.updateMany.mockResolvedValue({ modifiedCount: returnRecord.returnedItems[0].quantity });
    Item.countDocuments.mockReturnValue(makeQuery(0));
    Item.find.mockReturnValue(makeQuery([]));
    Batch.findById.mockReturnValue(makeQuery({ unitCost: 25 }));
    Inventory.updateOne.mockResolvedValue({});

    const req = {
      params: { returnId: 'return-1' },
      body: {},
      user: {
        _id: 'user-1',
        assignedWarehouseId: returnRecord.warehouseId,
      },
    };
    const res = {
      statusCode: 200,
      status: jest.fn((statusCode) => {
        res.statusCode = statusCode;
        return res;
      }),
      json: jest.fn((payload) => {
        res.payload = payload;
        return res;
      }),
    };

    await new Promise((resolve, reject) => {
      res.json.mockImplementation((payload) => {
        res.payload = payload;
        resolve();
        return res;
      });
      processReturn(req, res, reject);
    });
    return res;
  };

  const buildReturnRecord = ({ returnReason = 'customer_request', disposition } = {}) => {
    const itemId = '507f1f77bcf86cd799439014';
    const returnedItem = {
      productId: '507f1f77bcf86cd799439012',
      batchId: '507f1f77bcf86cd799439013',
      quantity: 1,
      itemIds: [itemId],
    };
    if (disposition !== undefined) {
      returnedItem.disposition = disposition;
    }

    return {
      returnStatus: 'picked_up',
      returnReason,
      warehouseId: '507f1f77bcf86cd799439015',
      packageId: {
        allocatedItems: [
          {
            productId: '507f1f77bcf86cd799439012',
            batchId: '507f1f77bcf86cd799439013',
            quantity: 1,
            itemIds: [itemId],
          },
        ],
      },
      orderId: { orderNumber: 'ORD-1' },
      transportId: {
        status: 'in_transit',
        save: jest.fn().mockResolvedValue({}),
      },
      returnedItems: [returnedItem],
      save: jest.fn().mockResolvedValue({}),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(session).forEach((mock) => mock.mockClear());
  });

  beforeAll(async () => {
    ({ processReturn } = await import('../controllers/return.controller.js'));
  });

  it('restocks returned items with restock disposition', async () => {
    const res = await invokeProcessReturn(buildReturnRecord({ disposition: 'restock' }));

    expect(res.statusCode).toBe(200);
    expect(Item.updateMany).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'in_stock' }),
      }),
      expect.objectContaining({ session }),
    );
  });

  it('marks non-restock returned items as damaged instead of restocking them', async () => {
    const res = await invokeProcessReturn(
      buildReturnRecord({ returnReason: 'damaged' }),
    );

    expect(res.statusCode).toBe(200);
    expect(Item.updateMany).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'damaged' }),
        $push: expect.objectContaining({
          history: expect.objectContaining({
            action: 'damaged',
            notes: expect.stringContaining('damaged'),
          }),
        }),
      }),
      expect.objectContaining({ session }),
    );
  });
});
