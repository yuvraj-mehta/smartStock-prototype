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
const PurchaseOrder = {
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
  PurchaseOrder,
  Invoice,
  SalesInvoice: {},
  SalesOrder,
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

    controller({ query: {}, ...req }, res, reject);
  });

let financialReportController;

describe('financial report source-of-truth contracts', () => {
  beforeAll(async () => {
    financialReportController = await import('../controllers/financialReport.controller.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
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
    InventoryMovement.find.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([
        { itemId: 'item-1' },
        { itemId: 'item-2' },
      ]),
    });
    Item.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([
        { purchasePrice: 100, batchId: { unitCost: 90 } },
        { purchasePrice: undefined, batchId: { unitCost: 125 } },
      ]),
    });

    const res = await invokeJsonController(financialReportController.getCOGSAndProfit);

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
