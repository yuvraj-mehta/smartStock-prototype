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
PaymentReceived.findById = jest.fn();
PaymentReceived.findByIdAndUpdate = jest.fn();
PaymentReceived.findByIdAndDelete = jest.fn();

const SalesInvoice = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

const SalesOrder = {
  findByIdAndUpdate: jest.fn(),
};

const recordCustomerPaymentEvent = jest.fn();
const reverseUnreversedFinancialEventsForSource = jest.fn();

jest.unstable_mockModule('mongoose', () => ({ default: mongooseMock }));
jest.unstable_mockModule('../models/index.js', () => ({
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

const SALES_INVOICE_ID = '507f1f77bcf86cd799439011';
const PAYMENT_RECEIVED_ID = '507f1f77bcf86cd799439012';
const SALES_ORDER_ID = '507f1f77bcf86cd799439013';
const USER_ID = '507f1f77bcf86cd799439014';
const WAREHOUSE_ID = '507f1f77bcf86cd799439015';
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
      paymentReceivedId: PAYMENT_RECEIVED_ID,
      warehouseId: WAREHOUSE_ID,
      occurredAt: PAYMENT_DATE,
      actorId: USER_ID,
      session,
    });
    expect(reverseUnreversedFinancialEventsForSource).not.toHaveBeenCalled();
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
      paymentReceivedId: '507f1f77bcf86cd799439012',
      warehouseId: undefined,
      occurredAt: undefined,
      actorId: undefined,
      session,
    });
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
