import { jest } from '@jest/globals';

const session = {
  withTransaction: jest.fn(async (callback) => callback()),
  endSession: jest.fn(),
};

const mongooseMock = {
  startSession: jest.fn().mockResolvedValue(session),
  Types: {
    ObjectId: class ObjectId {
      constructor(value) {
        this.value = value;
      }

      toString() {
        return this.value;
      }
    },
  },
};

const Batch = {
  countDocuments: jest.fn(),
  find: jest.fn(),
};
const PaymentReceived = {
  aggregate: jest.fn(),
  deleteMany: jest.fn(),
  find: jest.fn(),
};
const SalesInvoice = jest.fn(function SalesInvoiceModel(attrs) {
  Object.assign(this, attrs);
  this._id = SALES_INVOICE_ID;
  this.createdAt = new Date('2026-01-15T00:00:00Z');
  this.save = jest.fn().mockResolvedValue(this);
});
SalesInvoice.find = jest.fn();
SalesInvoice.findById = jest.fn();
SalesInvoice.findByIdAndDelete = jest.fn();
SalesInvoice.findByIdAndUpdate = jest.fn();
const SalesOrder = {
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  updateOne: jest.fn(),
};
const recordSalesInvoiceEvent = jest.fn();
const reverseUnreversedFinancialEventsForSource = jest.fn();

jest.unstable_mockModule('mongoose', () => ({ default: mongooseMock }));
jest.unstable_mockModule('../models/index.js', () => ({
  Batch,
  PaymentReceived,
  SalesInvoice,
  SalesOrder,
}));
jest.unstable_mockModule('../middlewares/index.js', () => ({
  catchAsyncErrors: (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next),
  normalizeId: (id) => (id?._id || id)?.toString(),
  requireAssignedWarehouseId: (req) => req.user?.assignedWarehouseId || WAREHOUSE_ID,
}));
jest.unstable_mockModule('../services/finance/index.js', () => ({
  recordSalesInvoiceEvent,
  reverseUnreversedFinancialEventsForSource,
}));

const SALES_INVOICE_ID = '507f1f77bcf86cd799439011';
const SALES_ORDER_ID = '507f1f77bcf86cd799439013';
const USER_ID = '507f1f77bcf86cd799439014';
const WAREHOUSE_ID = '507f1f77bcf86cd799439015';
const BATCH_ID = '507f1f77bcf86cd799439016';
const PAYMENT_RECEIVED_ID = '507f1f77bcf86cd799439017';

const buildQuery = (value) => ({
  session: jest.fn().mockResolvedValue(value),
});

const buildFindQuery = (value) => ({
  populate: jest.fn().mockReturnThis(),
  session: jest.fn().mockResolvedValue(value),
  then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
});

const buildDistinctQuery = (value) => ({
  distinct: jest.fn().mockResolvedValue(value),
});

const buildAggregate = (value) => ({
  session: jest.fn().mockResolvedValue(value),
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
      body: {},
      params: {},
      user: {
        _id: USER_ID,
        assignedWarehouseId: WAREHOUSE_ID,
      },
      ...req,
    }, res, reject);
  });

const buildInvoice = (overrides = {}) => ({
  _id: SALES_INVOICE_ID,
  salesOrderId: SALES_ORDER_ID,
  amount: 100,
  dueDate: new Date('2026-02-01T00:00:00Z'),
  status: 'partial',
  ...overrides,
});

const buildSalesOrder = (overrides = {}) => ({
  _id: SALES_ORDER_ID,
  fulfilledItems: [
    {
      batchId: BATCH_ID,
      itemIds: ['507f1f77bcf86cd799439018'],
      quantity: 1,
    },
  ],
  ...overrides,
});

let salesInvoiceController;

describe('sales invoice controller receivables guardrails', () => {
  beforeAll(async () => {
    salesInvoiceController = await import('../controllers/salesInvoice.controller.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    session.withTransaction.mockImplementation(async (callback) => callback());
    mongooseMock.startSession.mockResolvedValue(session);
    Batch.countDocuments.mockReturnValue(buildQuery(1));
    Batch.find.mockReturnValue(buildDistinctQuery([BATCH_ID]));
    PaymentReceived.aggregate.mockReturnValue(buildAggregate([]));
    PaymentReceived.deleteMany.mockReturnValue(buildQuery({ deletedCount: 1 }));
    PaymentReceived.find.mockReturnValue(buildQuery([]));
    SalesInvoice.find.mockReturnValue(buildFindQuery([]));
    SalesInvoice.findById.mockReturnValue(buildQuery(buildInvoice()));
    SalesInvoice.findByIdAndDelete.mockReturnValue(buildQuery(buildInvoice()));
    SalesInvoice.findByIdAndUpdate.mockResolvedValue(buildInvoice());
    SalesOrder.find.mockReturnValue(buildDistinctQuery([SALES_ORDER_ID]));
    SalesOrder.findById.mockReturnValue(buildQuery(buildSalesOrder()));
    SalesOrder.findByIdAndUpdate.mockResolvedValue(buildSalesOrder({
      salesInvoiceId: SALES_INVOICE_ID,
      paymentStatus: 'unpaid',
    }));
    SalesOrder.updateOne.mockResolvedValue({ modifiedCount: 1 });
    recordSalesInvoiceEvent.mockResolvedValue({});
    reverseUnreversedFinancialEventsForSource.mockResolvedValue([]);
  });

  it('records a sales invoice ledger event when creating an invoice', async () => {
    SalesInvoice.findById.mockReturnValue(buildQuery(buildInvoice({
      _id: SALES_INVOICE_ID,
      salesOrderId: SALES_ORDER_ID,
      amount: 100,
      status: 'unpaid',
    })));

    const res = await invokeJsonController(salesInvoiceController.createSalesInvoice, {
      body: {
        salesOrderId: SALES_ORDER_ID,
        amount: 100,
        dueDate: '2026-02-01T00:00:00Z',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(recordSalesInvoiceEvent).toHaveBeenCalledWith({
      amount: 100,
      salesInvoiceId: SALES_INVOICE_ID,
      salesOrderId: SALES_ORDER_ID,
      warehouseId: WAREHOUSE_ID,
      occurredAt: expect.any(Date),
      actorId: USER_ID,
      session,
    });
  });

  it('filters sales invoices through fulfilled batches in the authenticated warehouse', async () => {
    await invokeJsonController(salesInvoiceController.getAllSalesInvoices);

    expect(Batch.find).toHaveBeenCalledWith({ warehouseId: WAREHOUSE_ID });
    expect(SalesOrder.find).toHaveBeenCalledWith({
      'fulfilledItems.batchId': { $in: [BATCH_ID] },
    });
    expect(SalesInvoice.find).toHaveBeenCalledWith({
      salesOrderId: { $in: [SALES_ORDER_ID] },
    });
  });

  it('rejects reducing invoice amount below completed received payments', async () => {
    PaymentReceived.aggregate.mockReturnValue(buildAggregate([{ paidAmount: 80 }]));

    await expect(invokeJsonController(salesInvoiceController.updateSalesInvoice, {
      params: { id: SALES_INVOICE_ID },
      body: { amount: 70 },
    })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Sales invoice amount cannot be less than completed received payments.',
    });

    expect(SalesInvoice.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('reverses completed customer payment events before deleting an invoice directly', async () => {
    const completedPayment = {
      _id: PAYMENT_RECEIVED_ID,
      salesInvoiceId: SALES_INVOICE_ID,
      status: 'completed',
    };
    PaymentReceived.find.mockReturnValue(buildQuery([completedPayment]));

    const res = await invokeJsonController(salesInvoiceController.deleteSalesInvoice, {
      params: { id: SALES_INVOICE_ID },
    });

    expect(res.statusCode).toBe(200);
    expect(reverseUnreversedFinancialEventsForSource).toHaveBeenCalledWith({
      eventType: 'customer_payment',
      sourceModel: 'PaymentReceived',
      sourceDocumentId: PAYMENT_RECEIVED_ID,
      actorId: USER_ID,
      memo: 'Sales invoice deleted',
      session,
    });
    expect(PaymentReceived.deleteMany).toHaveBeenCalledWith({ salesInvoiceId: SALES_INVOICE_ID });
    expect(SalesInvoice.findByIdAndDelete).toHaveBeenCalledWith(SALES_INVOICE_ID);
    expect(SalesOrder.updateOne).toHaveBeenCalledWith(
      { _id: SALES_ORDER_ID, salesInvoiceId: SALES_INVOICE_ID },
      { $unset: { salesInvoiceId: '' }, $set: { paymentStatus: 'unpaid' } },
      { session, runValidators: true },
    );
  });
});
