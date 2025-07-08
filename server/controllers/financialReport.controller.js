// Get outstanding payables (supplier balances)
export const getOutstandingPayables = catchAsyncErrors(async (req, res) => {
  // Sum unpaid/partial purchase orders
  const pos = await PurchaseOrder.find({ paymentStatus: { $in: ['unpaid', 'partial'] } });
  let totalPayables = 0;
  for (const po of pos) {
    totalPayables += po.totalCost || 0;
  }
  res.json({ totalPayables });
});

// Get outstanding receivables (customer balances)
export const getOutstandingReceivables = catchAsyncErrors(async (req, res) => {
  // Sum unpaid/partial sales invoices
  const salesInvoices = await mongoose.model('SalesInvoice').find({ status: { $in: ['unpaid', 'partial'] } });
  let totalReceivables = 0;
  for (const inv of salesInvoices) {
    totalReceivables += inv.amount || 0;
  }
  res.json({ totalReceivables });
});

// Get value of damaged/lost inventory
export const getDamagedLostValue = catchAsyncErrors(async (req, res) => {
  // Sum purchasePrice of all items with status 'damaged'
  const items = await Item.find({ status: 'damaged' });
  let totalDamagedValue = 0;
  for (const item of items) {
    totalDamagedValue += item.purchasePrice || 0;
  }
  res.json({ totalDamagedValue });
});
// Get COGS and Profit/Loss over a period
export const getCOGSAndProfit = catchAsyncErrors(async (req, res) => {
  // Accept optional date range
  const { startDate, endDate } = req.query;
  const match = {};
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }
  // Find sales orders in range
  const salesOrders = await mongoose.model('SalesOrder').find(match);
  let totalCOGS = 0;
  let totalRevenue = 0;
  for (const order of salesOrders) {
    // Find dispatched items for this order
    const items = await mongoose.model('Item').find({ productId: order.productId, status: 'dispatched', updatedAt: { $gte: order.createdAt } }).limit(order.quantity);
    let cogs = 0;
    for (const item of items) {
      cogs += item.purchasePrice || 0;
    }
    totalCOGS += cogs;
    totalRevenue += order.totalPrice;
  }
  const profit = totalRevenue - totalCOGS;
  res.json({ totalCOGS, totalRevenue, profit });
});
import { Inventory, Batch, Item, PurchaseOrder, Invoice, Payment } from '../models/index.js';
import { catchAsyncErrors } from '../middlewares/index.js';
import mongoose from 'mongoose';

// Get inventory value by warehouse and product
export const getInventoryValue = catchAsyncErrors(async (req, res) => {
  // Aggregate inventory value by warehouse and product
  const result = await Inventory.aggregate([
    {
      $lookup: {
        from: 'batches',
        localField: 'batchId',
        foreignField: '_id',
        as: 'batch'
      }
    },
    { $unwind: '$batch' },
    {
      $group: {
        _id: {
          warehouseId: '$warehouseId',
          productId: '$batch.productId'
        },
        totalInventoryValue: { $sum: '$inventoryValue' },
        totalQuantity: { $sum: '$quantity' }
      }
    },
    {
      $project: {
        warehouseId: '$_id.warehouseId',
        productId: '$_id.productId',
        totalInventoryValue: 1,
        totalQuantity: 1,
        _id: 0
      }
    }
  ]);
  res.json(result);
});
