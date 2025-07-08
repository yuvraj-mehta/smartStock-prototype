import { Batch, Inventory, IncomingSupply, Item, Product } from "../models/index.js";
import { logAudit } from "../utils/auditLogger.js";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { catchAsyncErrors } from "../middlewares/index.js";

// Add inventory supply
export const addInventorySupply = catchAsyncErrors(async (req, res) => {
  const {
    productId,
    supplierId,
    quantity,
    mfgDate,
    expDate,
    notes,
    unitCost,
    currency = 'INR',
    purchaseOrderId
  } = req.body;

  if (!productId || !supplierId || !quantity || !mfgDate || !expDate || unitCost === undefined) {
    return res.status(400).json({ message: "All required fields must be provided." });
  }

  // Always use the user's assigned warehouse ID for supply
  const warehouseId = req.user.assignedWarehouseId;
  if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
    return res.status(400).json({ message: "User is not assigned to any valid warehouse." });
  }

  // Fetch product
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Product not found." });

  // Calculate total cost
  const totalCost = unitCost * quantity;

  // 1. Create a new Batch with financial fields
  const batch = await Batch.create({
    batchNumber: `BATCH-${Date.now()}`,
    productId,
    warehouseId,
    supplierId,
    quantity,
    mfgDate,
    expDate,
    unitCost,
    totalCost,
    currency,
    purchaseOrderId
  });

  // 2. Log Incoming Supply
  await IncomingSupply.create({
    batchId: batch._id,
    receivedBy: req.user._id,
    notes,
  });

  // 3. Add to Inventory (with inventoryValue)
  await Inventory.create({
    batchId: batch._id,
    quantity,
    warehouseId,
    inventoryValue: totalCost
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
      purchasePrice: unitCost
    });
  }

  await Item.insertMany(items);

  // No longer update product.quantity directly. SupplierIds update retained.
  if (!product.supplierIds.includes(supplierId)) {
    product.supplierIds.push(supplierId);
    await product.save();
  }

  return res.status(201).json({
    message: "Supply added to inventory successfully.",
    batchId: batch._id,
    itemsCreated: quantity,
    totalCost,
    currency,
    purchaseOrderId: purchaseOrderId || null
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

  // Group inventory by product using Item status as source of truth
  const productMap = {};
  for (const entry of inventory) {
    const batch = entry.batchId;
    if (!batch || !batch.productId) continue;
    const productId = batch.productId._id.toString();

    // Get damaged and in-stock item counts for this batch
    const [damagedItemCount, inStockItemCount] = await Promise.all([
      Item.countDocuments({ batchId: batch._id, status: "damaged" }),
      Item.countDocuments({ batchId: batch._id, status: "in_stock" })
    ]);

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
      supplier: batch.supplierId && batch.supplierId.fullName ? batch.supplierId : null,
      quantity: inStockItemCount, // Only in-stock items are available
      damagedQuantity: damagedItemCount,
      mfgDate: batch.mfgDate,
      expDate: batch.expDate,
      warehouse: entry.warehouseId,
    });
    productMap[productId].totalQuantity += inStockItemCount;
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
  console.log("Marking inventory as damaged");

  const { batchId, quantity, reason } = req.body;
  // Only update item status, do not update Inventory or Product quantities
  const items = await Item.find({ batchId, status: "in_stock" }).limit(quantity);
  console.log(`Found ${items.length} items to mark as damaged for batch ${batchId}`);

  if (items.length < quantity) {
    return res.status(400).json({ message: "Not enough in-stock items to mark damaged" });
  }

  // Calculate financial loss
  let totalLoss = 0;
  let missingPurchasePrice = false;
  for (const item of items) {
    if (typeof item.purchasePrice === 'number') {
      totalLoss += item.purchasePrice;
    } else {
      missingPurchasePrice = true;
    }
  }
  // If any item is missing purchasePrice, fallback to batch.unitCost
  if (missingPurchasePrice) {
    const batch = await Batch.findById(batchId);
    if (batch && typeof batch.unitCost === 'number') {
      totalLoss = batch.unitCost * quantity;
    } else {
      totalLoss = 0;
    }
  }

  const itemIds = items.map(item => item._id);
  const now = new Date();
  const historyEntry = {
    action: "damaged",
    location: items[0]?.currentWarehouseId ? items[0].currentWarehouseId.toString() : "Unknown",
    notes: reason || "Marked as damaged",
    date: now
  };

  // Bulk update
  await Item.updateMany(
    { _id: { $in: itemIds } },
    {
      $set: { status: "damaged" },
      $push: { history: historyEntry }
    }
  );

  console.log(`Marked ${items.length} items as damaged for batch ${batchId}`);

  // Audit log
  await logAudit({
    userId: req.user?._id,
    action: "MARK_DAMAGED",
    entityType: "Batch",
    entityId: batchId,
    value: totalLoss,
    details: `${quantity} item(s) marked as damaged. Reason: ${reason || 'N/A'}`
  });

  return res.status(200).json({
    message: `${quantity} item(s) marked as damaged and inventory adjusted.`,
    financialLoss: totalLoss
  });
});

// Real-time inventory status (safe addition)
export const getRealTimeInventoryStatus = catchAsyncErrors(async (req, res) => {
  const { warehouseId, productId } = req.query;

  const matchStage = {};
  if (warehouseId) matchStage.warehouseId = new mongoose.Types.ObjectId(warehouseId);

  // Compute real-time inventory status using Item status as source of truth
  // Find all batches (optionally filter by warehouse/product)
  const batchQuery = {};
  if (warehouseId) batchQuery.warehouseId = warehouseId;
  if (productId) batchQuery.productId = productId;
  const batches = await Batch.find(batchQuery)
    .populate('productId', 'productName sku thresholdLimit')
    .populate('warehouseId', 'warehouseName');

  const inventoryStatus = await Promise.all(batches.map(async (batch) => {
    const inStock = await Item.countDocuments({ batchId: batch._id, status: 'in_stock' });
    const threshold = batch.productId.thresholdLimit || 0;
    let stockStatus = 'in_stock';
    if (inStock === 0) stockStatus = 'out_of_stock';
    else if (inStock <= threshold) stockStatus = 'low';
    return {
      productId: batch.productId._id,
      productName: batch.productId.productName,
      sku: batch.productId.sku,
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      warehouse: batch.warehouseId?.warehouseName,
      inStock,
      thresholdLimit: threshold,
      stockStatus,
      mfgDate: batch.mfgDate,
      expDate: batch.expDate,
      status: batch.status
    };
  }));

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