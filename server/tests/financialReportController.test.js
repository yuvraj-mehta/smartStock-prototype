import { jest } from '@jest/globals';

const InventoryMovement = {
  exists: jest.fn(),
  find: jest.fn(),
};
const Item = {
  aggregate: jest.fn(),
  find: jest.fn(),
};
const SalesOrder = {
  find: jest.fn(),
};
const Package = {
  find: jest.fn(),
};
const PurchaseOrder = {
  find: jest.fn(),
};
const Return = {
  find: jest.fn(),
};
const Invoice = {
  findById: jest.fn(),
  findOne: jest.fn(),
};
const Payment = {
  aggregate: jest.fn(),
};

jest.unstable_mockModule('../models/index.js', () => ({
  Batch: {},
  ExternalUser: {},
  InventoryMovement,
  Item,
  Payment,
  PaymentReceived: {},
  Package,
  PurchaseOrder,
  Invoice,
  Return,
  SalesInvoice: {},
  SalesOrder,
}));
jest.unstable_mockModule('../middlewares/index.js', () => ({
  catchAsyncErrors: (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next),
  getAssignedWarehouseObjectId: () => null,
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

    controller({ query: {}, ...req }, res, reject);
  });

let financialReportController;

const buildMovementQuery = (movements) => ({
  select: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue(movements),
  then: (resolve, reject) => Promise.resolve(movements).then(resolve, reject),
});

describe('financial report source-of-truth contracts', () => {
  beforeAll(async () => {
    financialReportController = await import('../controllers/financialReport.controller.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Return.find.mockReturnValue({
      distinct: jest.fn().mockResolvedValue([]),
    });
  });

  it('computes COGS from sales-order inventory movements instead of current item status', async () => {
    const order = {
      _id: '507f1f77bcf86cd799439011',
      productId: '507f1f77bcf86cd799439012',
      quantity: 2,
      totalPrice: 500,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };
    SalesOrder.find.mockResolvedValue([order]);
    InventoryMovement.find
      .mockReturnValueOnce(buildMovementQuery([
        { itemId: 'item-1' },
        { itemId: 'item-2' },
      ]))
      .mockReturnValueOnce(buildMovementQuery([]));
    Item.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([
        { purchasePrice: 100, batchId: { unitCost: 90 } },
        { purchasePrice: undefined, batchId: { unitCost: 125 } },
      ]),
    });

    const res = await invokeJsonController(financialReportController.getCOGSAndProfit);

    expect(SalesOrder.find).toHaveBeenCalledWith({ status: 'fulfilled' });
    expect(InventoryMovement.find).toHaveBeenCalledWith({
      referenceType: 'SalesOrder',
      referenceId: order._id,
      movementType: 'dispatch',
    });
    expect(Item.find).toHaveBeenCalledWith({ _id: { $in: ['item-1', 'item-2'] } });
    expect(res.payload).toEqual({
      totalCOGS: 225,
      totalRevenue: 500,
      profit: 275,
    });
  });

  it('skips fulfilled sales orders that have no dispatch movements', async () => {
    SalesOrder.find.mockResolvedValue([
      {
        _id: '507f1f77bcf86cd799439011',
        productId: '507f1f77bcf86cd799439012',
        quantity: 2,
        totalPrice: 500,
      },
    ]);
    InventoryMovement.find
      .mockReturnValueOnce(buildMovementQuery([]))
      .mockReturnValueOnce(buildMovementQuery([]));

    const res = await invokeJsonController(financialReportController.getCOGSAndProfit);

    expect(Item.find).not.toHaveBeenCalled();
    expect(res.payload).toEqual({
      totalCOGS: 0,
      totalRevenue: 0,
      profit: 0,
    });
  });

  it('includes delivered package movements from the canonical order flow in COGS and revenue', async () => {
    SalesOrder.find.mockResolvedValue([]);
    InventoryMovement.find.mockReturnValue(buildMovementQuery([
      { itemId: 'item-1', referenceId: 'package-1' },
      { itemId: 'item-2', referenceId: 'package-1' },
    ]));
    Package.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([
        {
          _id: { toString: () => 'package-1' },
          totalValue: 500,
          allocatedItems: [
            { itemIds: ['item-1', 'item-2'], quantity: 2 },
          ],
        },
      ]),
    });
    Item.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([
        { purchasePrice: 100, batchId: { unitCost: 90 } },
        { purchasePrice: undefined, batchId: { unitCost: 125 } },
      ]),
    });

    const res = await invokeJsonController(financialReportController.getCOGSAndProfit);

    expect(Package.find).toHaveBeenCalledWith({
      _id: { $in: ['package-1'] },
      packageStatus: 'delivered',
    });
    expect(res.payload).toEqual({
      totalCOGS: 225,
      totalRevenue: 500,
      profit: 275,
    });
  });

  it('excludes returned packages from canonical package COGS and revenue', async () => {
    SalesOrder.find.mockResolvedValue([]);
    InventoryMovement.find.mockReturnValue(buildMovementQuery([
      { itemId: 'item-1', referenceId: 'package-1' },
    ]));
    Return.find.mockReturnValue({
      distinct: jest.fn().mockResolvedValue(['package-1']),
    });
    Package.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    });

    const res = await invokeJsonController(financialReportController.getCOGSAndProfit);

    expect(Return.find).toHaveBeenCalledWith({ packageId: { $in: ['package-1'] } });
    expect(Package.find).toHaveBeenCalledWith({
      _id: { $in: [] },
      packageStatus: 'delivered',
    });
    expect(Item.find).not.toHaveBeenCalled();
    expect(res.payload).toEqual({
      totalCOGS: 0,
      totalRevenue: 0,
      profit: 0,
    });
  });

  it('uses live in-stock item aggregation for inventory valuation', async () => {
    const aggregateResult = [
      {
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        totalInventoryValue: 225,
        totalQuantity: 2,
      },
    ];
    Item.aggregate.mockResolvedValue(aggregateResult);

    const res = await invokeJsonController(financialReportController.getInventoryValue);

    expect(Item.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
      { $match: { status: 'in_stock' } },
    ]));
    expect(res.payload).toBe(aggregateResult);
  });

  it('does not treat pending purchase commitments as outstanding payables', async () => {
    PurchaseOrder.find.mockResolvedValue([
      {
        _id: 'po-pending',
        status: 'pending',
        paymentStatus: 'unpaid',
        totalCost: 1000,
        receivedQuantity: 0,
        unitCost: 100,
      },
      {
        _id: 'po-received',
        status: 'received',
        paymentStatus: 'unpaid',
        totalCost: 1000,
        receivedQuantity: 3,
        unitCost: 100,
      },
      {
        _id: 'po-cancelled',
        status: 'cancelled',
        paymentStatus: 'unpaid',
        totalCost: 1000,
        receivedQuantity: 3,
        unitCost: 100,
      },
    ]);
    Invoice.findOne.mockResolvedValue(null);

    const res = await invokeJsonController(financialReportController.getOutstandingPayables);

    expect(res.payload).toEqual({ totalPayables: 300 });
  });
});
