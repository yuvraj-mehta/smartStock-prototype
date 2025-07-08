import { Item, Inventory, Batch, Order, SalesHistory } from '../models/index.js';
import { catchAsyncErrors } from '../middlewares/index.js';

// Get all inventory actions (movements, status changes, allocations, dispatches, returns, etc.)
export const getInventoryActions = catchAsyncErrors(async (req, res) => {
  // Optional filters: productId, batchId, warehouseId, action, date range
  const { productId, batchId, warehouseId, action, startDate, endDate, limit = 100, skip = 0 } = req.query;
  const filter = {};

  if (productId) filter.productId = productId;
  if (batchId) filter.batchId = batchId;
  if (warehouseId) filter.currentWarehouseId = warehouseId;

  // Build match for item history subdocuments
  const historyMatch = {};
  if (action) historyMatch['history.action'] = action;
  if (startDate || endDate) {
    historyMatch['history.date'] = {};
    if (startDate) historyMatch['history.date'].$gte = new Date(startDate);
    if (endDate) historyMatch['history.date'].$lte = new Date(endDate);
  }

  // Aggregate all item history actions
  const pipeline = [
    { $match: filter },
    { $unwind: '$history' },
    { $match: Object.keys(historyMatch).length ? historyMatch : {} },
    {
      $project: {
        _id: 1,
        productId: 1,
        batchId: 1,
        serialNumber: 1,
        currentWarehouseId: 1,
        status: 1,
        action: '$history.action',
        date: '$history.date',
        location: '$history.location',
        notes: '$history.notes',
      }
    },
    { $sort: { date: -1 } },
    { $skip: Number(skip) },
    { $limit: Number(limit) }
  ];

  const actions = await Item.aggregate(pipeline);
  res.json({ actions });
});

// Get summary analytics for inventory actions (for ML/forecasting)
export const getInventoryActionSummary = catchAsyncErrors(async (req, res) => {
  // Example: count of each action type per product per month
  const { productId, startDate, endDate } = req.query;
  const match = {};
  if (productId) match.productId = productId;
  if (startDate || endDate) {
    match['history.date'] = {};
    if (startDate) match['history.date'].$gte = new Date(startDate);
    if (endDate) match['history.date'].$lte = new Date(endDate);
  }

  const summary = await Item.aggregate([
    { $match: match },
    { $unwind: '$history' },
    { $group: {
      _id: {
        productId: '$productId',
        action: '$history.action',
        month: { $month: '$history.date' },
        year: { $year: '$history.date' }
      },
      count: { $sum: 1 }
    }},
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.action': 1 } }
  ]);

  res.json({ summary });
});

// You can add more endpoints for advanced analytics as needed
