import { jest } from '@jest/globals';

const session = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};

const mongooseMock = {
  startSession: jest.fn().mockResolvedValue(session),
};

const Order = {};
const Product = {};
const Item = {};
const ExternalUser = {};

const Batch = {
  find: jest.fn(),
};

const Package = {
  find: jest.fn(),
  findById: jest.fn(),
};

const Transport = {
  findOne: jest.fn(),
};

const SalesHistory = {
  create: jest.fn(),
};

const Return = {
  find: jest.fn(),
};

const recordConfirmedSaleReceivableEvent = jest.fn();
const transitionItemsStatus = jest.fn();

jest.unstable_mockModule('mongoose', () => ({ default: mongooseMock }));
jest.unstable_mockModule('../models/index.js', () => ({
  Order,
  Package,
  Product,
  Batch,
  Item,
  Transport,
  SalesHistory,
  ExternalUser,
  Return,
}));
jest.unstable_mockModule('../services/finance/index.js', () => ({
  recordConfirmedSaleReceivableEvent,
}));
jest.unstable_mockModule('../services/inventory/index.js', () => ({
  normalizeId: (id) => (id?._id || id)?.toString(),
  runWithOptionalSession: (query, activeSession) => (
    activeSession && typeof query.session === 'function'
      ? query.session(activeSession)
      : query
  ),
  transitionItemsStatus,
}));
jest.unstable_mockModule('../utils/auditLogger.js', () => ({
  logAudit: jest.fn(),
}));
jest.unstable_mockModule('../middlewares/index.js', () => ({
  catchAsyncErrors: (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next),
}));

const PACKAGE_ID = '507f1f77bcf86cd799439041';
const ORDER_ID = '507f1f77bcf86cd799439042';
const BATCH_ID = '507f1f77bcf86cd799439043';
const USER_ID = '507f1f77bcf86cd799439044';
const WAREHOUSE_ID = '507f1f77bcf86cd799439045';
const SALES_HISTORY_ID = '507f1f77bcf86cd799439046';
const DELIVERED_AT = new Date('2026-01-01T00:00:00Z');

const buildQuery = (value) => ({
  session: jest.fn().mockResolvedValue(value),
});

const buildPopulateQuery = (value) => ({
  populate: jest.fn().mockReturnThis(),
  session: jest.fn().mockResolvedValue(value),
  then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
});

const buildBatchQuery = (value) => {
  const selectedQuery = buildQuery(value);
  return {
    select: jest.fn().mockReturnValue(selectedQuery),
  };
};

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
        _id: USER_ID,
        assignedWarehouseId: WAREHOUSE_ID,
      },
      ...req,
    }, res, reject);
  });

const buildOrder = (overrides = {}) => ({
  _id: ORDER_ID,
  orderStatus: 'delivered',
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const buildPackage = (overrides = {}) => ({
  _id: PACKAGE_ID,
  packageId: 'PKG-TEST',
  packageStatus: 'delivered',
  totalValue: 1250,
  allocatedItems: [
    {
      productId: '507f1f77bcf86cd799439047',
      batchId: BATCH_ID,
      quantity: 2,
      itemIds: [
        '507f1f77bcf86cd799439048',
        '507f1f77bcf86cd799439049',
      ],
    },
  ],
  orderId: buildOrder(),
  ...overrides,
});

let orderController;

describe('order controller finance integration', () => {
  beforeAll(async () => {
    orderController = await import('../controllers/order.controller.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mongooseMock.startSession.mockResolvedValue(session);
    Batch.find.mockReturnValue(buildBatchQuery([
      {
        _id: { toString: () => BATCH_ID },
        warehouseId: WAREHOUSE_ID,
      },
    ]));
    recordConfirmedSaleReceivableEvent.mockResolvedValue({});
  });

  it('records a receivable financial event when auto-confirming a delivered package sale', async () => {
    const packageDoc = buildPackage();
    const salesHistory = { _id: SALES_HISTORY_ID };
    const transport = {
      _id: '507f1f77bcf86cd799439050',
      packageId: PACKAGE_ID,
      deliveredAt: DELIVERED_AT,
    };

    Package.find.mockReturnValue(buildPopulateQuery([{ _id: PACKAGE_ID }]));
    Package.findById.mockReturnValue(buildPopulateQuery(packageDoc));
    Transport.findOne.mockReturnValue(buildQuery(transport));
    SalesHistory.create.mockResolvedValue([salesHistory]);
    Return.find.mockReturnValue(buildQuery([]));

    const res = await invokeJsonController(orderController.autoConfirmSale);

    expect(res.statusCode).toBe(200);
    expect(res.payload.confirmedCount).toBe(1);
    expect(SalesHistory.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          packageId: PACKAGE_ID,
          orderId: ORDER_ID,
          products: packageDoc.allocatedItems,
          warehouseId: WAREHOUSE_ID,
          saleConfirmationDate: expect.any(Date),
          deliveryDate: DELIVERED_AT,
          notes: 'Auto-confirmed after 10 days',
        }),
      ],
      { session },
    );
    expect(recordConfirmedSaleReceivableEvent).toHaveBeenCalledWith({
      amount: 1250,
      orderId: ORDER_ID,
      packageId: PACKAGE_ID,
      packageNumber: 'PKG-TEST',
      salesHistoryId: SALES_HISTORY_ID,
      allocatedItems: packageDoc.allocatedItems,
      warehouseId: WAREHOUSE_ID,
      occurredAt: expect.any(Date),
      deliveryDate: DELIVERED_AT,
      actorId: USER_ID,
      session,
    });
    expect(packageDoc.orderId.orderStatus).toBe('sale_confirmed');
    expect(packageDoc.orderId.save).toHaveBeenCalledWith({ session });
    expect(session.commitTransaction).toHaveBeenCalled();
    expect(session.abortTransaction).not.toHaveBeenCalled();
  });

  it('auto-confirms only the remaining saleable allocation after a partial return', async () => {
    const packageDoc = buildPackage();
    const salesHistory = { _id: SALES_HISTORY_ID };
    const transport = {
      _id: '507f1f77bcf86cd799439050',
      packageId: PACKAGE_ID,
      deliveredAt: DELIVERED_AT,
    };
    const returnedItemId = packageDoc.allocatedItems[0].itemIds[0];
    const remainingItemId = packageDoc.allocatedItems[0].itemIds[1];
    const expectedSaleableItems = [{
      productId: packageDoc.allocatedItems[0].productId,
      batchId: BATCH_ID,
      quantity: 1,
      itemIds: [remainingItemId],
    }];

    Package.find.mockReturnValue(buildPopulateQuery([{ _id: PACKAGE_ID }]));
    Package.findById.mockReturnValue(buildPopulateQuery(packageDoc));
    Transport.findOne.mockReturnValue(buildQuery(transport));
    Return.find.mockReturnValue(buildQuery([{
      returnedItems: [{
        productId: packageDoc.allocatedItems[0].productId,
        batchId: BATCH_ID,
        quantity: 1,
        itemIds: [returnedItemId],
      }],
    }]));
    SalesHistory.create.mockResolvedValue([salesHistory]);

    const res = await invokeJsonController(orderController.autoConfirmSale);

    expect(res.statusCode).toBe(200);
    expect(res.payload.confirmedCount).toBe(1);
    expect(SalesHistory.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          packageId: PACKAGE_ID,
          orderId: ORDER_ID,
          products: expectedSaleableItems,
          warehouseId: WAREHOUSE_ID,
        }),
      ],
      { session },
    );
    expect(recordConfirmedSaleReceivableEvent).toHaveBeenCalledWith({
      amount: 625,
      orderId: ORDER_ID,
      packageId: PACKAGE_ID,
      packageNumber: 'PKG-TEST',
      salesHistoryId: SALES_HISTORY_ID,
      allocatedItems: expectedSaleableItems,
      warehouseId: WAREHOUSE_ID,
      occurredAt: expect.any(Date),
      deliveryDate: DELIVERED_AT,
      actorId: USER_ID,
      session,
    });
    expect(packageDoc.orderId.orderStatus).toBe('sale_confirmed');
  });
});
