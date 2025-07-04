import { Batch, Inventory, IncomingSupply, Item, Product } from "../models/index.js";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { catchAsyncErrors } from "../middlewares/index.js";

// Add inventory supply
export const addInventorySupply = catchAsyncErrors(async (req, res) => {
  const {
    productId,
    supplierId,
    warehouseId,
    quantity,
    mfgDate,
    expDate,
    notes,
  } = req.body;

  if (!productId || !supplierId || !warehouseId || !quantity || !mfgDate || !expDate) {
    return res.status(400).json({ message: "All required fields must be provided." });
  }

  // Fetch product
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Product not found." });

  // 1. Create a new Batch
  const batch = await Batch.create({
    batchNumber: `BATCH-${Date.now()}`,
    productId,
    warehouseId,
    supplierId,
    quantity,
    mfgDate,
    expDate,
  });

  // 2. Log Incoming Supply
  await IncomingSupply.create({
    batchId: batch._id,
    receivedBy: req.user._id,
    notes,
  });

  // 3. Add to Inventory
  await Inventory.create({
    batchId: batch._id,
    quantity,
    warehouseId,
  });

  // 4. Create individual Items
  const items = [];
  for (let i = 0; i < quantity; i++) {
    items.push({
      batchId: batch._id,
      productId: product._id,
      serialNumber: `${product.sku}-${uuidv4()}`,
      currentWarehouseId: warehouseId,
      status: "in_stock",
      history: [
        {
          action: "added",
          location: `${warehouseId}`,
          notes: "Item received via supply",
        },
      ],
    });
  }

  await Item.insertMany(items);

  // 5. Update product quantity
  product.quantity += quantity;
  if (!product.supplierIds.includes(supplierId)) {
    product.supplierIds.push(supplierId);
  }
  await product.save();

  return res.status(201).json({
    message: "Supply added to inventory successfully.",
    batchId: batch._id,
    itemsCreated: quantity,
  });
});

// view all inventory
export const viewInventory = catchAsyncErrors(async (req, res) => {
  const inventory = await Inventory.find()
    .populate({
      path: "batchId",
      populate: [
        { path: "productId", select: "productName sku price unit productCategory" },
        { path: "supplierId", select: "fullName companyName" },
      ],
    })
    .populate("warehouseId", "warehouseName address.city address.state");

  // Group inventory by product
  const productMap = {};
  for (const entry of inventory) {
    const batch = entry.batchId;
    if (!batch || !batch.productId) continue;
    const productId = batch.productId._id.toString();
    if (!productMap[productId]) {
      productMap[productId] = {
        product: batch.productId,
        batches: [],
        totalQuantity: 0,
      };
    }
    productMap[productId].batches.push({
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      supplier: batch.supplierId,
      quantity: entry.quantity,
      mfgDate: batch.mfgDate,
      expDate: batch.expDate,
      warehouse: entry.warehouseId,
    });
    productMap[productId].totalQuantity += entry.quantity;
  }

  const products = Object.values(productMap);

  return res.status(200).json({
    message: "Inventory fetched successfully.",
    totalProducts: products.length,
    products,
  });
});

// Get inventory by product ID
export const getInventoryByProduct = catchAsyncErrors(async (req, res) => {
  const { productId } = req.params;

  const inventoryEntries = await Inventory.find()
    .populate({
      path: "batchId",
      match: { productId }, // Filter batches by the productId
      populate: [
        { path: "productId", model: Product },
        { path: "supplierId", model: "ExternalUser" },
      ],
    })
    .populate("warehouseId", "warehouseName address");

  // Remove entries where batchId is null (i.e., not matching productId)
  const filteredEntries = inventoryEntries.filter((entry) => entry.batchId);

  res.status(200).json({
    success: true,
    message: `Inventory for product ID ${productId}`,
    data: filteredEntries,
  });
});

// adjust inventory 
export const markDamagedInventory = catchAsyncErrors(async (req, res) => {
  const { batchId, quantity, reason } = req.body;

  const inventory = await Inventory.findOne({ batchId });
  if (!inventory || inventory.quantity < quantity) {
    return res.status(400).json({ message: "Insufficient inventory to mark damaged" });
  }

  // Reduce inventory
  inventory.quantity -= quantity;
  await inventory.save();

  // Update item status to damaged
  const items = await Item.find({ batchId, status: "in_stock" }).limit(quantity);
  if (items.length < quantity) {
    return res.status(400).json({ message: "Not enough in-stock items to mark damaged" });
  }

  for (const item of items) {
    item.status = "damaged";
    item.history.push({
      action: "damaged",
      location: inventory.warehouseId.toString(),
      notes: reason || "Marked as damaged",
    });
    await item.save();
  }

  // Update product quantity
  const batch = await Batch.findById(batchId).populate("productId");
  const product = batch.productId;
  product.quantity -= quantity;
  await product.save();

  res.status(200).json({
    message: `${quantity} item(s) marked as damaged and inventory adjusted.`,
  });
});

// Real-time inventory status (safe addition)
export const getRealTimeInventoryStatus = catchAsyncErrors(async (req, res) => {
  const { warehouseId, productId } = req.query;

  const matchStage = {};
  if (warehouseId) matchStage.warehouseId = new mongoose.Types.ObjectId(warehouseId);

  const inventoryStatus = await Inventory.aggregate([
    { $match: matchStage },
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
      $lookup: {
        from: 'products',
        localField: 'batch.productId',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    ...(productId ? [{ $match: { 'product._id': new mongoose.Types.ObjectId(productId) } }] : []),
    {
      $group: {
        _id: '$product._id',
        productName: { $first: '$product.productName' },
        sku: { $first: '$product.sku' },
        totalQuantity: { $sum: '$quantity' },
        thresholdLimit: { $first: '$product.thresholdLimit' },
        batches: {
          $push: {
            batchId: '$batch._id',
            batchNumber: '$batch.batchNumber',
            quantity: '$quantity',
            mfgDate: '$batch.mfgDate',
            expDate: '$batch.expDate',
            status: '$batch.status'
          }
        }
      }
    },
    {
      $addFields: {
        stockStatus: {
          $cond: {
            if: { $lte: ['$totalQuantity', '$thresholdLimit'] },
            then: 'low',
            else: { $cond: { if: { $eq: ['$totalQuantity', 0] }, then: 'out_of_stock', else: 'in_stock' } }
          }
        }
      }
    }
  ]);

  res.json({
    message: "Real-time inventory status",
    timestamp: new Date().toISOString(),
    inventoryStatus
  });
});

// Track batch by number
export const trackBatchByNumber = catchAsyncErrors(async (req, res) => {
  const { batchNumber } = req.params;
  
  const batch = await Batch.findOne({ batchNumber })
    .populate('productId', 'productName sku price')
    .populate('warehouseId', 'warehouseName address')
    .populate('supplierId', 'fullName companyName');

  if (!batch) {
    return res.status(404).json({ message: "Batch not found" });
  }

  // Get items in this batch
  const items = await Item.find({ batchId: batch._id })
    .select('serialNumber status')
    .sort('status');

  // Get inventory info
  const inventory = await Inventory.findOne({ batchId: batch._id });

  const batchTracking = {
    batchInfo: {
      batchNumber: batch.batchNumber,
      product: batch.productId,
      supplier: batch.supplierId,
      warehouse: batch.warehouseId,
      originalQuantity: batch.quantity,
      currentQuantity: inventory?.quantity || 0,
      mfgDate: batch.mfgDate,
      expDate: batch.expDate,
      receivedAt: batch.receivedAt,
      status: batch.status,
      condition: batch.condition
    },
    itemsBreakdown: {
      total: items.length,
      statusCounts: items.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {}),
      items: items
    }
  };

  res.json({
    message: "Batch tracking information",
    batchTracking
  });
});