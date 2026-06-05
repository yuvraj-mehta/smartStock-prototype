import { jest } from '@jest/globals';

const InventoryMovement = {
  exists: jest.fn(),
};

const Batch = {
  find: jest.fn(),
  countDocuments: jest.fn(),
};

const SalesOrder = {
  findOne: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
};

jest.unstable_mockModule('../models/index.js', () => ({
  Batch,
  InventoryMovement,
  SalesOrder,
}));
jest.unstable_mockModule('../middlewares/index.js', () => ({
  WAREHOUSE_ACCESS_DENIED_MESSAGE: 'Access denied for this warehouse.',
  catchAsyncErrors: (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next),
  normalizeId: (id) => (id?._id || id)?.toString(),
  requireAssignedWarehouseId: (req) => req.user?.assignedWarehouseId,
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

let salesOrderController;

describe('legacy sales-order mutation guardrails', () => {
  beforeAll(async () => {
    salesOrderController = await import('../controllers/salesOrder.controller.js');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Batch.find.mockReturnValue({
      distinct: jest.fn().mockResolvedValue(['batch-1']),
    });
    SalesOrder.findOne.mockResolvedValue({
      _id: 'sales-order-doc-1',
      fulfilledItems: [{ batchId: 'batch-1' }],
    });
  });

  it('blocks direct legacy sales-order edits after inventory has dispatched', async () => {
    InventoryMovement.exists.mockResolvedValue(true);

    const res = await invokeJsonController(salesOrderController.updateSalesOrder, {
      params: { id: 'sales-order-1' },
      body: { quantity: 3 },
      user: { assignedWarehouseId: 'warehouse-1' },
    });

    expect(Batch.find).toHaveBeenCalledWith({ warehouseId: 'warehouse-1' });
    expect(SalesOrder.findOne).toHaveBeenCalledWith({
      _id: 'sales-order-1',
      'fulfilledItems.batchId': { $in: ['batch-1'] },
    });
    expect(InventoryMovement.exists).toHaveBeenCalledWith({
      referenceType: 'SalesOrder',
      referenceId: 'sales-order-1',
      movementType: 'dispatch',
    });
    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({
      message: 'Sales orders with dispatched inventory can only update paymentStatus or salesInvoiceId.',
    });
    expect(SalesOrder.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('still allows payment linkage updates on legacy sales orders after dispatch', async () => {
    InventoryMovement.exists.mockResolvedValue(true);
    SalesOrder.findByIdAndUpdate.mockResolvedValue({
      _id: 'sales-order-1',
      paymentStatus: 'paid',
      salesInvoiceId: 'sales-invoice-1',
    });

    const res = await invokeJsonController(salesOrderController.updateSalesOrder, {
      params: { id: 'sales-order-1' },
      body: {
        paymentStatus: 'paid',
        salesInvoiceId: 'sales-invoice-1',
      },
      user: { assignedWarehouseId: 'warehouse-1' },
    });

    expect(res.statusCode).toBe(200);
    expect(SalesOrder.findByIdAndUpdate).toHaveBeenCalledWith(
      'sales-order-doc-1',
      {
        paymentStatus: 'paid',
        salesInvoiceId: 'sales-invoice-1',
      },
      {
        new: true,
        runValidators: true,
        context: 'query',
      },
    );
  });

  it('blocks direct legacy sales-order deletion after inventory has dispatched', async () => {
    InventoryMovement.exists.mockResolvedValue(true);

    const res = await invokeJsonController(salesOrderController.deleteSalesOrder, {
      params: { id: 'sales-order-1' },
      user: { assignedWarehouseId: 'warehouse-1' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.payload).toEqual({
      message: 'Sales orders with dispatched inventory cannot be deleted. Create an explicit reversal flow instead.',
    });
    expect(SalesOrder.findByIdAndDelete).not.toHaveBeenCalled();
  });
});
