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