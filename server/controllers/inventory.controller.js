import { Batch, Inventory, IncomingSupply, InventoryMovement, Item, Product } from "../models/index.js";
import { logAudit } from "../utils/auditLogger.js";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { catchAsyncErrors } from "../middlewares/index.js";
import { recordPurchaseOrderReceipt } from "../services/procurement/procurement.service.js";
import { transitionItemsStatus } from "../services/inventory/index.js";

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const normalizeId = (id) => (id?._id || id)?.toString();

const getAssignedWarehouseId = (req) => normalizeId(req.user?.assignedWarehouseId);

const runWithOptionalSession = (query, session) => (session ? query.session(session) : query);

const assertBatchInWarehouse = async (batchId, assignedWarehouseId, session) => {
  const batch = await runWithOptionalSession(Batch.findById(batchId), session);
  if (!batch) {
    throw httpError(404, "Batch not found.");
  }

  if (assignedWarehouseId && batch.warehouseId?.toString() !== assignedWarehouseId.toString()) {
    throw httpError(403, "Access denied for this warehouse.");
  }

  return batch;
};

const getScopedWarehouseFilter = (req, requestedWarehouseId) => {
  const assignedWarehouseId = getAssignedWarehouseId(req);

  if (
    assignedWarehouseId &&
    requestedWarehouseId &&
    requestedWarehouseId.toString() !== assignedWarehouseId.toString()
  ) {
    throw httpError(403, "Access denied for this warehouse.");
  }

  return assignedWarehouseId || requestedWarehouseId || null;
};

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
  const warehouseId = getAssignedWarehouseId(req);
  if (!warehouseId || !mongoose.Types.ObjectId.isValid(warehouseId)) {
    return res.status(400).json({ message: "User is not assigned to any valid warehouse." });
  }

  const session = await mongoose.startSession();
  let responsePayload;

  try {
    session.startTransaction();

    // Fetch product
    const product = await Product.findOne({ _id: productId, isDeleted: { $ne: true } }).session(session);
    if (!product) throw httpError(404, "Product not found.");

    const purchaseOrder = await recordPurchaseOrderReceipt({
      purchaseOrderId,
      productId,
      supplierId,
      warehouseId,
      quantity,
      session,
    });

    // Calculate total cost
    const totalCost = unitCost * quantity;

    // 1. Create a new Batch with financial fields
    const [batch] = await Batch.create([{
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
    }], { session });

    // 2. Log Incoming Supply
    await IncomingSupply.create([{
      batchId: batch._id,
      receivedBy: req.user._id,
      notes,
    }], { session });

    // 3. Add to Inventory (with inventoryValue)
    await Inventory.create([{
      batchId: batch._id,
      quantity,
      warehouseId,
      inventoryValue: totalCost
    }], { session });

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

    const createdItems = await Item.insertMany(items, { session });

    await InventoryMovement.insertMany(
      createdItems.map((item) => ({
        itemId: item._id,
        batchId: batch._id,
        productId: product._id,
        warehouseId,
        toWarehouseId: warehouseId,
        toStatus: "in_stock",
        action: "added",
        movementType: "receipt",
        quantity: 1,
        actorId: req.user?._id,
        referenceType: purchaseOrderId ? "PurchaseOrder" : "IncomingSupply",
        referenceId: purchaseOrderId || batch._id,
        notes: notes || "Inventory supply received",
      })),
      { session }
    );

    if (!product.supplierIds.some((supplier) => supplier.toString() === supplierId.toString())) {
      product.supplierIds.push(supplierId);
      await product.save({ session });
    }

    responsePayload = {
      message: "Supply added to inventory successfully.",
      batchId: batch._id,
      itemsCreated: quantity,
      totalCost,
      currency,
      purchaseOrderId: purchaseOrderId || null,
      purchaseOrderStatus: purchaseOrder?.status || null,
      purchaseOrderReceivedQuantity: purchaseOrder?.receivedQuantity || null,
    };

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    return res.status(error.statusCode || 400).json({ message: error.message });
  } finally {
    session.endSession();
  }

  return res.status(201).json(responsePayload);
});

// view all inventory
export const viewInventory = catchAsyncErrors(async (req, res) => {
  const warehouseId = getScopedWarehouseFilter(req);
  const inventoryFilter = warehouseId ? { warehouseId } : {};

  const inventory = await Inventory.find(inventoryFilter)
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
  let totalInventoryValue = 0;
  let totalDamagedValue = 0;
  let totalSoldValue = 0;

  for (const entry of inventory) {
    const batch = entry.batchId;
    if (!batch || !batch.productId) continue;
    const productId = batch.productId._id.toString();
    const price = batch.productId.price || 0;

    // Get damaged, in-stock, and sold item counts for this batch
    const [damagedItemCount, inStockItemCount, soldItemCount] = await Promise.all([
      Item.countDocuments({ batchId: batch._id, status: "damaged" }),
      Item.countDocuments({ batchId: batch._id, status: "in_stock" }),
      Item.countDocuments({ batchId: batch._id, status: "delivered" })
    ]);

    // Calculate values
    totalInventoryValue += price * inStockItemCount;
    totalDamagedValue += price * damagedItemCount;
    totalSoldValue += price * soldItemCount;

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
    totalInventoryValue,
    totalDamagedValue,
    totalSoldValue,
  });
});

// Get inventory by product ID
export const getInventoryByProduct = catchAsyncErrors(async (req, res) => {
  const { productId } = req.params;
  const warehouseId = getScopedWarehouseFilter(req);
  const inventoryFilter = warehouseId ? { warehouseId } : {};

  const inventoryEntries = await Inventory.find(inventoryFilter)
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

  if (!batchId || !quantity || quantity < 1) {
    return res.status(400).json({ message: "Batch ID and positive quantity are required." });
  }

  const session = await mongoose.startSession();
  let totalLoss = 0;

  try {
    session.startTransaction();

    const batch = await assertBatchInWarehouse(batchId, getAssignedWarehouseId(req), session);

    // Only update item status. Inventory.quantity is then synchronized from Item.status.
    const items = await Item.find({ batchId, status: "in_stock" }).limit(quantity).session(session);

    if (items.length < quantity) {
      throw httpError(400, "Not enough in-stock items to mark damaged");
    }

    const missingPurchasePrice = items.some((item) => typeof item.purchasePrice !== "number");
    totalLoss = missingPurchasePrice
      ? (batch?.unitCost || 0) * quantity
      : items.reduce((sum, item) => sum + item.purchasePrice, 0);

    const itemIds = items.map(item => item._id);
    const transitionResult = await transitionItemsStatus({
      itemIds,
      fromStatus: "in_stock",
      toStatus: "damaged",
      actorId: req.user?._id,
      warehouseId: batch?.warehouseId || items[0]?.currentWarehouseId,
      location: items[0]?.currentWarehouseId ? items[0].currentWarehouseId.toString() : "Unknown",
      notes: reason || "Marked as damaged",
      referenceType: "Batch",
      referenceId: batchId,
      movementType: "damage",
      session,
    });

    if (transitionResult.modifiedCount !== itemIds.length) {
      throw httpError(409, "Inventory changed while marking items damaged.");
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    return res.status(error.statusCode || 400).json({ message: error.message });
  } finally {
    session.endSession();
  }

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
  const { warehouseId: requestedWarehouseId, productId } = req.query;

  let warehouseId;
  try {
    warehouseId = getScopedWarehouseFilter(req, requestedWarehouseId);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message });
  }

  if (warehouseId && !mongoose.Types.ObjectId.isValid(warehouseId)) {
    return res.status(400).json({ message: "Warehouse ID must be a valid Mongo ID." });
  }

  // Compute real-time inventory status using Item status as source of truth.
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
  const assignedWarehouseId = getAssignedWarehouseId(req);

  const batch = await Batch.findOne({ batchNumber })
    .populate('productId', 'productName sku price')
    .populate('warehouseId', 'warehouseName address')
    .populate('supplierId', 'fullName companyName');

  if (!batch) {
    return res.status(404).json({ message: "Batch not found" });
  }

  if (assignedWarehouseId && batch.warehouseId?._id?.toString() !== assignedWarehouseId.toString()) {
    return res.status(403).json({ message: "Access denied for this warehouse." });
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
