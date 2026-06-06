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

  it.each(['defective', 'damaged', 'quality_issue'])(
    'accepts selected delivered item IDs for %s returns',
    async (returnReason) => {
      const res = await request(buildValidationApp())
        .post('/validate')
        .send({
          packageId,
          returnReason,
          returnedItems: [{
            productId,
            batchId,
            quantity: 1,
            disposition: returnReason,
            itemIds: [itemId],
          }],
        });

      expect(res.statusCode).toBe(204);
    },
  );

  it('rejects empty item ID selections for non-restock returns', async () => {
    const res = await request(buildValidationApp())
      .post('/validate')
      .send({
        packageId,
        returnReason: 'defective',
        returnedItems: [{ productId, batchId, quantity: 1, itemIds: [] }],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors.map((error) => error.message)).toContain(
      'Returned item IDs are required for damaged, defective, or quality issue returns',
    );
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
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  };
  const transitionItemsStatus = jest.fn();
  const Batch = {
    find: jest.fn(),
    findById: jest.fn(),
  };
  const Package = {
    findById: jest.fn(),
  };
  const Transport = {
    findOne: jest.fn(),
  };
  const logAudit = jest.fn();

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
    Package,
    Batch,
    Transport,
    ExternalUser: {},
  }));

  jest.unstable_mockModule('../services/inventory/index.js', () => ({
    transitionItemsStatus,
  }));

  jest.unstable_mockModule('../utils/auditLogger.js', () => ({
    logAudit,
  }));

  jest.unstable_mockModule('../middlewares/index.js', () => ({
    catchAsyncErrors: (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next),
  }));

  let initiateReturn;
  let processReturn;

  const PACKAGE_ID = '507f1f77bcf86cd799439011';
  const ORDER_ID = '507f1f77bcf86cd799439016';
  const PRODUCT_ID = '507f1f77bcf86cd799439012';
  const BATCH_ID = '507f1f77bcf86cd799439013';
  const ITEM_ID_1 = '507f1f77bcf86cd799439014';
  const ITEM_ID_2 = '507f1f77bcf86cd799439017';
  const WAREHOUSE_ID = '507f1f77bcf86cd799439015';

  const makeQuery = (value) => ({
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    session: jest.fn().mockResolvedValue(value),
  });

  const invokeInitiateReturn = async ({ packageDoc, returnedItems, existingReturns = [] }) => {
    Return.find.mockReturnValue(makeQuery(existingReturns));
    Return.create.mockImplementation(async ([returnRecord]) => [{
      _id: 'return-1',
      ...returnRecord,
    }]);
    Package.findById.mockReturnValue(makeQuery(packageDoc));
    Batch.find.mockReturnValue(makeQuery([
      {
        _id: { toString: () => BATCH_ID },
        warehouseId: WAREHOUSE_ID,
      },
    ]));
    Transport.findOne.mockReturnValue(makeQuery({
      deliveredAt: new Date(),
    }));

    const req = {
      body: {
        packageId: PACKAGE_ID,
        returnReason: 'customer_request',
        returnedItems,
      },
      user: {
        _id: 'user-1',
        assignedWarehouseId: WAREHOUSE_ID,
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
      initiateReturn(req, res, reject);
    });
    return res;
  };

  const invokeProcessReturn = async (returnRecord, otherReturns = []) => {
    Return.findById.mockReturnValue(makeQuery(returnRecord));
    Return.find.mockReturnValue(makeQuery(otherReturns));
    transitionItemsStatus.mockResolvedValue({ modifiedCount: returnRecord.returnedItems[0].quantity });
    Batch.findById.mockReturnValue(makeQuery({ unitCost: 25 }));

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
      _id: 'return-1',
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

  const buildDeliveredPackage = () => ({
    _id: PACKAGE_ID,
    packageStatus: 'delivered',
    allocatedItems: [
      {
        productId: PRODUCT_ID,
        batchId: BATCH_ID,
        quantity: 2,
        itemIds: [ITEM_ID_1, ITEM_ID_2],
      },
    ],
    orderId: {
      _id: ORDER_ID,
      orderNumber: 'ORD-1',
      orderStatus: 'delivered',
      save: jest.fn().mockResolvedValue({}),
    },
    save: jest.fn().mockResolvedValue({}),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Object.values(session).forEach((mock) => mock.mockClear());
  });

  beforeAll(async () => {
    ({ initiateReturn, processReturn } = await import('../controllers/return.controller.js'));
  });

  it('keeps package and order delivered when a return covers only part of the delivered allocation', async () => {
    const packageDoc = buildDeliveredPackage();

    const res = await invokeInitiateReturn({
      packageDoc,
      returnedItems: [{
        productId: PRODUCT_ID,
        batchId: BATCH_ID,
        quantity: 1,
        itemIds: [ITEM_ID_1],
      }],
    });

    expect(res.statusCode).toBe(201);
    expect(packageDoc.packageStatus).toBe('delivered');
    expect(packageDoc.orderId.orderStatus).toBe('delivered');
    expect(packageDoc.save).not.toHaveBeenCalled();
    expect(packageDoc.orderId.save).not.toHaveBeenCalled();
    expect(Return.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          packageId: PACKAGE_ID,
          orderId: ORDER_ID,
          returnedItems: [
            expect.objectContaining({
              productId: PRODUCT_ID,
              batchId: BATCH_ID,
              quantity: 1,
              itemIds: [ITEM_ID_1],
            }),
          ],
        }),
      ],
      { session },
    );
    expect(session.commitTransaction).toHaveBeenCalled();
  });

  it('adds inferred item IDs to restock partial returns when package item traceability exists', async () => {
    const packageDoc = buildDeliveredPackage();

    const res = await invokeInitiateReturn({
      packageDoc,
      returnedItems: [{
        productId: PRODUCT_ID,
        batchId: BATCH_ID,
        quantity: 1,
      }],
    });

    expect(res.statusCode).toBe(201);
    expect(Return.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          returnedItems: [
            expect.objectContaining({
              quantity: 1,
              itemIds: [ITEM_ID_1],
            }),
          ],
        }),
      ],
      { session },
    );
  });

  it('allows repeated partial returns for different remaining items and marks full coverage returned', async () => {
    const packageDoc = buildDeliveredPackage();

    const res = await invokeInitiateReturn({
      packageDoc,
      existingReturns: [{
        returnedItems: [{
          productId: PRODUCT_ID,
          batchId: BATCH_ID,
          quantity: 1,
          itemIds: [ITEM_ID_1],
        }],
      }],
      returnedItems: [{
        productId: PRODUCT_ID,
        batchId: BATCH_ID,
        quantity: 1,
      }],
    });

    expect(res.statusCode).toBe(201);
    expect(Return.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          returnedItems: [
            expect.objectContaining({
              quantity: 1,
              itemIds: [ITEM_ID_2],
            }),
          ],
        }),
      ],
      { session },
    );
    expect(packageDoc.packageStatus).toBe('returned');
    expect(packageDoc.orderId.orderStatus).toBe('returned');
    expect(packageDoc.save).toHaveBeenCalledWith({ session });
    expect(packageDoc.orderId.save).toHaveBeenCalledWith({ session });
  });

  it('rejects a repeated partial return for an item that was already returned', async () => {
    const packageDoc = buildDeliveredPackage();

    const res = await invokeInitiateReturn({
      packageDoc,
      existingReturns: [{
        returnedItems: [{
          productId: PRODUCT_ID,
          batchId: BATCH_ID,
          quantity: 1,
          itemIds: [ITEM_ID_1],
        }],
      }],
      returnedItems: [{
        productId: PRODUCT_ID,
        batchId: BATCH_ID,
        quantity: 1,
        itemIds: [ITEM_ID_1],
      }],
    });

    expect(res.statusCode).toBe(409);
    expect(res.payload.message).toBe('Returned item has already been returned.');
    expect(Return.create).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalled();
  });

  it('rejects repeated partial returns that exceed the remaining package quantity', async () => {
    const packageDoc = buildDeliveredPackage();

    const res = await invokeInitiateReturn({
      packageDoc,
      existingReturns: [{
        returnedItems: [{
          productId: PRODUCT_ID,
          batchId: BATCH_ID,
          quantity: 1,
          itemIds: [ITEM_ID_1],
        }],
      }],
      returnedItems: [{
        productId: PRODUCT_ID,
        batchId: BATCH_ID,
        quantity: 2,
      }],
    });

    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toBe(`Return quantity exceeds remaining returnable quantity for product: ${PRODUCT_ID}`);
    expect(Return.create).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalled();
  });

  it('marks package and order returned when the return covers the full delivered allocation', async () => {
    const packageDoc = buildDeliveredPackage();

    const res = await invokeInitiateReturn({
      packageDoc,
      returnedItems: [{
        productId: PRODUCT_ID,
        batchId: BATCH_ID,
        quantity: 2,
        itemIds: [ITEM_ID_1, ITEM_ID_2],
      }],
    });

    expect(res.statusCode).toBe(201);
    expect(packageDoc.packageStatus).toBe('returned');
    expect(packageDoc.orderId.orderStatus).toBe('returned');
    expect(packageDoc.save).toHaveBeenCalledWith({ session });
    expect(packageDoc.orderId.save).toHaveBeenCalledWith({ session });
    expect(session.commitTransaction).toHaveBeenCalled();
  });

  it('restocks returned items with restock disposition', async () => {
    const res = await invokeProcessReturn(buildReturnRecord({ disposition: 'restock' }));

    expect(res.statusCode).toBe(200);
    expect(transitionItemsStatus).toHaveBeenCalledWith(expect.objectContaining({
      fromStatus: 'delivered',
      toStatus: 'in_stock',
      movementType: 'return',
      historyAction: 'returned',
      session,
    }));
  });

  it('processes a legacy restock return without item IDs against remaining unreturned items', async () => {
    const returnRecord = buildReturnRecord({ disposition: 'restock' });
    returnRecord.returnedItems[0].itemIds = [];
    returnRecord.packageId.allocatedItems[0].quantity = 2;
    returnRecord.packageId.allocatedItems[0].itemIds = [ITEM_ID_1, ITEM_ID_2];

    const res = await invokeProcessReturn(returnRecord, [{
      returnedItems: [{
        productId: '507f1f77bcf86cd799439012',
        batchId: '507f1f77bcf86cd799439013',
        quantity: 1,
        itemIds: [ITEM_ID_1],
      }],
    }]);

    expect(res.statusCode).toBe(200);
    expect(returnRecord.returnedItems[0].itemIds).toEqual([ITEM_ID_2]);
    expect(transitionItemsStatus).toHaveBeenCalledWith(expect.objectContaining({
      itemIds: [ITEM_ID_2],
      toStatus: 'in_stock',
      session,
    }));
  });

  it('marks non-restock returned items as damaged instead of restocking them', async () => {
    const res = await invokeProcessReturn(
      buildReturnRecord({ returnReason: 'damaged' }),
    );

    expect(res.statusCode).toBe(200);
    expect(transitionItemsStatus).toHaveBeenCalledWith(expect.objectContaining({
      fromStatus: 'delivered',
      toStatus: 'damaged',
      movementType: 'damage',
      historyAction: 'damaged',
      notes: expect.stringContaining('damaged'),
      session,
    }));
  });
});
