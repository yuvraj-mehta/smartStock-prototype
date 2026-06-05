import { jest } from '@jest/globals';

const Batch = {
  find: jest.fn(),
};
const ExternalUser = {
  findById: jest.fn(),
};
const Package = {
  findById: jest.fn(),
};
const Transport = {
  findOne: jest.fn(),
};

jest.unstable_mockModule('../models/index.js', () => ({
  Batch,
  ExternalUser,
  Package,
  Transport,
}));
jest.unstable_mockModule('../services/inventory/index.js', () => ({
  normalizeId: (id) => (id?._id || id)?.toString(),
  runWithOptionalSession: (query, activeSession) => (
    activeSession && typeof query.session === 'function'
      ? query.session(activeSession)
      : query
  ),
  transitionItemsStatus: jest.fn(),
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

let packageController;

describe('package controller status guardrails', () => {
  beforeAll(async () => {
    packageController = await import('../controllers/package.controller.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps package status updates pack-only instead of owning delivery transitions', async () => {
    const res = await invokeJsonController(packageController.updatePackageStatus, {
      params: { packageId: '507f1f77bcf86cd799439031' },
      body: { status: 'delivered', notes: 'Bypass transport' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({
      message: "Only packing to 'ready_for_dispatch' is supported.",
    });
    expect(Package.findById).not.toHaveBeenCalled();
    expect(Transport.findOne).not.toHaveBeenCalled();
  });
});
