import { Transport, Package, Batch } from "../models/index.js";
import { catchAsyncErrors } from "../middlewares/index.js";
import mongoose from "mongoose";
import { normalizeId, runWithOptionalSession, transitionItemsStatus } from "../services/inventory/index.js";

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const TRANSPORT_STATUS_SEQUENCE = ['dispatched', 'in_transit', 'delivered'];

const getAssignedWarehouseId = (req) => normalizeId(req.user?.assignedWarehouseId);

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

const applyScopedTransportFilter = async (filter, req) => {
  const assignedWarehouseId = getAssignedWarehouseId(req);
  let scopedFilter = { ...filter };

  if (req.user.role === "transporter") {
    scopedFilter.transporterId = req.user._id;
  }

  if (!assignedWarehouseId) return scopedFilter;

  const batchIds = await Batch.find({ warehouseId: assignedWarehouseId }).distinct("_id");
  const packageIds = await Package.find({ "allocatedItems.batchId": { $in: batchIds } }).distinct("_id");
  scopedFilter.packageId = { $in: packageIds };

  return scopedFilter;
};

// Get all transports
export const getAllTransports = catchAsyncErrors(async (req, res) => {
  const { status, transportType, page = 1, limit = 10 } = req.query;

  let filter = {};
  if (status) filter.status = status;
  if (transportType) filter.transportType = transportType;
  filter = await applyScopedTransportFilter(filter, req);

  const transports = await Transport.find(filter)
    .populate('packageId', 'packageId')
    .populate('transporterId', 'fullName companyName')
    .populate('assignedBy', 'fullName')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Transport.countDocuments(filter);

  res.status(200).json({
    transports,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    total
  });
});

// Get transport by ID
export const getTransportById = catchAsyncErrors(async (req, res) => {
  const { transportId } = req.params;
  const assignedWarehouseId = getAssignedWarehouseId(req);

  const transport = await Transport.findById(transportId)
    .populate('packageId')
    .populate('transporterId', 'fullName companyName phone')
    .populate('assignedBy', 'fullName');

  if (!transport) {
    return res.status(404).json({ message: "Transport not found" });
  }

  if (req.user.role === "transporter" && transport.transporterId?._id?.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not authorized to view this transport" });
  }

  try {
    if (transport.packageId) {
      await ensurePackageWarehouseAccess(transport.packageId, assignedWarehouseId);
    }
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message });
  }

  res.status(200).json({ transport });
});

// Update transport status (for transporters)
export const updateTransportStatus = catchAsyncErrors(async (req, res) => {
  const { transportId } = req.params;
  const { status, notes } = req.body;
  const assignedWarehouseId = getAssignedWarehouseId(req);

  const allowedStatuses = ["dispatched", "in_transit", "delivered"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const transport = await Transport.findById(transportId).session(session);
    if (!transport) {
      throw httpError(404, "Transport not found");
    }

    // Check if user is authorized to update this transport
    if (req.user.role === "transporter" && transport.transporterId.toString() !== req.user._id.toString()) {
      throw httpError(403, "Not authorized to update this transport");
    }

    const previousStatus = transport.status;
    const previousIndex = TRANSPORT_STATUS_SEQUENCE.indexOf(previousStatus);
    const nextIndex = TRANSPORT_STATUS_SEQUENCE.indexOf(status);

    if (previousStatus === 'delivered') {
      throw httpError(400, 'Delivered transports cannot be updated.');
    }
    if (nextIndex !== previousIndex + 1) {
      throw httpError(400, `Invalid transport status transition from ${previousStatus} to ${status}.`);
    }

    const packageDoc = await Package.findById(transport.packageId).populate('orderId').session(session);
    const batchWarehouseMap = packageDoc
      ? await ensurePackageWarehouseAccess(packageDoc, assignedWarehouseId, session)
      : new Map();

    transport.status = status;
    if (notes) transport.notes = notes;

    // Update timestamps based on status
    if (status === "delivered") {
      transport.deliveredAt = new Date();
    }

    // Add to status history
    transport.statusHistory.push({
      status: status,
      timestamp: new Date(),
      notes: notes,
      updatedBy: req.user._id
    });

    await transport.save({ session });

    // Reverse transports are return pickups; return.controller owns return receipt processing.
    if (packageDoc && transport.transportType === "forward") {
      if (status === "in_transit") {
        packageDoc.packageStatus = 'in_transit';
        packageDoc.orderId.orderStatus = 'dispatched';
      } else if (status === "delivered") {
        packageDoc.packageStatus = 'delivered';
        packageDoc.orderId.orderStatus = 'delivered';

        if (Array.isArray(packageDoc.allocatedItems)) {
          for (const alloc of packageDoc.allocatedItems) {
            if (Array.isArray(alloc.itemIds) && alloc.itemIds.length > 0) {
              const warehouseId = batchWarehouseMap.get(normalizeId(alloc.batchId));
              const transitionResult = await transitionItemsStatus({
                itemIds: alloc.itemIds,
                fromStatus: 'dispatched',
                toStatus: 'delivered',
                actorId: req.user?._id,
                warehouseId,
                location: 'Customer',
                notes: `Delivered via package ${packageDoc.packageId}`,
                referenceType: 'Package',
                referenceId: packageDoc._id,
                movementType: 'delivery',
                session
              });

              if (transitionResult.modifiedCount !== alloc.itemIds.length) {
                throw httpError(409, 'Package items changed while moving from dispatched to delivered.');
              }
            }
          }
        }
      }

      await packageDoc.save({ session });
      await packageDoc.orderId.save({ session });
    }

    await session.commitTransaction();

    res.status(200).json({
      message: "Transport status updated successfully",
      transport,
      previousStatus,
      newStatus: status
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(error.statusCode || 400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Get transports by package ID
export const getTransportsByPackageId = catchAsyncErrors(async (req, res) => {
  const { packageId } = req.params;
  const assignedWarehouseId = getAssignedWarehouseId(req);

  const packageDoc = await Package.findById(packageId);
  if (!packageDoc) {
    return res.status(404).json({ message: "Package not found" });
  }

  try {
    await ensurePackageWarehouseAccess(packageDoc, assignedWarehouseId);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message });
  }

  const transports = await Transport.find({ packageId })
    .populate('transporterId', 'fullName companyName')
    .populate('assignedBy', 'fullName')
    .sort({ createdAt: -1 });

  res.status(200).json({ transports });
});
