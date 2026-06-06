import { jest } from '@jest/globals';

class ObjectId {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

const session = {
  withTransaction: jest.fn(async (callback) => callback()),
  endSession: jest.fn(),
};

const mongooseMock = {
  startSession: jest.fn().mockResolvedValue(session),
  Types: { ObjectId },
};

const paymentInstance = {
  save: jest.fn(),
};

const PaymentReceived = jest.fn(function PaymentReceived(attrs) {
  Object.assign(this, attrs);
  this._id = '507f1f77bcf86cd799439012';
  this.save = paymentInstance.save;
});
PaymentReceived.aggregate = jest.fn();
PaymentReceived.find = jest.fn();
PaymentReceived.findById = jest.fn();
PaymentReceived.findByIdAndUpdate = jest.fn();
PaymentReceived.findByIdAndDelete = jest.fn();

const Batch = {
  countDocuments: jest.fn(),
  find: jest.fn(),
};

const SalesInvoice = {
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  updateOne: jest.fn(),
};

const SalesOrder = {
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

const Order = {
  findById: jest.fn(),
  updateOne: jest.fn(),
};

const FinancialEvent = {
  find: jest.fn(),
};

const recordCustomerPaymentEvent = jest.fn();
const reverseUnreversedFinancialEventsForSource = jest.fn();

jest.unstable_mockModule('mongoose', () => ({ default: mongooseMock }));
jest.unstable_mockModule('../models/index.js', () => ({
  Batch,
  FinancialEvent,
  Order,
  PaymentReceived,
  SalesInvoice,
  SalesOrder,
}));
jest.unstable_mockModule('../services/finance/index.js', () => ({
  recordCustomerPaymentEvent,
  reverseUnreversedFinancialEventsForSource,
}));
jest.unstable_mockModule('../middlewares/index.js', () => ({
  catchAsyncErrors: (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next),
  normalizeId: (id) => (id?._id || id)?.toString(),
  requireAssignedWarehouseId: (req) => req.user?.assignedWarehouseId || WAREHOUSE_ID,
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

    controller({ body: {}, params: {}, ...req }, res, reject);
  });

const buildQuery = (value) => ({
  session: jest.fn().mockResolvedValue(value),
});

const buildAggregate = (value) => ({
  session: jest.fn().mockResolvedValue(value),
});

const buildTransientTransactionError = () => {
  const error = new Error('WriteConflict');
  error.hasErrorLabel = jest.fn((label) => label === 'TransientTransactionError');
  return error;
};

const retryTransientTransactionOnce = () => {
  session.withTransaction.mockImplementationOnce(async (callback) => {
    try {
      return await callback();
    } catch (error) {
      if (error.hasErrorLabel?.('TransientTransactionError')) {
        return callback();
      }
      throw error;
    }
  });
};

const buildDistinctQuery = (value) => ({
  distinct: jest.fn().mockResolvedValue(value),
});

const SALES_INVOICE_ID = '507f1f77bcf86cd799439011';
const PAYMENT_RECEIVED_ID = '507f1f77bcf86cd799439012';
const SALES_ORDER_ID = '507f1f77bcf86cd799439013';
const USER_ID = '507f1f77bcf86cd799439014';
const WAREHOUSE_ID = '507f1f77bcf86cd799439015';
const ORDER_ID = '507f1f77bcf86cd799439018';
const PAYMENT_DATE = '2026-01-01T00:00:00.000Z';

const buildInvoice = (overrides = {}) => ({
  _id: SALES_INVOICE_ID,
  salesOrderId: SALES_ORDER_ID,
  amount: 100,
  status: 'unpaid',
  dueDate: new Date('2026-02-01T00:00:00.000Z'),
  ...overrides,
});

const buildPayment = (overrides = {}) => ({
  _id: PAYMENT_RECEIVED_ID,
  salesInvoiceId: SALES_INVOICE_ID,
  amount: 30,
  date: PAYMENT_DATE,
  method: 'cash',
  status: 'completed',
  ...overrides,
});

const buildOrderPayment = (overrides = {}) => ({
  _id: PAYMENT_RECEIVED_ID,
  orderId: ORDER_ID,
  amount: 30,
  date: PAYMENT_DATE,
  method: 'cash',
  status: 'completed',
  ...overrides,
});

const buildSalesOrder = (overrides = {}) => ({
  _id: SALES_ORDER_ID,
  fulfilledItems: [
    {
      batchId: '507f1f77bcf86cd799439016',
      itemIds: ['507f1f77bcf86cd799439017'],
      quantity: 1,
    },
  ],
  ...overrides,
});

const buildOrder = (overrides = {}) => ({
  _id: ORDER_ID,
  orderStatus: 'sale_confirmed',
  ...overrides,
});

const buildOrderReceivableEvent = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439019',
  eventType: 'sales_invoice',
  referenceType: 'Order',
  referenceId: ORDER_ID,
  warehouseId: WAREHOUSE_ID,
  amount: 100,
  ...overrides,
});

const setupInvoiceSync = ({
  invoice = buildInvoice(),
  paidAmount = 30,
  paidDate = new Date(PAYMENT_DATE),
  includeOverpayCheck = false,
} = {}) => {
  if (includeOverpayCheck) {
    SalesInvoice.findById.mockReturnValueOnce(buildQuery(invoice));
    PaymentReceived.aggregate.mockReturnValueOnce(buildAggregate([]));
  }

  SalesInvoice.findById.mockReturnValueOnce(buildQuery(invoice));
  PaymentReceived.aggregate.mockReturnValueOnce(buildAggregate([{ paidAmount, paidDate }]));
  SalesInvoice.findByIdAndUpdate.mockResolvedValue({
    ...invoice,
    status: paidAmount >= invoice.amount ? 'paid' : 'partial',
  });
  SalesOrder.findByIdAndUpdate.mockResolvedValue({});
};

let paymentReceivedController;

describe('payment received controller', () => {
  beforeAll(async () => {
    paymentReceivedController = await import('../controllers/paymentReceived.controller.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    session.withTransaction.mockImplementation(async (callback) => callback());
    mongooseMock.startSession.mockResolvedValue(session);
    paymentInstance.save.mockResolvedValue(paymentInstance);
    recordCustomerPaymentEvent.mockResolvedValue({});
    reverseUnreversedFinancialEventsForSource.mockResolvedValue([]);
    Batch.countDocuments.mockReturnValue(buildQuery(1));
    Batch.find.mockReturnValue(buildDistinctQuery(['507f1f77bcf86cd799439016']));
    FinancialEvent.find.mockReturnValue(buildQuery([buildOrderReceivableEvent()]));
    Order.findById.mockReturnValue(buildQuery(buildOrder()));
    Order.updateOne.mockResolvedValue({ matchedCount: 1 });
    SalesInvoice.find.mockReturnValue(buildDistinctQuery([SALES_INVOICE_ID]));
    SalesInvoice.findById.mockReturnValue(buildQuery(buildInvoice()));
    SalesOrder.find.mockReturnValue(buildDistinctQuery([SALES_ORDER_ID]));
    SalesOrder.findById.mockReturnValue(buildQuery(buildSalesOrder()));
    SalesInvoice.updateOne.mockResolvedValue({ matchedCount: 1 });
  });

  it('rejects completed received payments that overpay a sales invoice', async () => {
    SalesInvoice.findById.mockReturnValue(buildQuery({
      _id: 'invoice-1',
      amount: 100,
    }));
    PaymentReceived.aggregate.mockReturnValue(buildAggregate([{ paidAmount: 80 }]));

    await expect(invokeJsonController(paymentReceivedController.createPaymentReceived, {
      body: {
        salesInvoiceId: '507f1f77bcf86cd799439011',
        amount: 30,
        date: '2026-01-01',
        method: 'cash',
        status: 'completed',
      },
    })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Payment received exceeds the sales invoice amount.',
    });

    expect(PaymentReceived).not.toHaveBeenCalled();
    expect(recordCustomerPaymentEvent).not.toHaveBeenCalled();
    expect(reverseUnreversedFinancialEventsForSource).not.toHaveBeenCalled();
  });

  it('rejects pending-to-completed updates that would overpay a sales invoice', async () => {
    PaymentReceived.findById.mockReturnValue(buildQuery({
      _id: '507f1f77bcf86cd799439012',
      salesInvoiceId: '507f1f77bcf86cd799439011',
      amount: 30,
      status: 'pending',
    }));
    SalesInvoice.findById.mockReturnValue(buildQuery({
      _id: 'invoice-1',
      amount: 100,
    }));
    PaymentReceived.aggregate.mockReturnValue(buildAggregate([{ paidAmount: 80 }]));

    await expect(invokeJsonController(paymentReceivedController.updatePaymentReceived, {
      params: { id: '507f1f77bcf86cd799439012' },
      body: { status: 'completed' },
    })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Payment received exceeds the sales invoice amount.',
    });

    expect(PaymentReceived.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(recordCustomerPaymentEvent).not.toHaveBeenCalled();
    expect(reverseUnreversedFinancialEventsForSource).not.toHaveBeenCalled();
  });

  it('records a customer payment financial event for completed received payments in the active transaction', async () => {
    let transactionOpen = false;
    session.withTransaction.mockImplementation(async (callback) => {
      transactionOpen = true;
      try {
        return await callback();
      } finally {
        transactionOpen = false;
      }
    });
    recordCustomerPaymentEvent.mockImplementation(async () => {
      expect(transactionOpen).toBe(true);
      return {};
    });

    setupInvoiceSync({ includeOverpayCheck: true });

    const res = await invokeJsonController(paymentReceivedController.createPaymentReceived, {
      user: { _id: USER_ID, assignedWarehouseId: WAREHOUSE_ID },
      body: {
        salesInvoiceId: SALES_INVOICE_ID,
        amount: 30,
        date: PAYMENT_DATE,
        method: 'cash',
        status: 'completed',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(recordCustomerPaymentEvent).toHaveBeenCalledWith({
      amount: 30,
      salesInvoiceId: SALES_INVOICE_ID,
      orderId: undefined,
      paymentReceivedId: PAYMENT_RECEIVED_ID,
      warehouseId: WAREHOUSE_ID,
      occurredAt: PAYMENT_DATE,
      actorId: USER_ID,
      session,
    });
    expect(reverseUnreversedFinancialEventsForSource).not.toHaveBeenCalled();
  });

  it('records a customer payment financial event for completed canonical order receipts', async () => {
    PaymentReceived.aggregate.mockReturnValue(buildAggregate([]));

    const res = await invokeJsonController(paymentReceivedController.createPaymentReceived, {
      user: { _id: USER_ID, assignedWarehouseId: WAREHOUSE_ID },
      body: {
        orderId: ORDER_ID,
        amount: 30,
        date: PAYMENT_DATE,
        method: 'bank',
        status: 'completed',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(Order.findById).toHaveBeenCalledWith(ORDER_ID);
    expect(FinancialEvent.find).toHaveBeenCalledWith({
      eventType: 'sales_invoice',
      referenceType: 'Order',
      referenceId: expect.any(ObjectId),
      warehouseId: expect.any(ObjectId),
    });
    expect(PaymentReceived).toHaveBeenCalledWith({
      salesInvoiceId: undefined,
      orderId: ORDER_ID,
      amount: 30,
      date: PAYMENT_DATE,
      method: 'bank',
      status: 'completed',
    });
    expect(SalesInvoice.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(SalesOrder.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(recordCustomerPaymentEvent).toHaveBeenCalledWith({
      amount: 30,
      salesInvoiceId: undefined,
      orderId: ORDER_ID,
      paymentReceivedId: PAYMENT_RECEIVED_ID,
      warehouseId: WAREHOUSE_ID,
      occurredAt: PAYMENT_DATE,
      actorId: USER_ID,
      session,
    });
  });

  it('rejects completed received payments that overpay a canonical order receivable', async () => {
    FinancialEvent.find.mockReturnValue(buildQuery([buildOrderReceivableEvent({ amount: 100 })]));
    PaymentReceived.aggregate.mockReturnValue(buildAggregate([{ paidAmount: 80 }]));

    await expect(invokeJsonController(paymentReceivedController.createPaymentReceived, {
      user: { assignedWarehouseId: WAREHOUSE_ID },
      body: {
        orderId: ORDER_ID,
        amount: 30,
        date: PAYMENT_DATE,
        method: 'cash',
        status: 'completed',
      },
    })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Payment received exceeds the canonical order receivable amount.',
    });

    expect(PaymentReceived).not.toHaveBeenCalled();
    expect(recordCustomerPaymentEvent).not.toHaveBeenCalled();
    expect(reverseUnreversedFinancialEventsForSource).not.toHaveBeenCalled();
  });

  it('revalidates canonical order receipts after a concurrent target write', async () => {
    retryTransientTransactionOnce();
    Order.updateOne
      .mockRejectedValueOnce(buildTransientTransactionError())
      .mockResolvedValueOnce({ matchedCount: 1 });
    FinancialEvent.find.mockReturnValue(buildQuery([buildOrderReceivableEvent({ amount: 100 })]));
    PaymentReceived.aggregate.mockReturnValueOnce(buildAggregate([{ paidAmount: 80 }]));

    await expect(invokeJsonController(paymentReceivedController.createPaymentReceived, {
      user: { assignedWarehouseId: WAREHOUSE_ID },
      body: {
        orderId: ORDER_ID,
        amount: 30,
        date: PAYMENT_DATE,
        method: 'cash',
        status: 'completed',
      },
    })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Payment received exceeds the canonical order receivable amount.',
    });

    expect(Order.updateOne).toHaveBeenCalledTimes(2);
    expect(PaymentReceived.aggregate).toHaveBeenCalledTimes(1);
    expect(Order.updateOne.mock.invocationCallOrder[1])
      .toBeLessThan(PaymentReceived.aggregate.mock.invocationCallOrder[0]);
    expect(PaymentReceived).not.toHaveBeenCalled();
    expect(recordCustomerPaymentEvent).not.toHaveBeenCalled();
  });

  it('does not record a customer payment financial event for pending received payments', async () => {
    setupInvoiceSync({ paidAmount: 0, paidDate: undefined });

    const res = await invokeJsonController(paymentReceivedController.createPaymentReceived, {
      body: {
        salesInvoiceId: SALES_INVOICE_ID,
        amount: 30,
        date: PAYMENT_DATE,
        method: 'cash',
        status: 'pending',
      },
    });

    expect(res.statusCode).toBe(201);
    expect(recordCustomerPaymentEvent).not.toHaveBeenCalled();
    expect(reverseUnreversedFinancialEventsForSource).not.toHaveBeenCalled();
  });

  it('excludes the existing completed receipt when validating amount updates', async () => {
    const paidDate = new Date('2026-01-02T00:00:00Z');
    PaymentReceived.findById.mockReturnValue(buildQuery({
      _id: '507f1f77bcf86cd799439012',
      salesInvoiceId: '507f1f77bcf86cd799439011',
      amount: 70,
      status: 'completed',
    }));
    SalesInvoice.findById
      .mockReturnValueOnce(buildQuery({
        _id: '507f1f77bcf86cd799439011',
        amount: 100,
      }))
      .mockReturnValueOnce(buildQuery({
        _id: '507f1f77bcf86cd799439011',
        amount: 100,
        salesOrderId: '507f1f77bcf86cd799439013',
      }));
    PaymentReceived.aggregate
      .mockReturnValueOnce(buildAggregate([{ paidAmount: 20 }]))
      .mockReturnValueOnce(buildAggregate([{ paidAmount: 100, paidDate }]));
    PaymentReceived.findByIdAndUpdate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439012',
      salesInvoiceId: '507f1f77bcf86cd799439011',
      amount: 80,
      status: 'completed',
    });
    SalesInvoice.findByIdAndUpdate.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      amount: 100,
      status: 'paid',
      salesOrderId: '507f1f77bcf86cd799439013',
    });

    const res = await invokeJsonController(paymentReceivedController.updatePaymentReceived, {
      params: { id: '507f1f77bcf86cd799439012' },
      body: { amount: 80 },
    });

    const [validationPipeline] = PaymentReceived.aggregate.mock.calls[0];
    expect(validationPipeline[0].$match.status).toBe('completed');
    expect(validationPipeline[0].$match._id.$ne.toString()).toBe('507f1f77bcf86cd799439012');
    expect(res.statusCode).toBe(200);
    expect(PaymentReceived.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439012',
      { amount: 80 },
      expect.objectContaining({ new: true, runValidators: true, session }),
    );
    expect(SalesInvoice.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439011',
      { $set: { status: 'paid', paidDate } },
      expect.objectContaining({ new: true, runValidators: true, session }),
    );
    expect(SalesOrder.findByIdAndUpdate).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439013',
      {
        $set: {
          salesInvoiceId: '507f1f77bcf86cd799439011',
          paymentStatus: 'paid',
        },
      },
      expect.objectContaining({ new: true, runValidators: true, session }),
    );
    expect(reverseUnreversedFinancialEventsForSource).toHaveBeenCalledWith({
      eventType: 'customer_payment',
      sourceModel: 'PaymentReceived',
      sourceDocumentId: '507f1f77bcf86cd799439012',
      actorId: undefined,
      memo: 'Customer payment receipt changed',
      session,
    });
    expect(recordCustomerPaymentEvent).toHaveBeenCalledWith({
      amount: 80,
      salesInvoiceId: '507f1f77bcf86cd799439011',
      orderId: undefined,
      paymentReceivedId: '507f1f77bcf86cd799439012',
      warehouseId: WAREHOUSE_ID,
      occurredAt: undefined,
      actorId: undefined,
      session,
    });
  });

  it('revalidates payment updates after a concurrent invoice write', async () => {
    retryTransientTransactionOnce();
    PaymentReceived.findById.mockReturnValue(buildQuery({
      _id: PAYMENT_RECEIVED_ID,
      salesInvoiceId: SALES_INVOICE_ID,
      amount: 30,
      status: 'pending',
    }));
    SalesInvoice.updateOne
      .mockRejectedValueOnce(buildTransientTransactionError())
      .mockResolvedValueOnce({ matchedCount: 1 });
    PaymentReceived.aggregate.mockReturnValueOnce(buildAggregate([{ paidAmount: 80 }]));

    await expect(invokeJsonController(paymentReceivedController.updatePaymentReceived, {
      params: { id: PAYMENT_RECEIVED_ID },
      body: { status: 'completed' },
    })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Payment received exceeds the sales invoice amount.',
    });

    expect(SalesInvoice.updateOne).toHaveBeenCalledTimes(2);
    expect(PaymentReceived.aggregate).toHaveBeenCalledTimes(1);
    expect(SalesInvoice.updateOne.mock.invocationCallOrder[1])
      .toBeLessThan(PaymentReceived.aggregate.mock.invocationCallOrder[0]);
    expect(PaymentReceived.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(recordCustomerPaymentEvent).not.toHaveBeenCalled();
  });

  it('reverses the customer payment event when a completed receipt is deleted', async () => {
    const existingPayment = buildPayment();

    PaymentReceived.findById.mockReturnValue(buildQuery(existingPayment));
    PaymentReceived.findByIdAndDelete.mockReturnValue(buildQuery(existingPayment));
    setupInvoiceSync({ paidAmount: 0, paidDate: undefined });

    const res = await invokeJsonController(paymentReceivedController.deletePaymentReceived, {
      user: { _id: USER_ID },
      params: { id: PAYMENT_RECEIVED_ID },
    });

    expect(res.statusCode).toBe(200);
    expect(SalesInvoice.updateOne).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId) },
      { $set: { updatedAt: expect.any(Date) } },
      { session, timestamps: false },
    );
    expect(SalesInvoice.updateOne.mock.invocationCallOrder[0])
      .toBeLessThan(PaymentReceived.findByIdAndDelete.mock.invocationCallOrder[0]);
    expect(reverseUnreversedFinancialEventsForSource).toHaveBeenCalledWith({
      eventType: 'customer_payment',
      sourceModel: 'PaymentReceived',
      sourceDocumentId: PAYMENT_RECEIVED_ID,
      actorId: USER_ID,
      memo: 'Customer payment receipt changed',
      session,
    });
    expect(recordCustomerPaymentEvent).not.toHaveBeenCalled();
  });
});
