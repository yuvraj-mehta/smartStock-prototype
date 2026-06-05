import mongoose from 'mongoose';
import {
  Batch,
  ExternalUser,
  Inventory,
  Item,
  Payment,
  PaymentReceived,
  PurchaseOrder,
  Invoice,
  SalesInvoice,
  SalesOrder,
} from '../models/index.js';
import { catchAsyncErrors } from '../middlewares/index.js';

const getWarehouseScope = (req) => {
  if (!req.user) {
    return { isScoped: false, warehouseId: null };
  }

  const assignedWarehouseId = req.user.assignedWarehouseId;
  if (!assignedWarehouseId || !mongoose.Types.ObjectId.isValid(assignedWarehouseId)) {
    return { isScoped: true, warehouseId: null };
  }

  return {
    isScoped: true,
    warehouseId: new mongoose.Types.ObjectId(assignedWarehouseId),
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

const getScopedPurchaseOrderFilter = async (warehouseId) => {
  const supplierIds = await ExternalUser.find({ warehouseId }).distinct('_id');
  const purchaseOrderIds = await Batch.find({ warehouseId, purchaseOrderId: { $exists: true, $ne: null } })
    .distinct('purchaseOrderId');

  return {
    $or: [
      { supplierId: { $in: supplierIds } },
      { _id: { $in: purchaseOrderIds } },
    ],
  };
};

const hasScopedSalesOrderInventory = async (order, warehouseId) => {
  if (!order?.productId) {
    return false;
  }

  return Boolean(await Item.exists({
    productId: order.productId,
    status: 'dispatched',
    currentWarehouseId: warehouseId,
    updatedAt: { $gte: order.createdAt },
  }));
};

// Get outstanding payables (supplier balances)
export const getOutstandingPayables = catchAsyncErrors(async (req, res) => {
  const { isScoped, warehouseId } = getWarehouseScope(req);
  if (isScoped && !warehouseId) {
    return res.json({ totalPayables: 0 });
  }

  const filter = isScoped ? await getScopedPurchaseOrderFilter(warehouseId) : {};
  const purchaseOrders = await PurchaseOrder.find(filter);
  let totalPayables = 0;

  for (const po of purchaseOrders) {
    const invoice = po.invoiceId
      ? await Invoice.findById(po.invoiceId)
      : await Invoice.findOne({ purchaseOrderId: po._id });

    if (invoice) {
      const paidAmount = await sumCompletedPayments(Payment, 'invoiceId', invoice._id);
      totalPayables += Math.max((invoice.amount || 0) - paidAmount, 0);
    } else if (po.paymentStatus !== 'paid') {
      totalPayables += po.totalCost || 0;
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

  const match = {};
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
    if (!order.productId || quantity <= 0) {
      if (!isScoped) {
        totalRevenue += order.totalPrice || 0;
      }
      continue;
    }

    const itemFilter = {
      productId: order.productId,
      status: 'dispatched',
      updatedAt: { $gte: order.createdAt },
    };

    if (isScoped) {
      itemFilter.currentWarehouseId = warehouseId;
    }

    const items = await Item.find(itemFilter).limit(quantity);
    if (isScoped && items.length === 0) {
      continue;
    }

    let cogs = 0;
    for (const item of items) {
      cogs += item.purchasePrice || 0;
    }

    totalCOGS += cogs;
    totalRevenue += order.totalPrice || 0;
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

  const pipeline = [];
  if (isScoped) {
    pipeline.push({ $match: { warehouseId } });
  }

  pipeline.push(
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
          warehouseId: '$warehouseId',
          productId: '$batch.productId',
        },
        totalInventoryValue: { $sum: { $ifNull: ['$inventoryValue', 0] } },
        totalQuantity: { $sum: { $ifNull: ['$quantity', 0] } },
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
  );

  const result = await Inventory.aggregate(pipeline);
  res.json(result);
});
