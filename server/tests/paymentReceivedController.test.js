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
  this.save = paymentInstance.save;
});
PaymentReceived.aggregate = jest.fn();
PaymentReceived.findById = jest.fn();
PaymentReceived.findByIdAndUpdate = jest.fn();

const SalesInvoice = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
};

const SalesOrder = {
  findByIdAndUpdate: jest.fn(),
};

jest.unstable_mockModule('mongoose', () => ({ default: mongooseMock }));
jest.unstable_mockModule('../models/index.js', () => ({
  PaymentReceived,
  SalesInvoice,
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

    controller({ body: {}, params: {}, ...req }, res, reject);
  });

const buildQuery = (value) => ({
  session: jest.fn().mockResolvedValue(value),
});

const buildAggregate = (value) => ({
  session: jest.fn().mockResolvedValue(value),
});

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
  });
});
