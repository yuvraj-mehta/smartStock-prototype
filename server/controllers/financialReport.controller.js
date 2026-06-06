import {
  InventoryMovement,
  Item,
  FinancialEvent,
  Payment,
  PaymentReceived,
  PurchaseOrder,
  Invoice,
  SalesInvoice,
  SalesOrder,
} from '../models/index.js';
import { catchAsyncErrors, getAssignedWarehouseObjectId } from '../middlewares/index.js';
import { getProfitAndLossFromJournal } from '../services/finance/index.js';

const getWarehouseScope = (req) => {
  if (!req.user) {
    return { isScoped: false, warehouseId: null };
  }

  const warehouseId = getAssignedWarehouseObjectId(req);
  if (!warehouseId) {
    return { isScoped: true, warehouseId: null };
  }

  return {
    isScoped: true,
    warehouseId,
  };
};

const sumCompletedPayments = async (Model, relationField, relationId) => {
  if (!relationId) {
    return 0;
  }

  const [summary] = await Model.aggregate([
    { $match: { [relationField]: relationId, status: 'completed' } },
    { $group: { _id: `$${relationField}`, totalPaid: { $sum: { $ifNull: ['$amount', 0] } } } },
  ]);

  return summary?.totalPaid || 0;
};

const addAmountById = (amountsById, id, amount) => {
  const key = normalizeId(id);
  if (!key) return false;

  const current = amountsById.get(key) || { id, amount: 0 };
  amountsById.set(key, {
    id: current.id || id,
    amount: current.amount + (Number(amount) || 0),
  });
  return true;
};

const getScopedPurchaseOrderFilter = (warehouseId) => ({ warehouseId });

const normalizeId = (id) => (id?._id || id)?.toString();

const hasScopedSalesOrderInventory = async (order, warehouseId) => {
  if (!order?._id) {
    return false;
  }

  return Boolean(await InventoryMovement.exists({
    referenceType: 'SalesOrder',
    referenceId: order._id,
    movementType: 'dispatch',
    warehouseId,
  }));
};

// Get outstanding payables (supplier balances)
export const getOutstandingPayables = catchAsyncErrors(async (req, res) => {
  const { isScoped, warehouseId } = getWarehouseScope(req);
  if (isScoped && !warehouseId) {
    return res.json({ totalPayables: 0 });
  }

  const filter = isScoped ? getScopedPurchaseOrderFilter(warehouseId) : {};
  const purchaseOrders = await PurchaseOrder.find(filter);
  let totalPayables = 0;

  for (const po of purchaseOrders) {
    const invoice = po.invoiceId
      ? await Invoice.findById(po.invoiceId)
      : await Invoice.findOne({ purchaseOrderId: po._id });

    if (invoice) {
      const paidAmount = await sumCompletedPayments(Payment, 'invoiceId', invoice._id);
      totalPayables += Math.max((invoice.amount || 0) - paidAmount, 0);
    } else if (po.status === 'received' && po.paymentStatus !== 'paid') {
      totalPayables += (Number(po.receivedQuantity) || 0) * (Number(po.unitCost) || 0);
    }
  }

  res.json({ totalPayables });
});

// Get outstanding receivables (customer balances)
export const getOutstandingReceivables = catchAsyncErrors(async (req, res) => {
  const { isScoped, warehouseId } = getWarehouseScope(req);
  if (isScoped && !warehouseId) {
    return res.json({ totalReceivables: 0 });
  }

  const salesInvoices = await SalesInvoice.find();
  let totalReceivables = 0;

  for (const invoice of salesInvoices) {
    const order = invoice.salesOrderId ? await SalesOrder.findById(invoice.salesOrderId) : null;

    if (isScoped) {
      const hasScopedInventory = await hasScopedSalesOrderInventory(order, warehouseId);
      if (!hasScopedInventory) {
        continue;
      }
    }

    const paidAmount = await sumCompletedPayments(PaymentReceived, 'salesInvoiceId', invoice._id);
    totalReceivables += Math.max((invoice.amount || 0) - paidAmount, 0);
  }

  const confirmedOrderEventFilter = {
    eventType: 'sales_invoice',
    referenceType: 'Order',
  };
  if (isScoped) {
    confirmedOrderEventFilter.warehouseId = warehouseId;
  }

  const confirmedOrderEvents = await FinancialEvent.find(confirmedOrderEventFilter);
  const orderReceivablesById = new Map();
  for (const event of confirmedOrderEvents) {
    if (!addAmountById(orderReceivablesById, event.referenceId, event.amount)) {
      totalReceivables += Number(event.amount) || 0;
    }
  }

  for (const { id: orderId, amount: orderReceivable } of orderReceivablesById.values()) {
    const paidAmount = await sumCompletedPayments(PaymentReceived, 'orderId', orderId);
    totalReceivables += Math.max(orderReceivable - paidAmount, 0);
  }

  res.json({ totalReceivables });
});

// Get value of damaged/lost inventory
export const getDamagedLostValue = catchAsyncErrors(async (req, res) => {
  const { isScoped, warehouseId } = getWarehouseScope(req);
  if (isScoped && !warehouseId) {
    return res.json({ totalDamagedValue: 0 });
  }

  const filter = { status: 'damaged' };
  if (isScoped) {
    filter.currentWarehouseId = warehouseId;
  }

  const items = await Item.find(filter);
  let totalDamagedValue = 0;

  for (const item of items) {
    totalDamagedValue += item.purchasePrice || 0;
  }

  res.json({ totalDamagedValue });
});

// Get COGS and Profit/Loss over a period
export const getCOGSAndProfit = catchAsyncErrors(async (req, res) => {
  const { startDate, endDate } = req.query;
  const { isScoped, warehouseId } = getWarehouseScope(req);
  if (isScoped && !warehouseId) {
    return res.json({ totalCOGS: 0, totalRevenue: 0, profit: 0 });
  }

  const profitAndLoss = await getProfitAndLossFromJournal({
    startDate,
    endDate,
    warehouseId: isScoped ? warehouseId : undefined,
  });

  res.json({
    totalCOGS: profitAndLoss.cogs,
    totalRevenue: profitAndLoss.revenue,
    profit: profitAndLoss.grossProfit,
  });
});

// Get inventory value by warehouse and product
export const getInventoryValue = catchAsyncErrors(async (req, res) => {
  const { isScoped, warehouseId } = getWarehouseScope(req);
  if (isScoped && !warehouseId) {
    return res.json([]);
  }

  const match = { status: 'in_stock' };
  if (isScoped) {
    match.currentWarehouseId = warehouseId;
  }

  const result = await Item.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'batches',
        localField: 'batchId',
        foreignField: '_id',
        as: 'batch',
      },
    },
    { $unwind: { path: '$batch', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: {
          warehouseId: { $ifNull: ['$currentWarehouseId', '$batch.warehouseId'] },
          productId: '$productId',
        },
        totalInventoryValue: { $sum: { $ifNull: ['$purchasePrice', '$batch.unitCost'] } },
        totalQuantity: { $sum: 1 },
      },
    },
    {
      $project: {
        warehouseId: '$_id.warehouseId',
        productId: '$_id.productId',
        totalInventoryValue: 1,
        totalQuantity: 1,
        _id: 0,
      },
    }
  ]);
  res.json(result);
});
