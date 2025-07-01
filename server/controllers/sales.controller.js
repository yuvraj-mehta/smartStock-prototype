// controllers/sales.controller.js

import { SalesHistory } from "../models/sales.history.model.js";
import { Product } from "../models/product.model.js";
import { Batch } from "../models/batch.model.js";
import { Item } from "../models/item.model.js";
import { Warehouse } from "../models/warehouse.model.js";
import { catchAsyncErrors } from "../middlewares/index.js";

export const recordSale = catchAsyncErrors(async (req, res) => {
  const {
    productId,
    batchId,
    warehouseId,
    quantity,
    action,
    referenceItemIds,
    notes,
  } = req.body;

  if (!productId || !warehouseId || !quantity || !action) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  if (!["dispatched", "returned"].includes(action)) {
    return res.status(400).json({ message: "Invalid action type." });
  }

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Product not found." });

  const warehouse = await Warehouse.findById(warehouseId);
  if (!warehouse) return res.status(404).json({ message: "Warehouse not found." });

  if (batchId) {
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: "Batch not found." });
  }

  if (referenceItemIds?.length > 0) {
    const count = await Item.countDocuments({ _id: { $in: referenceItemIds } });
    if (count !== referenceItemIds.length) {
      return res.status(400).json({ message: "Some item IDs are invalid." });
    }

    await Item.updateMany(
      { _id: { $in: referenceItemIds } },
      { $set: { status: action } },
      { multi: true }
    );
  }

  const history = await SalesHistory.create({
    productId,
    batchId,
    warehouseId,
    quantity,
    action,
    referenceItemIds,
    notes,
  });

  res.status(201).json({ message: "Sales record created", history });
});

export const getAllSales = catchAsyncErrors(async (req, res) => {
  const records = await SalesHistory.find()
    .populate("productId", "productName sku")
    .populate("batchId", "batchNumber")
    .populate("warehouseId", "warehouseName")
    .populate("referenceItemIds", "serialNumber status");

  res.status(200).json(records);
});

export const getSaleById = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const record = await SalesHistory.findById(id)
    .populate("productId", "productName")
    .populate("batchId", "batchNumber")
    .populate("warehouseId", "warehouseName")
    .populate("referenceItemIds", "serialNumber status");

  if (!record) return res.status(404).json({ message: "Record not found." });

  res.status(200).json(record);
});