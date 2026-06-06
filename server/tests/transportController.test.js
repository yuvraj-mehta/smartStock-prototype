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

const Batch = {
  find: jest.fn(),
};

const Package = {
  findById: jest.fn(),
};

const Transport = {
  findById: jest.fn(),
};

const transitionItemsStatus = jest.fn();

jest.unstable_mockModule('mongoose', () => ({ default: mongooseMock }));
jest.unstable_mockModule('../models/index.js', () => ({
  Batch,
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
  transitionItemsStatus,
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

const buildSessionQuery = (value) => ({
  session: jest.fn().mockResolvedValue(value),
});

const buildPackageQuery = (value) => ({
  populate: jest.fn().mockReturnThis(),
  session: jest.fn().mockResolvedValue(value),
});

const buildBatchQuery = (value) => {
  const selectedQuery = buildSessionQuery(value);
  return {
    select: jest.fn().mockReturnValue(selectedQuery),
    selectedQuery,
  };
};

const buildTransport = (overrides = {}) => ({
  _id: 'transport-1',
  packageId: 'package-1',
  transporterId: 'transporter-1',
  transportType: 'forward',
  status: 'in_transit',
  statusHistory: [],
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const buildPackage = (overrides = {}) => ({
  _id: 'package-1',
  packageId: 'PKG-1',
  packageStatus: 'dispatched',
  allocatedItems: [
    {
      batchId: 'batch-1',
      itemIds: ['item-1', 'item-2'],
    },
  ],
  orderId: {
    _id: 'order-1',
    orderStatus: 'dispatched',
    save: jest.fn().mockResolvedValue(undefined),
  },
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

let transportController;

describe('transport controller delivery ownership contracts', () => {
  beforeAll(async () => {
    transportController = await import('../controllers/transport.controller.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mongooseMock.startSession.mockResolvedValue(session);
    transitionItemsStatus.mockResolvedValue({ modifiedCount: 2 });
    Batch.find.mockReturnValue(buildBatchQuery([
      { _id: { toString: () => 'batch-1' }, warehouseId: 'warehouse-1' },
    ]));
  });

  it('delivers forward transports by updating package, order, and item delivery movement', async () => {
    const transport = buildTransport();
    const packageDoc = buildPackage();
    Transport.findById.mockReturnValue(buildSessionQuery(transport));
    Package.findById.mockReturnValue(buildPackageQuery(packageDoc));

    const res = await invokeJsonController(transportController.updateTransportStatus, {
      params: { transportId: 'transport-1' },
      body: { status: 'delivered', notes: 'Left with customer' },
      user: {
        _id: 'staff-1',
        role: 'staff',
        assignedWarehouseId: 'warehouse-1',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(transport.status).toBe('delivered');
    expect(transport.deliveredAt).toBeInstanceOf(Date);
    expect(transport.statusHistory).toEqual([
      expect.objectContaining({
        status: 'delivered',
        notes: 'Left with customer',
        updatedBy: 'staff-1',
      }),
    ]);
    expect(packageDoc.packageStatus).toBe('delivered');
    expect(packageDoc.orderId.orderStatus).toBe('delivered');
    expect(transitionItemsStatus).toHaveBeenCalledWith(expect.objectContaining({
      itemIds: ['item-1', 'item-2'],
      fromStatus: 'dispatched',
      toStatus: 'delivered',
      actorId: 'staff-1',
      warehouseId: 'warehouse-1',
      location: 'Customer',
      referenceType: 'Package',
      referenceId: 'package-1',
      movementType: 'delivery',
      session,
    }));
    expect(packageDoc.save).toHaveBeenCalledWith({ session });
    expect(packageDoc.orderId.save).toHaveBeenCalledWith({ session });
    expect(session.commitTransaction).toHaveBeenCalled();
    expect(session.abortTransaction).not.toHaveBeenCalled();
  });

  it('lets the assigned transporter update their own transport status', async () => {
    const transport = buildTransport({
      status: 'dispatched',
      transporterId: 'transporter-1',
    });
    const packageDoc = buildPackage();
    Transport.findById.mockReturnValue(buildSessionQuery(transport));
    Package.findById.mockReturnValue(buildPackageQuery(packageDoc));

    const res = await invokeJsonController(transportController.updateTransportStatus, {
      params: { transportId: 'transport-1' },
      body: { status: 'in_transit', notes: 'Loaded for delivery' },
      user: {
        _id: 'transporter-1',
        role: 'transporter',
        assignedWarehouseId: 'warehouse-1',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(transport.status).toBe('in_transit');
    expect(transport.statusHistory).toEqual([
      expect.objectContaining({
        status: 'in_transit',
        notes: 'Loaded for delivery',
        updatedBy: 'transporter-1',
      }),
    ]);
    expect(packageDoc.packageStatus).toBe('in_transit');
    expect(packageDoc.orderId.orderStatus).toBe('dispatched');
    expect(transport.save).toHaveBeenCalledWith({ session });
    expect(session.commitTransaction).toHaveBeenCalled();
    expect(session.abortTransaction).not.toHaveBeenCalled();
  });

  it('blocks transporters from updating transports assigned to someone else', async () => {
    const transport = buildTransport({
      status: 'dispatched',
      transporterId: 'transporter-2',
    });
    Transport.findById.mockReturnValue(buildSessionQuery(transport));

    const res = await invokeJsonController(transportController.updateTransportStatus, {
      params: { transportId: 'transport-1' },
      body: { status: 'in_transit', notes: 'Attempted pickup' },
      user: {
        _id: 'transporter-1',
        role: 'transporter',
        assignedWarehouseId: 'warehouse-1',
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.payload.message).toBe('Not authorized to update this transport');
    expect(Package.findById).not.toHaveBeenCalled();
    expect(transport.save).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalled();
    expect(session.commitTransaction).not.toHaveBeenCalled();
  });

  it('rejects reverse transport status updates because returns own that lifecycle', async () => {
    const transport = buildTransport({ transportType: 'reverse' });
    Transport.findById.mockReturnValue(buildSessionQuery(transport));

    const res = await invokeJsonController(transportController.updateTransportStatus, {
      params: { transportId: 'transport-1' },
      body: { status: 'delivered' },
      user: {
        _id: 'staff-1',
        role: 'staff',
        assignedWarehouseId: 'warehouse-1',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toBe('Reverse transports must be updated through the return lifecycle.');
    expect(transport.status).toBe('in_transit');
    expect(Package.findById).not.toHaveBeenCalled();
    expect(transport.save).not.toHaveBeenCalled();
    expect(transitionItemsStatus).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalled();
    expect(session.commitTransaction).not.toHaveBeenCalled();
  });

  it('rejects direct delivered jumps before package delivery side effects can run', async () => {
    const transport = buildTransport({ status: 'dispatched' });
    Transport.findById.mockReturnValue(buildSessionQuery(transport));

    const res = await invokeJsonController(transportController.updateTransportStatus, {
      params: { transportId: 'transport-1' },
      body: { status: 'delivered' },
      user: {
        _id: 'staff-1',
        role: 'staff',
        assignedWarehouseId: 'warehouse-1',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.payload.message).toBe('Invalid transport status transition from dispatched to delivered.');
    expect(Package.findById).not.toHaveBeenCalled();
    expect(transitionItemsStatus).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalled();
    expect(session.commitTransaction).not.toHaveBeenCalled();
  });

  it('rejects status updates when the transport package is missing', async () => {
    const transport = buildTransport({ status: 'dispatched' });
    Transport.findById.mockReturnValue(buildSessionQuery(transport));
    Package.findById.mockReturnValue(buildPackageQuery(null));

    const res = await invokeJsonController(transportController.updateTransportStatus, {
      params: { transportId: 'transport-1' },
      body: { status: 'in_transit' },
      user: {
        _id: 'staff-1',
        role: 'staff',
        assignedWarehouseId: 'warehouse-1',
      },
    });

    expect(res.statusCode).toBe(404);
    expect(res.payload.message).toBe('Package not found for this transport.');
    expect(transport.save).not.toHaveBeenCalled();
    expect(transitionItemsStatus).not.toHaveBeenCalled();
    expect(session.abortTransaction).toHaveBeenCalled();
    expect(session.commitTransaction).not.toHaveBeenCalled();
  });

  it('rejects delivery when not every package item transitions to delivered', async () => {
    const transport = buildTransport();
    const packageDoc = buildPackage();
    Transport.findById.mockReturnValue(buildSessionQuery(transport));
    Package.findById.mockReturnValue(buildPackageQuery(packageDoc));
    transitionItemsStatus.mockResolvedValue({ modifiedCount: 1 });

    const res = await invokeJsonController(transportController.updateTransportStatus, {
      params: { transportId: 'transport-1' },
      body: { status: 'delivered' },
      user: {
        _id: 'staff-1',
        role: 'staff',
        assignedWarehouseId: 'warehouse-1',
      },
    });

    expect(res.statusCode).toBe(409);
    expect(res.payload.message).toBe('Package items changed while moving from dispatched to delivered.');
    expect(session.abortTransaction).toHaveBeenCalled();
    expect(session.commitTransaction).not.toHaveBeenCalled();
  });
});
