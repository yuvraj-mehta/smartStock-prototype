import {
  InventoryMovement,
  Item,
  Package,
  Payment,
  PaymentReceived,
  PurchaseOrder,
  Invoice,
  SalesInvoice,
  SalesOrder,
} from '../models/index.js';
import { catchAsyncErrors, getAssignedWarehouseObjectId } from '../middlewares/index.js';

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

const getScopedPurchaseOrderFilter = (warehouseId) => ({ warehouseId });

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

  const match = { status: 'fulfilled' };
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const salesOrders = await SalesOrder.find(match);
  let totalCOGS = 0;
  let totalRevenue = 0;

  for (const order of salesOrders) {
    const quantity = Number(order.quantity) || 0;
    if (!order.productId || quantity <= 0) continue;

    const movementFilter = {
      referenceType: 'SalesOrder',
      referenceId: order._id,
      movementType: 'dispatch',
    };

    if (isScoped) {
      movementFilter.warehouseId = warehouseId;
    }

    const movements = await InventoryMovement.find(movementFilter).select('itemId').limit(quantity);
    if (movements.length === 0) continue;

    const itemIds = movements.map((movement) => movement.itemId).filter(Boolean);
    const items = await Item.find({ _id: { $in: itemIds } }).populate('batchId', 'unitCost');
    let cogs = 0;
    for (const item of items) {
      cogs += typeof item.purchasePrice === 'number'
        ? item.purchasePrice
        : item.batchId?.unitCost || 0;
    }

    totalCOGS += cogs;
    totalRevenue += (Number(order.totalPrice) || 0) * (movements.length / quantity);
  }

  const deliveryMovementFilter = {
    referenceType: 'Package',
    movementType: 'delivery',
  };
  if (startDate || endDate) {
    deliveryMovementFilter.createdAt = {};
    if (startDate) deliveryMovementFilter.createdAt.$gte = new Date(startDate);
    if (endDate) deliveryMovementFilter.createdAt.$lte = new Date(endDate);
  }
  if (isScoped) {
    deliveryMovementFilter.warehouseId = warehouseId;
  }

  const deliveryMovements = await InventoryMovement.find(deliveryMovementFilter).select('itemId referenceId');
  const packageMovementMap = new Map();
  for (const movement of deliveryMovements) {
    if (!movement.referenceId || !movement.itemId) continue;
    const packageId = movement.referenceId.toString();
    if (!packageMovementMap.has(packageId)) packageMovementMap.set(packageId, []);
    packageMovementMap.get(packageId).push(movement.itemId);
  }

  if (packageMovementMap.size > 0) {
    const packages = await Package.find({
      _id: { $in: [...packageMovementMap.keys()] },
      packageStatus: 'delivered',
    }).select('allocatedItems totalValue');

    for (const packageDoc of packages) {
      const movementItemIds = packageMovementMap.get(packageDoc._id.toString()) || [];
      const items = await Item.find({ _id: { $in: movementItemIds } }).populate('batchId', 'unitCost');
      const packageItemCount = (packageDoc.allocatedItems || []).reduce((sum, alloc) => (
        sum + (Array.isArray(alloc.itemIds) && alloc.itemIds.length > 0 ? alloc.itemIds.length : Number(alloc.quantity) || 0)
      ), 0);

      let cogs = 0;
      for (const item of items) {
        cogs += typeof item.purchasePrice === 'number'
          ? item.purchasePrice
          : item.batchId?.unitCost || 0;
      }

      totalCOGS += cogs;
      if (packageItemCount > 0) {
        totalRevenue += (Number(packageDoc.totalValue) || 0) * (movementItemIds.length / packageItemCount);
      }
    }
  }

  const profit = totalRevenue - totalCOGS;
  res.json({ totalCOGS, totalRevenue, profit });
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
