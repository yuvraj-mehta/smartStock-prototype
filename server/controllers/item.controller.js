import { Item } from "../models/item.model.js";
import { catchAsyncErrors } from "../middlewares/index.js";
import { normalizeId, transitionItemStatus } from "../services/inventory/index.js";

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const getAssignedWarehouseId = (req) => normalizeId(req.user?.assignedWarehouseId);

const buildWarehouseScopedFilter = (req, baseFilter = {}) => {
  const assignedWarehouseId = getAssignedWarehouseId(req);
  return assignedWarehouseId
    ? { ...baseFilter, currentWarehouseId: assignedWarehouseId }
    : baseFilter;
};

export const getAllItems = catchAsyncErrors(async (req, res) => {
  const items = await Item.find(buildWarehouseScopedFilter(req)).populate("productId batchId currentWarehouseId");
  res.json(items);
});

export const getItemById = catchAsyncErrors(async (req, res) => {
  const item = await Item.findOne(buildWarehouseScopedFilter(req, { _id: req.params.id }))
    .populate("productId batchId currentWarehouseId");
  if (!item) return res.status(404).json({ error: "Item not found" });
  res.json(item);
});

export const getItemsByBatch = catchAsyncErrors(async (req, res) => {
  const items = await Item.find(buildWarehouseScopedFilter(req, { batchId: req.params.batchId }));
  res.json(items);
});

export const updateItemStatus = catchAsyncErrors(async (req, res) => {
  const { status, notes } = req.body;
  const item = await Item.findOne(buildWarehouseScopedFilter(req, { _id: req.params.id }));
  if (!item) return res.status(404).json({ error: "Item not found" });

  try {
    const result = await transitionItemStatus(item, status, {
      actorId: req.user?._id,
      warehouseId: item.currentWarehouseId,
      location: notes?.location || normalizeId(item.currentWarehouseId),
      notes: notes?.message || "Manual item status update",
      referenceType: "Item",
      referenceId: item._id,
      movementType: "adjustment",
    });

    res.json({ message: "Item status updated", item: result.item });
  } catch (error) {
    throw httpError(error.statusCode || 400, error.message);
  }
});

export const trackItemBySerial = catchAsyncErrors(async (req, res) => {
  const { serialNumber } = req.params;

  const item = await Item.findOne({ serialNumber })
    .select("serialNumber status updatedAt")
    .populate('productId', 'productName sku')
    .populate('batchId', 'batchNumber expDate');

  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  res.json({
    message: "Item tracking information",
    item: {
      serialNumber: item.serialNumber,
      currentStatus: item.status,
      product: item.productId
        ? {
          productName: item.productId.productName,
          sku: item.productId.sku,
        }
        : null,
      batch: item.batchId
        ? {
          batchNumber: item.batchId.batchNumber,
          expDate: item.batchId.expDate,
        }
        : null,
      lastUpdated: item.updatedAt,
    },
  });
});

export const getProductMovementHistory = catchAsyncErrors(async (req, res) => {
  const { productId } = req.params;

  const items = await Item.find(buildWarehouseScopedFilter(req, { productId }))
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
