import { jest } from '@jest/globals';

const session = {
  withTransaction: jest.fn(async (callback) => callback()),
  endSession: jest.fn(),
};

const mongooseMock = {
  startSession: jest.fn().mockResolvedValue(session),
};

const cron = {
  schedule: jest.fn(),
};

const Batch = {
  findOne: jest.fn(),
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

jest.unstable_mockModule('mongoose', () => ({ default: mongooseMock }));
jest.unstable_mockModule('node-cron', () => ({ default: cron }));
jest.unstable_mockModule('../models/index.js', () => ({
  Batch,
  Package,
  Transport,
  SalesHistory,
  Return,
}));
jest.unstable_mockModule('../services/finance/index.js', () => ({
  recordConfirmedSaleReceivableEvent,
}));

const buildPopulateQuery = (value) => ({
  populate: jest.fn().mockResolvedValue(value),
});

const buildPopulateSessionQuery = (value) => ({
  populate: jest.fn().mockReturnThis(),
  session: jest.fn().mockResolvedValue(value),
});

const buildSessionQuery = (value) => ({
  session: jest.fn().mockResolvedValue(value),
});

const buildSelectSessionQuery = (value) => ({
  select: jest.fn().mockReturnValue(buildSessionQuery(value)),
});

const PACKAGE_ID = '507f1f77bcf86cd799439101';
const ORDER_ID = '507f1f77bcf86cd799439102';
const BATCH_ID = '507f1f77bcf86cd799439103';
const WAREHOUSE_ID = '507f1f77bcf86cd799439104';
const SALES_HISTORY_ID = '507f1f77bcf86cd799439105';
const PRODUCT_ID = '507f1f77bcf86cd799439108';
const DELIVERED_AT = new Date('2026-01-01T00:00:00Z');

const buildOrder = () => ({
  _id: ORDER_ID,
  orderStatus: 'delivered',
  save: jest.fn().mockResolvedValue(undefined),
});

const buildPackage = (order = buildOrder(), overrides = {}) => ({
  _id: PACKAGE_ID,
  packageId: 'PKG-SCHED',
  packageStatus: 'delivered',
  totalValue: 725,
  orderId: order,
  allocatedItems: [
    {
      productId: PRODUCT_ID,
      batchId: BATCH_ID,
      itemIds: ['507f1f77bcf86cd799439106'],
      quantity: 1,
    },
  ],
  ...overrides,
});

let scheduler;

describe('scheduled sale confirmation finance integration', () => {
  beforeAll(async () => {
    scheduler = await import('../utils/scheduler.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mongooseMock.startSession.mockResolvedValue(session);
    session.withTransaction.mockImplementation(async (callback) => callback());
    Return.find.mockReturnValue(buildSessionQuery([]));
  });

  afterEach(() => {
    console.log.mockRestore();
    console.error.mockRestore();
  });

  it('records a receivable ledger event when the scheduled job auto-confirms a sale', async () => {
    const order = buildOrder();
    const packageDoc = buildPackage(order);
    const salesHistory = { _id: SALES_HISTORY_ID };

    Package.find.mockReturnValue(buildPopulateQuery([{ _id: PACKAGE_ID }]));
    Package.findById.mockReturnValue(buildPopulateSessionQuery(packageDoc));
    Transport.findOne.mockReturnValue(buildSessionQuery({
      _id: '507f1f77bcf86cd799439107',
      packageId: PACKAGE_ID,
      deliveredAt: DELIVERED_AT,
    }));
    Batch.findOne.mockReturnValue(buildSelectSessionQuery({
      _id: BATCH_ID,
      warehouseId: WAREHOUSE_ID,
    }));
    SalesHistory.create.mockResolvedValue([salesHistory]);
    recordConfirmedSaleReceivableEvent.mockResolvedValue({});

    await scheduler.autoConfirmSales();

    expect(session.withTransaction).toHaveBeenCalledTimes(1);
    expect(SalesHistory.create).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          packageId: PACKAGE_ID,
          orderId: ORDER_ID,
          products: packageDoc.allocatedItems,
          warehouseId: WAREHOUSE_ID,
          deliveryDate: DELIVERED_AT,
          notes: 'Auto-confirmed after 10 days',
        }),
      ],
      { session },
    );
    expect(recordConfirmedSaleReceivableEvent).toHaveBeenCalledWith({
      amount: 725,
      orderId: ORDER_ID,
      packageId: PACKAGE_ID,
      packageNumber: 'PKG-SCHED',
      salesHistoryId: SALES_HISTORY_ID,
      allocatedItems: packageDoc.allocatedItems,
      warehouseId: WAREHOUSE_ID,
      occurredAt: expect.any(Date),
      deliveryDate: DELIVERED_AT,
      session,
    });
    expect(order.orderStatus).toBe('sale_confirmed');
    expect(order.save).toHaveBeenCalledWith({ session });
    expect(session.endSession).toHaveBeenCalled();
  });

  it('records scheduled auto-confirmation only for items not covered by partial returns', async () => {
    const order = buildOrder();
    const returnedItemId = '507f1f77bcf86cd799439109';
    const remainingItemId = '507f1f77bcf86cd799439110';
    const packageDoc = buildPackage(order, {
      totalValue: 800,
      allocatedItems: [
        {
          productId: PRODUCT_ID,
          batchId: BATCH_ID,
          itemIds: [returnedItemId, remainingItemId],
          quantity: 2,
        },
      ],
    });
    const salesHistory = { _id: SALES_HISTORY_ID };
    const expectedSaleableItems = [{
      productId: PRODUCT_ID,
      batchId: BATCH_ID,
      quantity: 1,
      itemIds: [remainingItemId],
    }];

    Package.find.mockReturnValue(buildPopulateQuery([{ _id: PACKAGE_ID }]));
    Package.findById.mockReturnValue(buildPopulateSessionQuery(packageDoc));
    Transport.findOne.mockReturnValue(buildSessionQuery({
      _id: '507f1f77bcf86cd799439107',
      packageId: PACKAGE_ID,
      deliveredAt: DELIVERED_AT,
    }));
    Batch.findOne.mockReturnValue(buildSelectSessionQuery({
      _id: BATCH_ID,
      warehouseId: WAREHOUSE_ID,
    }));
    Return.find.mockReturnValue(buildSessionQuery([{
      returnedItems: [{
        productId: PRODUCT_ID,
        batchId: BATCH_ID,
        quantity: 1,
        itemIds: [returnedItemId],
      }],
    }]));
    SalesHistory.create.mockResolvedValue([salesHistory]);
    recordConfirmedSaleReceivableEvent.mockResolvedValue({});

    await scheduler.autoConfirmSales();

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
      amount: 400,
      orderId: ORDER_ID,
      packageId: PACKAGE_ID,
      packageNumber: 'PKG-SCHED',
      salesHistoryId: SALES_HISTORY_ID,
      allocatedItems: expectedSaleableItems,
      warehouseId: WAREHOUSE_ID,
      occurredAt: expect.any(Date),
      deliveryDate: DELIVERED_AT,
      session,
    });
    expect(order.orderStatus).toBe('sale_confirmed');
  });
});
