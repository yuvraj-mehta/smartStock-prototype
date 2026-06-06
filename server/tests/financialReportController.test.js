import { jest } from '@jest/globals';

const InventoryMovement = {
  exists: jest.fn(),
  find: jest.fn(),
};
const Item = {
  aggregate: jest.fn(),
  find: jest.fn(),
};
const FinancialEvent = {
  find: jest.fn(),
};
const JournalEntry = {
  aggregate: jest.fn(),
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
const PaymentReceived = {
  aggregate: jest.fn(),
};
const SalesInvoice = {
  find: jest.fn(),
};
const SalesHistory = {
  findById: jest.fn(),
};

jest.unstable_mockModule('../models/index.js', () => ({
  Batch: {},
  ExternalUser: {},
  FINANCE_ACCOUNT_TYPES: ['asset', 'liability', 'equity', 'revenue', 'expense'],
  FinancialEvent,
  InventoryMovement,
  Item,
  JournalEntry,
  Payment,
  PaymentReceived,
  Package,
  PurchaseOrder,
  Invoice,
  Return,
  SalesInvoice,
  SalesHistory,
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
    Return.find.mockReturnValue(buildMovementQuery([]));
    FinancialEvent.find.mockResolvedValue([]);
    JournalEntry.aggregate.mockResolvedValue([]);
    PaymentReceived.aggregate.mockResolvedValue([]);
    SalesInvoice.find.mockResolvedValue([]);
  });

  it('uses posted journal balances for COGS and revenue instead of operational inventory state', async () => {
    JournalEntry.aggregate.mockResolvedValue([
      {
        accountCode: '4000',
        accountName: 'Sales Revenue',
        netCredit: 900,
        netDebit: -900,
      },
      {
        accountCode: '5000',
        accountName: 'Cost of Goods Sold',
        netDebit: 275,
        netCredit: -275,
      },
    ]);

    const res = await invokeJsonController(financialReportController.getCOGSAndProfit);

    expect(JournalEntry.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
      {
        $match: {
          accountCode: { $in: ['4000', '5000', '5100'] },
        },
      },
    ]));
    expect(SalesOrder.find).not.toHaveBeenCalled();
    expect(InventoryMovement.find).not.toHaveBeenCalled();
    expect(Package.find).not.toHaveBeenCalled();
    expect(Return.find).not.toHaveBeenCalled();
    expect(Item.find).not.toHaveBeenCalled();
    expect(FinancialEvent.find).not.toHaveBeenCalled();
    expect(res.payload).toEqual({
      totalCOGS: 275,
      totalRevenue: 900,
      profit: 625,
    });
  });

  it('treats a YYYY-MM-DD endDate as the full UTC day for journal-backed profit reporting', async () => {
    await invokeJsonController(financialReportController.getCOGSAndProfit, {
      query: {
        startDate: '2026-04-01',
        endDate: '2026-04-30',
      },
    });

    expect(JournalEntry.aggregate.mock.calls[0][0][0]).toEqual({
      $match: {
        occurredAt: {
          $gte: new Date('2026-04-01T00:00:00.000Z'),
          $lte: new Date('2026-04-30T23:59:59.999Z'),
        },
        accountCode: { $in: ['4000', '5000', '5100'] },
      },
    });
  });

  it('nets reversal journal entries so reversed revenue and COGS are not reported as still posted', async () => {
    JournalEntry.aggregate.mockResolvedValue([
      {
        accountCode: '4000',
        accountName: 'Sales Revenue',
        debitTotal: 750,
        creditTotal: 750,
        netDebit: 0,
        netCredit: 0,
      },
      {
        accountCode: '5000',
        accountName: 'Cost of Goods Sold',
        debitTotal: 225,
        creditTotal: 225,
        netDebit: 0,
        netCredit: 0,
      },
    ]);

    const res = await invokeJsonController(financialReportController.getCOGSAndProfit);

    expect(res.payload).toEqual({
      totalCOGS: 0,
      totalRevenue: 0,
      profit: 0,
    });
  });

  it('keeps return-only reversal periods signed instead of clamping report amounts to zero', async () => {
    JournalEntry.aggregate.mockResolvedValue([
      {
        accountCode: '4000',
        accountName: 'Sales Revenue',
        debitTotal: 500,
        creditTotal: 0,
        netDebit: 500,
        netCredit: -500,
      },
      {
        accountCode: '5000',
        accountName: 'Cost of Goods Sold',
        debitTotal: 0,
        creditTotal: 125,
        netDebit: -125,
        netCredit: 125,
      },
    ]);

    const res = await invokeJsonController(financialReportController.getCOGSAndProfit);

    expect(res.payload).toEqual({
      totalCOGS: -125,
      totalRevenue: -500,
      profit: -375,
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

  it('includes canonical order sale finance events in outstanding receivables', async () => {
    SalesInvoice.find.mockResolvedValue([]);
    FinancialEvent.find.mockResolvedValue([
      { amount: 500 },
      { amount: 125 },
    ]);

    const res = await invokeJsonController(financialReportController.getOutstandingReceivables);

    expect(FinancialEvent.find).toHaveBeenCalledWith({
      eventType: 'sales_invoice',
      referenceType: 'Order',
    });
    expect(res.payload).toEqual({ totalReceivables: 625 });
  });

  it('subtracts completed canonical order payments from outstanding receivables', async () => {
    const orderOneId = { toString: () => 'order-1' };
    const orderTwoId = { toString: () => 'order-2' };
    SalesInvoice.find.mockResolvedValue([]);
    FinancialEvent.find.mockResolvedValue([
      { referenceId: orderOneId, amount: 500 },
      { referenceId: orderOneId, amount: 125 },
      { referenceId: orderTwoId, amount: 250 },
    ]);
    PaymentReceived.aggregate
      .mockResolvedValueOnce([{ totalPaid: 225 }])
      .mockResolvedValueOnce([{ totalPaid: 50 }]);

    const res = await invokeJsonController(financialReportController.getOutstandingReceivables);

    expect(PaymentReceived.aggregate).toHaveBeenNthCalledWith(1, [
      { $match: { orderId: orderOneId, status: 'completed' } },
      { $group: { _id: '$orderId', totalPaid: { $sum: { $ifNull: ['$amount', 0] } } } },
    ]);
    expect(PaymentReceived.aggregate).toHaveBeenNthCalledWith(2, [
      { $match: { orderId: orderTwoId, status: 'completed' } },
      { $group: { _id: '$orderId', totalPaid: { $sum: { $ifNull: ['$amount', 0] } } } },
    ]);
    expect(res.payload).toEqual({ totalReceivables: 600 });
  });
});
