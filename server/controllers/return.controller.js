import { Return } from "../models/Return.js";
import { Item } from "../models/item.model.js";
import { Product } from "../models/product.model.js";
import { Batch } from "../models/batch.model.js";
import { SalesHistory } from "../models/sales.history.model.js";
import { catchAsyncErrors } from "../middlewares/index.js"

export const createReturn = catchAsyncErrors(async (req, res) => {
  const {
    productId,
    batchId,
    warehouseId,
    quantity,
    returnedBy,
    reason,
    referenceItemIds,
  } = req.body;

  if (!productId || !batchId || !warehouseId || !quantity || !reason) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  // Validate product and batch
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Product not found." });

  const batch = await Batch.findById(batchId);
  if (!batch) return res.status(404).json({ message: "Batch not found." });

  // Optional: validate itemIds belong to the batch/product
  if (referenceItemIds && referenceItemIds.length > 0) {
    await Item.updateMany(
      { _id: { $in: referenceItemIds } },
      {
        $set: {
          status: "returned",
        },
        $push: {
          history: {
            action: "returned",
            notes: reason,
          },
        },
      }
    );
  }

  // Save Return record
  const returnRecord = await Return.create({
    productId,
    batchId,
    warehouseId,
    quantity,
    returnedBy,
    reason,
    referenceItemIds,
  });

  // Log in SalesHistory
  await SalesHistory.create({
    productId,
    batchId,
    warehouseId,
    quantity,
    action: "returned",
    referenceItemIds,
    notes: reason,
  });

  res.status(201).json({ message: "Return recorded", returnRecord });
});

export const getAllReturns = catchAsyncErrors(async (req, res) => {
  const returns = await Return.find()
    .populate("productId", "productName sku")
    .populate("batchId", "batchNumber")
    .populate("warehouseId", "warehouseName")
    .populate("returnedBy", "fullName email")
    .populate("referenceItemIds", "serialNumber status");

  res.status(200).json(returns);
});

export const getReturnById = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const returnRecord = await Return.findById(id)
    .populate("productId", "productName")
    .populate("batchId", "batchNumber")
    .populate("warehouseId", "warehouseName")
    .populate("returnedBy", "fullName email")
    .populate("referenceItemIds", "serialNumber status");

  if (!returnRecord) {
    return res.status(404).json({ message: "Return record not found." });
  }

  res.status(200).json(returnRecord);
});