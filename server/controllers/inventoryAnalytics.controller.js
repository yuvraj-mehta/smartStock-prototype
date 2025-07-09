import { Item, Inventory, Batch, Order, SalesHistory, Return, SalesOrder, SalesInvoice, PaymentReceived } from '../models/index.js';
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

  // Attach order and return financials for each action (if possible)
  const orderIds = new Set();
  const returnIds = new Set();
  actions.forEach(action => {
    // Try to extract orderId/returnId from notes or other fields if present
    // (Assumes notes like 'Allocated for order <orderNumber>' or similar)
    const orderMatch = action.notes && action.notes.match(/order (ORD-[A-Za-z0-9]+)/i);
    if (orderMatch) orderIds.add(orderMatch[1]);
    const returnMatch = action.notes && action.notes.match(/return (RET-[A-Za-z0-9]+)/i);
    if (returnMatch) returnIds.add(returnMatch[1]);
  });

  // Fetch order and return financials
  const orders = await Order.find({ orderNumber: { $in: Array.from(orderIds) } });
  const returns = await Return.find({ returnNumber: { $in: Array.from(returnIds) } });
  const orderMap = {};
  orders.forEach(o => orderMap[o.orderNumber] = o);
  const returnMap = {};
  returns.forEach(r => returnMap[r.returnNumber] = r);

  // Attach financials
  const actionsWithFinancials = actions.map(action => {
    let orderFinancials = null;
    let returnFinancials = null;
    const orderMatch = action.notes && action.notes.match(/order (ORD-[A-Za-z0-9]+)/i);
    if (orderMatch && orderMap[orderMatch[1]]) {
      const o = orderMap[orderMatch[1]];
      orderFinancials = {
        orderNumber: o.orderNumber,
        platformOrderId: o.platformOrderId,
        items: o.items,
        orderStatus: o.orderStatus,
        notes: o.notes,
        createdBy: o.createdBy,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt
      };
    }
    const returnMatch = action.notes && action.notes.match(/return (RET-[A-Za-z0-9]+)/i);
    if (returnMatch && returnMap[returnMatch[1]]) {
      const r = returnMap[returnMatch[1]];
      returnFinancials = {
        returnNumber: r.returnNumber,
        orderId: r.orderId,
        returnedItems: r.returnedItems,
        returnReason: r.returnReason,
        returnStatus: r.returnStatus,
        returnDate: r.returnDate,
        notes: r.notes,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      };
    }
    return { ...action, orderFinancials, returnFinancials };
  });

  res.json({ actions: actionsWithFinancials });
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
    {
      $group: {
        _id: {
          productId: '$productId',
          action: '$history.action',
          month: { $month: '$history.date' },
          year: { $year: '$history.date' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.action': 1 } }
  ]);

  res.json({ summary });
});

// Predictive analytics data model endpoint
export const getProductPredictionData = catchAsyncErrors(async (req, res) => {
  const { productId } = req.query;
  if (!productId) return res.status(400).json({ message: 'productId is required' });

  // Fetch product
  const product = await Item.findOne({ productId }).populate('productId');
  if (!product) return res.status(404).json({ message: 'Product not found' });

  // Get product info
  const prod = product.productId;
  const productName = prod.productName;
  const sku = prod.sku;
  const category = prod.productCategory;
  const price = prod.price;

  // Inventory info
  const inventory = await Inventory.findOne({ batchId: product.batchId });
  const currentStock = inventory ? inventory.quantity : 0;
  const warehouseLocation = inventory ? inventory.warehouseId : null;

  // Sales info
  const salesHistory = await SalesHistory.find({ 'products.productId': productId }).sort({ saleConfirmationDate: -1 });
  const totalSold = salesHistory.reduce((sum, s) => sum + s.products.filter(p => p.productId.toString() === productId).reduce((a, p) => a + (p.quantity || 0), 0), 0);
  const lastSoldAt = salesHistory.length > 0 ? salesHistory[0].saleConfirmationDate : null;

  // Returns info
  const returns = await Return.find({ 'returnedItems.productId': productId });
  const returnsArr = [];
  returns.forEach(r => {
    r.returnedItems.filter(ri => ri.productId.toString() === productId).forEach(ri => {
      returnsArr.push({
        quantity: ri.quantity,
        date: r.returnDate,
        reason: r.returnReason
      });
    });
  });

  // Damages info (from item history)
  const items = await Item.find({ productId });
  const damagesArr = [];
  items.forEach(item => {
    item.history.filter(h => h.action === 'damaged').forEach(h => {
      damagesArr.push({
        quantity: 1, // Each item is 1
        date: h.date,
        cause: h.notes || ''
      });
    });
  });

  res.json({
    productId,
    productName,
    sku,
    category,
    price,
    inventory: {
      currentStock,
      warehouseLocation
    },
    sales: {
      totalSold,
      lastSoldAt
    },
    returns: returnsArr,
    damages: damagesArr
  });
});

// Predictive analytics data model endpoint for all products
export const getAllProductsPredictionData = catchAsyncErrors(async (req, res) => {
  // Fetch all products
  const products = await Item.find().populate('productId');
  const productMap = new Map();
  products.forEach(item => {
    if (!item.productId) return;
    const pid = item.productId._id.toString();
    if (!productMap.has(pid)) {
      productMap.set(pid, {
        productId: pid,
        productName: item.productId.productName,
        sku: item.productId.sku,
        category: item.productId.productCategory,
        price: item.productId.price,
        inventory: { currentStock: 0, warehouseLocation: null },
        sales: { totalSold: 0, lastSoldAt: null },
        returns: [],
        damages: []
      });
    }
    // Inventory
    productMap.get(pid).inventory.currentStock++;
    productMap.get(pid).inventory.warehouseLocation = item.currentWarehouseId;
  });

  // Sales
  const salesHistory = await SalesHistory.find();
  salesHistory.forEach(s => {
    s.products.forEach(p => {
      const pid = p.productId.toString();
      if (productMap.has(pid)) {
        productMap.get(pid).sales.totalSold += p.quantity || 0;
        if (!productMap.get(pid).sales.lastSoldAt || (s.saleConfirmationDate && s.saleConfirmationDate > productMap.get(pid).sales.lastSoldAt)) {
          productMap.get(pid).sales.lastSoldAt = s.saleConfirmationDate;
        }
      }
    });
  });

  // Returns
  const returns = await Return.find();
  returns.forEach(r => {
    r.returnedItems.forEach(ri => {
      const pid = ri.productId.toString();
      if (productMap.has(pid)) {
        productMap.get(pid).returns.push({
          quantity: ri.quantity,
          date: r.returnDate,
          reason: r.returnReason
        });
      }
    });
  });

  // Damages
  const items = await Item.find();
  items.forEach(item => {
    const pid = item.productId.toString();
    if (!productMap.has(pid)) return;
    item.history.filter(h => h.action === 'damaged').forEach(h => {
      productMap.get(pid).damages.push({
        quantity: 1,
        date: h.date,
        cause: h.notes || ''
      });
    });
  });

  res.json({ products: Array.from(productMap.values()) });
});

// You can add more endpoints for advanced analytics as needed