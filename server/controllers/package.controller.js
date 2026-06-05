import { Package, Transport, Item, Batch, Inventory, ExternalUser } from "../models/index.js";
import { catchAsyncErrors } from "../middlewares/index.js";
import mongoose from "mongoose";

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const runWithOptionalSession = (query, session) => (session ? query.session(session) : query);

const normalizeId = (id) => (id?._id || id)?.toString();

const getAssignedWarehouseId = (req) => normalizeId(req.user?.assignedWarehouseId);

const getInventoryValueForBatch = async (batchId, session) => {
  const items = await runWithOptionalSession(
    Item.find({ batchId, status: "in_stock" }).select("purchasePrice"),
    session
  );

  if (items.every((item) => typeof item.purchasePrice === "number")) {
    return items.reduce((sum, item) => sum + item.purchasePrice, 0);
  }

  const batch = await runWithOptionalSession(Batch.findById(batchId).select("unitCost"), session);
  return (batch?.unitCost || 0) * items.length;
};

const syncInventoryForBatch = async (batchId, warehouseId, session) => {
  const [quantity, inventoryValue] = await Promise.all([
    runWithOptionalSession(Item.countDocuments({ batchId, status: "in_stock" }), session),
    getInventoryValueForBatch(batchId, session),
  ]);

  await Inventory.updateOne(
    { batchId, warehouseId },
    {
      $set: { quantity, inventoryValue },
      $setOnInsert: { batchId, warehouseId },
    },
    { upsert: true, session }
  );
};

const uniqueIds = (ids) => [...new Set(ids.filter(Boolean).map(normalizeId).filter(Boolean))];

const getBatchWarehouseMap = async (batchIds, session) => {
  const ids = uniqueIds(batchIds);
  if (ids.length === 0) return new Map();

  const batches = await runWithOptionalSession(
    Batch.find({ _id: { $in: ids } }).select("warehouseId"),
    session
  );

  return new Map(batches.map((batch) => [batch._id.toString(), batch.warehouseId]));
};

const ensurePackageWarehouseAccess = async (packageDoc, assignedWarehouseId, session) => {
  if (!assignedWarehouseId) return await getBatchWarehouseMap(packageDoc.allocatedItems?.map((item) => item.batchId), session);

  const batchIds = uniqueIds(packageDoc.allocatedItems?.map((item) => item.batchId) || []);
  const batchWarehouseMap = await getBatchWarehouseMap(batchIds, session);

  if (batchIds.length > 0 && batchWarehouseMap.size !== batchIds.length) {
    throw httpError(400, "Package contains an unknown inventory batch.");
  }

  const hasOutOfScopeBatch = [...batchWarehouseMap.values()].some(
    (warehouseId) => warehouseId?.toString() !== assignedWarehouseId.toString()
  );

  if (hasOutOfScopeBatch) {
    throw httpError(403, "Access denied for this warehouse.");
  }

  return batchWarehouseMap;
};

const ensureTransporterWarehouseAccess = async (transporterId, assignedWarehouseId, session) => {
  if (!assignedWarehouseId) return;

  const transporter = await runWithOptionalSession(
    ExternalUser.findById(transporterId).select("role warehouseId"),
    session
  );

  if (!transporter || transporter.role !== "transporter") {
    throw httpError(404, "Transporter not found.");
  }

  if (transporter.warehouseId && transporter.warehouseId.toString() !== assignedWarehouseId.toString()) {
    throw httpError(403, "Transporter is not assigned to this warehouse.");
  }
};

const applyScopedPackageFilter = async (filter, req) => {
  const assignedWarehouseId = getAssignedWarehouseId(req);
  if (!assignedWarehouseId) return filter;

  const batchIds = await Batch.find({ warehouseId: assignedWarehouseId }).distinct("_id");
  return {
    ...filter,
    "allocatedItems.batchId": { $in: batchIds },
  };
};

// Get all packages
export const getAllPackages = catchAsyncErrors(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  let filter = {};
  if (status) filter.packageStatus = status;
  filter = await applyScopedPackageFilter(filter, req);

  const packages = await Package.find(filter)
    .populate('orderId', 'orderNumber platformOrderId')
    .populate('packedBy', 'fullName')
    .populate('allocatedItems.productId', 'productName sku')
    .populate('allocatedItems.batchId', 'batchNumber warehouseId')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Package.countDocuments(filter);

  res.status(200).json({
    packages,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    total
  });
});

// Get package by ID
export const getPackageById = catchAsyncErrors(async (req, res) => {
  const { packageId } = req.params;
  const assignedWarehouseId = getAssignedWarehouseId(req);

  const packageDoc = await Package.findById(packageId)
    .populate('orderId')
    .populate('packedBy', 'fullName')
    .populate('allocatedItems.productId')
    .populate('allocatedItems.batchId')
    .populate('allocatedItems.itemIds');

  if (!packageDoc) {
    return res.status(404).json({ message: "Package not found" });
  }

  try {
    await ensurePackageWarehouseAccess(packageDoc, assignedWarehouseId);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message });
  }

  // Get transport info if available
  const transport = await Transport.findOne({ packageId: packageDoc._id })
    .populate('transporterId', 'fullName companyName');

  res.status(200).json({
    package: packageDoc,
    transport
  });
});

// Get packages by order ID
export const getPackagesByOrderId = catchAsyncErrors(async (req, res) => {
  const { orderId } = req.params;

  let filter = { orderId };
  filter = await applyScopedPackageFilter(filter, req);

  const packages = await Package.find(filter)
    .populate('packedBy', 'fullName')
    .populate('allocatedItems.productId', 'productName sku')
    .populate('allocatedItems.batchId', 'batchNumber warehouseId')
    .sort({ createdAt: -1 });

  res.status(200).json({ packages });
});

// Update package status
export const updatePackageStatus = catchAsyncErrors(async (req, res) => {
  const { packageId } = req.params;
  const { status, notes } = req.body;
  const assignedWarehouseId = getAssignedWarehouseId(req);

  // Only allow packing to 'ready_for_dispatch'
  if (status !== 'ready_for_dispatch') {
    return res.status(400).json({ message: "Only packing to 'ready_for_dispatch' is supported." });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const packageDoc = await Package.findById(packageId).populate('orderId').session(session);
    if (!packageDoc) {
      throw httpError(404, "Package not found");
    }

    const batchWarehouseMap = await ensurePackageWarehouseAccess(packageDoc, assignedWarehouseId, session);

    // Prevent double-packing
    if (packageDoc.packageStatus === 'ready_for_dispatch') {
      throw httpError(400, "Package is already packed.");
    }
    if (packageDoc.packageStatus !== 'created') {
      throw httpError(400, `Cannot pack package in status: ${packageDoc.packageStatus}`);
    }

    // Update all items in the package to 'packed' and log the action
    for (const alloc of packageDoc.allocatedItems) {
      if (alloc.itemIds && alloc.itemIds.length > 0) {
        const updateResult = await Item.updateMany(
          { _id: { $in: alloc.itemIds }, status: 'allocated' },
          {
            $set: { status: 'packed' },
            $push: { history: { action: 'packed', date: new Date(), notes: notes || '' } }
          },
          { session }
        );

        const modifiedCount = updateResult.modifiedCount ?? updateResult.nModified ?? 0;
        if (modifiedCount !== alloc.itemIds.length) {
          throw httpError(409, "Package items changed while packing.");
        }

        const warehouseId = batchWarehouseMap.get(normalizeId(alloc.batchId));
        if (warehouseId) {
          await syncInventoryForBatch(alloc.batchId, warehouseId, session);
        }
      }
    }

    // Update package fields
    packageDoc.packageStatus = 'ready_for_dispatch';
    packageDoc.packedBy = req.user?._id || null;
    packageDoc.packedAt = new Date();
    if (notes) packageDoc.notes = notes;
    await packageDoc.save({ session });

    // If all packages for the order are packed, update order status
    const order = packageDoc.orderId;
    const allPackages = await Package.find({ orderId: order._id }).session(session);
    const allPacked = allPackages.every(pkg => pkg.packageStatus === 'ready_for_dispatch');
    if (allPacked && order.orderStatus !== 'packaged') {
      order.orderStatus = 'packaged';
      await order.save({ session });
    }

    await session.commitTransaction();

    res.status(200).json({
      message: "Package packed successfully",
      package: packageDoc,
      order: order
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(error.statusCode || 400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Assign or reassign a transporter to a package
export const assignOrReassignTransport = catchAsyncErrors(async (req, res) => {
  const { packageId } = req.params;
  const { transporterId, notes } = req.body;
  const assignedWarehouseId = getAssignedWarehouseId(req);

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const packageDoc = await Package.findById(packageId).populate('orderId').session(session);
    if (!packageDoc) {
      throw httpError(404, "Package not found");
    }

    await ensurePackageWarehouseAccess(packageDoc, assignedWarehouseId, session);

    // Allow assigning/reassigning transporter if package is not delivered or returned
    if (["delivered", "returned"].includes(packageDoc.packageStatus)) {
      throw httpError(400, "Cannot assign transporter to a delivered or returned package.");
    }

    await ensureTransporterWarehouseAccess(transporterId, assignedWarehouseId, session);

    // Remove any previous transport assignment for this package
    await Transport.deleteMany({ packageId: packageDoc._id }).session(session);

    // Create new transport assignment
    const [transport] = await Transport.create([{
      packageId: packageDoc._id,
      transporterId,
      transportType: 'forward',
      assignedBy: req.user._id,
      status: 'dispatched',
      notes
    }], { session });

    // If package is not already dispatched, update status
    if (packageDoc.packageStatus !== 'dispatched') {
      packageDoc.packageStatus = 'dispatched';
      await packageDoc.save({ session });
    }

    // If order is not already dispatched, update status
    const order = packageDoc.orderId;
    if (order && order.orderStatus !== 'dispatched') {
      order.orderStatus = 'dispatched';
      await order.save({ session });
    }

    await session.commitTransaction();

    res.status(200).json({
      message: "Transporter assigned/reassigned successfully",
      transport,
      package: packageDoc
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(error.statusCode || 400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});
