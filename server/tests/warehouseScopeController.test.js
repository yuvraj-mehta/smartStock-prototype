import { jest } from '@jest/globals';

const Batch = {
  countDocuments: jest.fn(),
  find: jest.fn(),
};
const Inventory = {
  findOne: jest.fn(),
};
const InventoryMovement = {
  exists: jest.fn(),
  find: jest.fn(),
};
const Item = {
  find: jest.fn(),
};
const Order = {
  find: jest.fn(),
};
const Package = {
  find: jest.fn(),
};
const Payment = {
  aggregate: jest.fn(),
  find: jest.fn(),
};
const PaymentReceived = {
  aggregate: jest.fn(),
};
const PurchaseOrder = {
  find: jest.fn(),
  findById: jest.fn(),
};
const Invoice = {
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
};
const Return = {
  find: jest.fn(),
};
const SalesHistory = {
  find: jest.fn(),
};
const DirectSalesHistory = {
  find: jest.fn(),
  findOne: jest.fn(),
};
const SalesInvoice = {
  find: jest.fn(),
};
const SalesOrder = {
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findOne: jest.fn(),
};

jest.unstable_mockModule('../models/index.js', () => ({
  Batch,
  Inventory,
  InventoryMovement,
  Item,
  Order,
  Package,
  Payment,
  PaymentReceived,
  PurchaseOrder,
  Invoice,
  Return,
  SalesHistory,
  SalesInvoice,
  SalesOrder,
}));
jest.unstable_mockModule('../models/sales.history.model.js', () => ({
  SalesHistory: DirectSalesHistory,
}));
jest.unstable_mockModule('../utils/auditLogger.js', () => ({
  logAudit: jest.fn(),
}));
jest.unstable_mockModule('../services/procurement/procurement.service.js', () => ({
  assertCanInvoicePurchaseOrder: jest.fn(),
  assertInvoiceCanBeAssignedToPurchaseOrder: jest.fn(),
  assertInvoiceAmountCoversCompletedPayments: jest.fn(),
  assertPaymentDoesNotOverpay: jest.fn(),
  assertValidProcurementRelationship: jest.fn(),
  clearPurchaseOrderInvoice: jest.fn(),
  createProcurementError: (statusCode, message) => Object.assign(new Error(message), { statusCode }),
  syncInvoiceStatus: jest.fn(),
  validatePurchaseOrderAmounts: jest.fn(({ quantity, receivedQuantity = 0, unitCost, totalCost }) => ({
    quantity: Number(quantity),
    receivedQuantity: Number(receivedQuantity),
    unitCost: Number(unitCost),
    totalCost: Number(totalCost),
  })),
  withSession: (options, session) => ({ ...options, session }),
}));

const buildQuery = (result) => {
  const query = {
    limit: jest.fn(() => query),
    populate: jest.fn(() => query),
    select: jest.fn(() => query),
    session: jest.fn(() => query),
    skip: jest.fn(() => query),
    sort: jest.fn(() => query),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };

  return query;
};

const buildDistinctQuery = (result) => ({
  distinct: jest.fn().mockResolvedValue(result),
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
      query: {},
      user: {
        _id: '507f1f77bcf86cd799439001',
        assignedWarehouseId: '507f1f77bcf86cd799439012',
      },
      ...req,
    }, res, reject);
  });

const purchaseOrderController = await import('../controllers/purchaseOrder.controller.js');
const invoiceController = await import('../controllers/invoice.controller.js');
const paymentController = await import('../controllers/payment.controller.js');
const salesController = await import('../controllers/sales.controller.js');
const salesOrderController = await import('../controllers/salesOrder.controller.js');
const inventoryAnalyticsController = await import('../controllers/inventoryAnalytics.controller.js');
const financialReportController = await import('../controllers/financialReport.controller.js');

describe('warehouse scope controller enforcement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters purchase-order reads to the authenticated warehouse', async () => {
    PurchaseOrder.find.mockReturnValue(buildQuery([{ _id: 'po-1' }]));

    await invokeJsonController(purchaseOrderController.getAllPurchaseOrders);

    expect(PurchaseOrder.find).toHaveBeenCalledWith({
      warehouseId: '507f1f77bcf86cd799439012',
    });
  });

  it('denies purchase-order creation for another warehouse before procurement writes run', async () => {
    const res = await invokeJsonController(purchaseOrderController.createPurchaseOrder, {
      body: {
        supplierId: '507f1f77bcf86cd799439021',
        productId: '507f1f77bcf86cd799439022',
        warehouseId: '507f1f77bcf86cd799439099',
        quantity: 2,
        unitCost: 10,
        totalCost: 20,
      },
    });

    expect(res.statusCode).toBe(403);
    expect(res.payload.message).toMatch(/access denied/i);
  });

  it('filters supplier invoices through purchase orders in the authenticated warehouse', async () => {
    PurchaseOrder.find.mockReturnValue(buildDistinctQuery(['507f1f77bcf86cd799439061']));
    Invoice.find.mockReturnValue(buildQuery([]));

    await invokeJsonController(invoiceController.getAllInvoices);

    expect(PurchaseOrder.find).toHaveBeenCalledWith({
      warehouseId: '507f1f77bcf86cd799439012',
    });
    expect(Invoice.find).toHaveBeenCalledWith({
      purchaseOrderId: { $in: ['507f1f77bcf86cd799439061'] },
    });
  });

  it('filters supplier payments through scoped purchase-order invoices', async () => {
    PurchaseOrder.find.mockReturnValue(buildDistinctQuery(['507f1f77bcf86cd799439061']));
    Invoice.find.mockReturnValue(buildDistinctQuery(['507f1f77bcf86cd799439071']));
    Payment.find.mockReturnValue(buildQuery([]));

    await invokeJsonController(paymentController.getAllPayments);

    expect(PurchaseOrder.find).toHaveBeenCalledWith({
      warehouseId: '507f1f77bcf86cd799439012',
    });
    expect(Invoice.find).toHaveBeenCalledWith({
      purchaseOrderId: { $in: ['507f1f77bcf86cd799439061'] },
    });
    expect(Payment.find).toHaveBeenCalledWith({
      invoiceId: { $in: ['507f1f77bcf86cd799439071'] },
    });
  });

  it('filters sales-history reads to the authenticated warehouse', async () => {
    DirectSalesHistory.find.mockReturnValue(buildQuery([]));

    await invokeJsonController(salesController.getAllSales);

    expect(DirectSalesHistory.find).toHaveBeenCalledWith({
      warehouseId: '507f1f77bcf86cd799439012',
    });
  });

  it('looks up sales-history records by id inside the authenticated warehouse', async () => {
    DirectSalesHistory.findOne.mockReturnValue(buildQuery(null));

    const res = await invokeJsonController(salesController.getSaleById, {
      params: { id: '507f1f77bcf86cd799439031' },
    });

    expect(DirectSalesHistory.findOne).toHaveBeenCalledWith({
      _id: '507f1f77bcf86cd799439031',
      warehouseId: '507f1f77bcf86cd799439012',
    });
    expect(res.statusCode).toBe(404);
  });

  it('filters legacy sales-order reads by batches in the authenticated warehouse', async () => {
    Batch.find.mockReturnValue(buildDistinctQuery(['507f1f77bcf86cd799439041']));
    SalesOrder.find.mockReturnValue(buildQuery([]));

    await invokeJsonController(salesOrderController.getAllSalesOrders);

    expect(Batch.find).toHaveBeenCalledWith({
      warehouseId: '507f1f77bcf86cd799439012',
    });
    expect(SalesOrder.find).toHaveBeenCalledWith({
      'fulfilledItems.batchId': { $in: ['507f1f77bcf86cd799439041'] },
    });
  });

  it('filters all-product prediction data and linked history to the authenticated warehouse', async () => {
    const productId = '507f1f77bcf86cd799439051';
    Item.find
      .mockReturnValueOnce(buildQuery([
        {
          productId: {
            _id: { toString: () => productId },
            productName: 'Widget',
            sku: 'W-1',
            productCategory: 'Tools',
            price: 12,
          },
          currentWarehouseId: '507f1f77bcf86cd799439012',
        },
      ]))
      .mockResolvedValueOnce([]);
    SalesHistory.find.mockResolvedValue([]);
    Return.find.mockResolvedValue([]);

    const res = await invokeJsonController(inventoryAnalyticsController.getAllProductsPredictionData);

    expect(Item.find).toHaveBeenCalledTimes(2);
    expect(Item.find.mock.calls[0][0].currentWarehouseId.toString()).toBe('507f1f77bcf86cd799439012');
    expect(Item.find.mock.calls[1][0].currentWarehouseId.toString()).toBe('507f1f77bcf86cd799439012');
    expect(SalesHistory.find.mock.calls[0][0].warehouseId.toString()).toBe('507f1f77bcf86cd799439012');
    expect(Return.find.mock.calls[0][0].warehouseId.toString()).toBe('507f1f77bcf86cd799439012');
    expect(res.payload.products).toHaveLength(1);
  });

  it('scopes outstanding payable reports directly by purchase-order warehouse', async () => {
    PurchaseOrder.find.mockResolvedValue([]);

    const res = await invokeJsonController(financialReportController.getOutstandingPayables);

    expect(PurchaseOrder.find.mock.calls[0][0].warehouseId.toString()).toBe('507f1f77bcf86cd799439012');
    expect(res.payload).toEqual({ totalPayables: 0 });
  });
});
