import { Item } from "../models/item.model.js";
import { catchAsyncErrors } from "../middlewares/index.js";

export const getAllItems = catchAsyncErrors(async (req, res) => {
  const items = await Item.find().populate("productId batchId currentWarehouseId");
    res.json(items);
});

export const getItemById = catchAsyncErrors(async (req, res) => {
  const item = await Item.findById(req.params.id).populate("productId batchId currentWarehouseId");
  if (!item) return res.status(404).json({ error: "Item not found" });
  res.json(item);
});

export const getItemsByBatch = catchAsyncErrors(async (req, res) => {
  const items = await Item.find({ batchId: req.params.batchId });
  res.json(items);
});

export const updateItemStatus = catchAsyncErrors(async (req, res) => {
  const { status, notes } = req.body;
  const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });

    item.status = status;
    item.history.push({
      action: status,
      date: new Date(),
      location: notes?.location || "Unknown",
      notes: notes?.message || "Status updated",
    });

    await item.save();
    res.json({ message: "Item status updated", item });
});

export const trackItemBySerial = catchAsyncErrors(async (req, res) => {
  const { serialNumber } = req.params;
  
  const item = await Item.findOne({ serialNumber })
    .populate('productId', 'productName sku price')
    .populate('batchId', 'batchNumber mfgDate expDate')
    .populate('currentWarehouseId', 'warehouseName address');
  
  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  res.json({
    message: "Item tracking information",
    item: {
      serialNumber: item.serialNumber,
      currentStatus: item.status,
      product: item.productId,
      batch: item.batchId,
      warehouse: item.currentWarehouseId,
      statusHistory: item.history,
      lastUpdated: item.updatedAt
    }
  });
});

export const getProductMovementHistory = catchAsyncErrors(async (req, res) => {
  const { productId } = req.params;
  
  const items = await Item.find({ productId })
    .populate('batchId', 'batchNumber')
    .select('serialNumber status history createdAt')
    .sort('-createdAt');

  const movementSummary = {
    totalItems: items.length,
    statusBreakdown: {},
    recentMovements: []
  };

  // Calculate status breakdown
  items.forEach(item => {
    movementSummary.statusBreakdown[item.status] = 
      (movementSummary.statusBreakdown[item.status] || 0) + 1;
  });

  // Get recent movements (last 50)
  movementSummary.recentMovements = items
    .flatMap(item => 
      item.history.map(h => ({
        serialNumber: item.serialNumber,
        action: h.action,
        date: h.date,
        location: h.location,
        notes: h.notes
      }))
    )
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 50);

  res.json({
    message: "Product movement history",
    productId,
    summary: movementSummary
  });
});