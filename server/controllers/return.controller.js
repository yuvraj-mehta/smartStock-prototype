import { Return, Package, Batch, Transport, ExternalUser } from "../models/index.js";
import { catchAsyncErrors } from "../middlewares/index.js";
import mongoose from "mongoose";
import { logAudit } from '../utils/auditLogger.js';
import { transitionItemsStatus } from "../services/inventory/index.js";

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const runWithOptionalSession = (query, session) => (session ? query.session(session) : query);

const normalizeId = (id) => (id?._id || id)?.toString();

const getAssignedWarehouseId = (req) => normalizeId(req.user?.assignedWarehouseId);

const returnDispositionValues = ['restock', 'damaged', 'defective', 'quality_issue'];
const nonRestockReturnReasons = new Set(['defective', 'damaged', 'quality_issue']);
const nonRestockDispositions = new Set(['defective', 'damaged', 'quality_issue']);
const normalizeString = (value) => (typeof value === "string" ? value.trim() : value);

const defaultDispositionForReason = (returnReason) =>
  nonRestockReturnReasons.has(normalizeString(returnReason)) ? normalizeString(returnReason) : 'restock';

const normalizeDisposition = (disposition, returnReason) => {
  const normalizedDisposition = normalizeString(disposition) || defaultDispositionForReason(returnReason);

  if (!returnDispositionValues.includes(normalizedDisposition)) {
    throw httpError(400, "Returned item disposition is invalid.");
  }

  return normalizedDisposition;
};

const formatDisposition = (disposition) => disposition.replace("_", " ");

const requiresExplicitItemIds = (returnReason, disposition) =>
  nonRestockReturnReasons.has(normalizeString(returnReason)) ||
  nonRestockDispositions.has(disposition);

const uniqueIds = (ids) => [...new Set(ids.filter(Boolean).map(normalizeId).filter(Boolean))];

const allocationKey = (item) => `${normalizeId(item.productId)}:${normalizeId(item.batchId)}`;

const addQuantity = (quantities, key, quantity) => {
  if (quantity <= 0) return;
  quantities.set(key, (quantities.get(key) || 0) + quantity);
};

const getAllocationItemIds = (item) => uniqueIds(item?.itemIds || []);

const getAllocationQuantity = (item) => {
  const itemIds = getAllocationItemIds(item);
  return itemIds.length || Number(item?.quantity) || 0;
};

const createReturnAllocationState = () => ({
  returnedItemIds: new Set(),
  itemlessQuantitiesByAllocation: new Map(),
  totalQuantitiesByAllocation: new Map(),
});

const recordReturnedItemInState = (state, returnedItem) => {
  const key = allocationKey(returnedItem);
  const itemIds = getAllocationItemIds(returnedItem);
  const quantity = Number(returnedItem.quantity) || itemIds.length;

  addQuantity(state.totalQuantitiesByAllocation, key, quantity);

  if (itemIds.length > 0) {
    itemIds.forEach((itemId) => state.returnedItemIds.add(itemId));
  } else {
    addQuantity(state.itemlessQuantitiesByAllocation, key, quantity);
  }
};

const buildReturnAllocationState = (returnRecords = []) => {
  const state = createReturnAllocationState();

  for (const returnRecord of returnRecords) {
    for (const returnedItem of returnRecord?.returnedItems || []) {
      recordReturnedItemInState(state, returnedItem);
    }
  }

  return state;
};

const getAvailablePackageItemIds = (packageItem, returnState) => {
  const packageItemIds = getAllocationItemIds(packageItem);
  if (packageItemIds.length === 0) return [];

  const key = allocationKey(packageItem);
  const availableAfterExplicitReturns = packageItemIds.filter(
    (itemId) => !returnState.returnedItemIds.has(itemId)
  );
  const reservedItemlessQuantity = returnState.itemlessQuantitiesByAllocation.get(key) || 0;
  const reservedItemlessItemIds = new Set(availableAfterExplicitReturns.slice(0, reservedItemlessQuantity));

  return availableAfterExplicitReturns.filter((itemId) => !reservedItemlessItemIds.has(itemId));
};

const getRemainingReturnQuantity = (packageItem, returnState) => {
  const availableItemIds = getAvailablePackageItemIds(packageItem, returnState);
  if (availableItemIds.length > 0 || getAllocationItemIds(packageItem).length > 0) {
    const remainingByQuantity = getAllocationQuantity(packageItem) -
      (returnState.totalQuantitiesByAllocation.get(allocationKey(packageItem)) || 0);
    return Math.max(0, Math.min(availableItemIds.length, remainingByQuantity));
  }

  const allocatedQuantity = Number(packageItem.quantity) || 0;
  const returnedQuantity = returnState.totalQuantitiesByAllocation.get(allocationKey(packageItem)) || 0;
  return Math.max(0, allocatedQuantity - returnedQuantity);
};

const returnCoversFullPackageAllocation = (packageDoc, returnState) => {
  const allocatedItems = packageDoc.allocatedItems || [];
  if (allocatedItems.length === 0) return false;

  return allocatedItems.every((item) => {
    const allocatedQuantity = getAllocationQuantity(item);
    if (allocatedQuantity <= 0) return false;

    const returnedQuantity = returnState.totalQuantitiesByAllocation.get(allocationKey(item)) || 0;
    return returnedQuantity >= allocatedQuantity;
  });
};

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

const ensureReturnWarehouseAccess = (returnRecord, assignedWarehouseId) => {
  if (
    assignedWarehouseId &&
    normalizeId(returnRecord.warehouseId) !== assignedWarehouseId.toString()
  ) {
    throw httpError(403, "Access denied for this warehouse.");
  }
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

const normalizeReturnedItems = (returnedItems, packageDoc, returnReason, returnState) => {
  const usedItemIds = new Set();

  return returnedItems.map((returnItem) => {
    const quantity = Number(returnItem.quantity);
    const disposition = normalizeDisposition(returnItem.disposition, returnReason);
    const packageItem = packageDoc.allocatedItems.find(
      (item) => normalizeId(item.productId) === normalizeId(returnItem.productId) &&
        normalizeId(item.batchId) === normalizeId(returnItem.batchId)
    );

    if (!packageItem) {
      throw httpError(400, `Product not found in original package: ${returnItem.productId}`);
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      throw httpError(400, `Return quantity is invalid for product: ${returnItem.productId}`);
    }

    const packageItemIds = getAllocationItemIds(packageItem);
    const availablePackageItemIds = getAvailablePackageItemIds(packageItem, returnState);
    const remainingQuantity = getRemainingReturnQuantity(packageItem, returnState);

    if (quantity > remainingQuantity) {
      throw httpError(400, `Return quantity exceeds remaining returnable quantity for product: ${returnItem.productId}`);
    }

    const hasExplicitItemIds = Array.isArray(returnItem.itemIds) && returnItem.itemIds.length > 0;

    if (requiresExplicitItemIds(returnReason, disposition) && !hasExplicitItemIds) {
      const itemIdReason = nonRestockDispositions.has(disposition) ? disposition : normalizeString(returnReason);
      throw httpError(
        400,
        `Returned item IDs are required for ${formatDisposition(itemIdReason)} returns for product: ${returnItem.productId}`
      );
    }

    const requestedItemIds = hasExplicitItemIds
      ? returnItem.itemIds.map(normalizeId).filter(Boolean)
      : packageItemIds.length > 0
        ? availablePackageItemIds.slice(0, quantity)
        : [];

    if (requestedItemIds.length !== quantity) {
      throw httpError(400, `Return item IDs do not match quantity for product: ${returnItem.productId}`);
    }

    if (new Set(requestedItemIds).size !== requestedItemIds.length) {
      throw httpError(400, "Duplicate returned item IDs are not allowed.");
    }

    const hasUnknownItem = requestedItemIds.some((itemId) => !packageItemIds.includes(itemId));
    if (hasUnknownItem) {
      throw httpError(400, `Returned item does not belong to original package: ${returnItem.productId}`);
    }

    const hasAlreadyReturnedItem = requestedItemIds.some((itemId) => !availablePackageItemIds.includes(itemId));
    if (hasAlreadyReturnedItem) {
      throw httpError(409, "Returned item has already been returned.");
    }

    const hasDuplicateItem = requestedItemIds.some((itemId) => usedItemIds.has(itemId));
    if (hasDuplicateItem) {
      throw httpError(400, "Duplicate returned item IDs are not allowed.");
    }

    requestedItemIds.forEach((itemId) => usedItemIds.add(itemId));

    const normalizedItem = {
      productId: returnItem.productId,
      batchId: returnItem.batchId,
      quantity,
      disposition,
      itemIds: requestedItemIds
    };

    recordReturnedItemInState(returnState, normalizedItem);

    return normalizedItem;
  });
};

// Initiate return within 10 days of delivery
export const initiateReturn = catchAsyncErrors(async (req, res) => {
  const { packageId, returnedItems, returnReason, notes } = req.body;
  const assignedWarehouseId = getAssignedWarehouseId(req);

  // Validate input
  if (!packageId || !returnedItems || returnedItems.length === 0 || !returnReason) {
    return res.status(400).json({ message: "Package ID, returned items, and return reason are required" });
  }

  if (!assignedWarehouseId || !mongoose.Types.ObjectId.isValid(assignedWarehouseId)) {
    return res.status(400).json({ message: "User is not assigned to any valid warehouse." });
  }

  const session = await mongoose.startSession();
  let returnRecord;

  try {
    session.startTransaction();

    const existingReturns = await Return.find({ packageId }).session(session);
    const returnState = buildReturnAllocationState(existingReturns);

    const packageDoc = await Package.findById(packageId).populate('orderId').session(session);
    if (!packageDoc) {
      throw httpError(404, "Package not found");
    }

    await ensurePackageWarehouseAccess(packageDoc, assignedWarehouseId, session);

    if (packageDoc.packageStatus !== 'delivered') {
      throw httpError(400, "Package is not delivered yet");
    }

    // Check if return is within 10 days
    const transport = await Transport.findOne({ packageId: packageDoc._id }).session(session);
    if (!transport || !transport.deliveredAt) {
      throw httpError(400, "Delivery date not found");
    }

    const deliveryDate = new Date(transport.deliveredAt);
    const daysSinceDelivery = Math.floor((new Date() - deliveryDate) / (1000 * 60 * 60 * 24));

    if (daysSinceDelivery > 10) {
      throw httpError(400, "Return window has expired (10 days)");
    }

    const normalizedReturnedItems = normalizeReturnedItems(returnedItems, packageDoc, returnReason, returnState);
    const isFullPackageReturn = returnCoversFullPackageAllocation(packageDoc, returnState);

    [returnRecord] = await Return.create([{
      packageId: packageDoc._id,
      orderId: packageDoc.orderId._id,
      returnedItems: normalizedReturnedItems,
      returnReason,
      returnStatus: 'initiated',
      warehouseId: assignedWarehouseId,
      notes
    }], { session });

    if (isFullPackageReturn) {
      packageDoc.packageStatus = 'returned';
      packageDoc.orderId.orderStatus = 'returned';
      await packageDoc.save({ session });
      await packageDoc.orderId.save({ session });
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    return res.status(error.statusCode || 400).json({ message: error.message });
  } finally {
    session.endSession();
  }

  // Audit log for return creation
  await logAudit({
    userId: req.user?._id,
    action: 'CREATE_RETURN',
    entityType: 'Return',
    entityId: returnRecord._id,
    value: returnedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    details: { packageId, returnedItems: returnRecord.returnedItems, returnReason, notes }
  });

  res.status(201).json({
    message: "Return initiated successfully",
    return: returnRecord
  });
});

// Schedule pickup for return
export const schedulePickup = catchAsyncErrors(async (req, res) => {
  const { returnId } = req.params;
  const { transporterId, notes } = req.body;
  const assignedWarehouseId = getAssignedWarehouseId(req);

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const returnRecord = await Return.findById(returnId).populate('packageId').session(session);
    if (!returnRecord) {
      throw httpError(404, "Return not found");
    }

    ensureReturnWarehouseAccess(returnRecord, assignedWarehouseId);

    if (returnRecord.returnStatus !== 'initiated') {
      throw httpError(400, "Return is not in initiated status");
    }

    await ensureTransporterWarehouseAccess(transporterId, assignedWarehouseId, session);

    const [transport] = await Transport.create([{
      packageId: returnRecord.packageId._id,
      transporterId,
      transportType: 'reverse',
      assignedBy: req.user._id,
      notes
    }], { session });

    returnRecord.returnStatus = 'pickup_scheduled';
    returnRecord.transportId = transport._id;
    await returnRecord.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      message: "Pickup scheduled successfully",
      return: returnRecord,
      transport
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(error.statusCode || 400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Mark return as picked up
export const markPickedUp = catchAsyncErrors(async (req, res) => {
  const { returnId } = req.params;
  const { notes } = req.body;
  const assignedWarehouseId = getAssignedWarehouseId(req);

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const returnRecord = await Return.findById(returnId).populate('transportId').session(session);
    if (!returnRecord) {
      throw httpError(404, "Return not found");
    }

    ensureReturnWarehouseAccess(returnRecord, assignedWarehouseId);

    if (returnRecord.returnStatus !== 'pickup_scheduled') {
      throw httpError(400, "Return is not scheduled for pickup");
    }

    const transport = returnRecord.transportId;
    transport.status = 'in_transit';
    if (notes) transport.notes = notes;
    await transport.save({ session });

    returnRecord.returnStatus = 'picked_up';
    await returnRecord.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      message: "Return marked as picked up successfully",
      return: returnRecord
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(error.statusCode || 400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Process return at warehouse
export const processReturn = catchAsyncErrors(async (req, res) => {
  const { returnId } = req.params;
  const { notes } = req.body;
  const assignedWarehouseId = getAssignedWarehouseId(req);

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const returnRecord = await Return.findById(returnId)
      .populate('packageId')
      .populate('orderId')
      .populate('transportId')
      .session(session);

    if (!returnRecord) {
      throw httpError(404, "Return not found");
    }

    ensureReturnWarehouseAccess(returnRecord, assignedWarehouseId);

    if (returnRecord.returnStatus !== 'picked_up') {
      throw httpError(400, "Return is not picked up yet");
    }

    if (!returnRecord.transportId) {
      throw httpError(400, "Return transport not found");
    }

    const otherReturns = await Return.find({
      packageId: returnRecord.packageId._id,
      _id: { $ne: returnRecord._id || returnId },
    }).session(session);
    const returnState = buildReturnAllocationState(otherReturns);

    // Update transport status
    const transport = returnRecord.transportId;
    transport.status = 'delivered';
    transport.deliveredAt = new Date();
    await transport.save({ session });

    // Update return status
    returnRecord.returnStatus = 'received';
    returnRecord.receivedDate = new Date();
    await returnRecord.save({ session });

    // Process each returned item
    for (const returnedItem of returnRecord.returnedItems) {
      const originalItem = returnRecord.packageId.allocatedItems.find(
        (item) => normalizeId(item.productId) === normalizeId(returnedItem.productId) &&
          normalizeId(item.batchId) === normalizeId(returnedItem.batchId)
      );

      if (!originalItem) continue;

      const disposition = normalizeDisposition(returnedItem.disposition, returnRecord.returnReason);
      returnedItem.disposition = disposition;
      const packageItemIds = getAllocationItemIds(originalItem);
      const availablePackageItemIds = getAvailablePackageItemIds(originalItem, returnState);
      const remainingQuantity = getRemainingReturnQuantity(originalItem, returnState);
      const hasExplicitItemIds = Array.isArray(returnedItem.itemIds) && returnedItem.itemIds.length > 0;
      const quantity = Number(returnedItem.quantity) || 0;

      if (requiresExplicitItemIds(returnRecord.returnReason, disposition) && !hasExplicitItemIds) {
        const itemIdReason = nonRestockDispositions.has(disposition)
          ? disposition
          : normalizeString(returnRecord.returnReason);
        throw httpError(
          400,
          `Returned item IDs are required for ${formatDisposition(itemIdReason)} returns for product: ${returnedItem.productId}`
        );
      }

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > remainingQuantity) {
        throw httpError(400, `Return quantity exceeds remaining returnable quantity for product: ${returnedItem.productId}`);
      }

      if (hasExplicitItemIds && returnedItem.itemIds.length !== quantity) {
        throw httpError(400, `Return item IDs do not match quantity for product: ${returnedItem.productId}`);
      }

      const itemsToUpdate = hasExplicitItemIds
        ? returnedItem.itemIds.slice(0, quantity).map(normalizeId).filter(Boolean)
        : packageItemIds.length > 0
          ? availablePackageItemIds.slice(0, quantity)
          : [];

      if (itemsToUpdate.length < quantity) {
        throw httpError(400, `Return item IDs do not match quantity for product: ${returnedItem.productId}`);
      }

      if (new Set(itemsToUpdate).size !== itemsToUpdate.length) {
        throw httpError(400, "Duplicate returned item IDs are not allowed.");
      }

      const hasUnknownItem = itemsToUpdate.some((itemId) => !packageItemIds.includes(itemId));
      if (hasUnknownItem) {
        throw httpError(400, `Returned item does not belong to original package: ${returnedItem.productId}`);
      }

      const hasAlreadyReturnedItem = itemsToUpdate.some((itemId) => !availablePackageItemIds.includes(itemId));
      if (hasAlreadyReturnedItem) {
        throw httpError(409, "Returned item has already been returned.");
      }

      returnedItem.itemIds = itemsToUpdate;
      recordReturnedItemInState(returnState, {
        productId: returnedItem.productId,
        batchId: returnedItem.batchId,
        quantity,
        itemIds: itemsToUpdate,
      });

      const isRestockDisposition = disposition === 'restock';
      const itemStatus = isRestockDisposition ? 'in_stock' : 'damaged';
      const historyAction = isRestockDisposition ? 'returned' : 'damaged';
      const historyNotes = isRestockDisposition
        ? `Returned from order ${returnRecord.orderId.orderNumber}`
        : `Return disposition ${formatDisposition(disposition)} from order ${returnRecord.orderId.orderNumber}`;

      const transitionResult = await transitionItemsStatus({
        itemIds: itemsToUpdate,
        fromStatus: 'delivered',
        toStatus: itemStatus,
        actorId: req.user?._id,
        warehouseId: returnRecord.warehouseId,
        toWarehouseId: returnRecord.warehouseId,
        location: normalizeId(returnRecord.warehouseId),
        notes: historyNotes,
        referenceType: 'Return',
        referenceId: returnRecord._id,
        movementType: isRestockDisposition ? 'return' : 'damage',
        historyAction,
        session,
      });

      if (transitionResult.modifiedCount !== itemsToUpdate.length) {
        throw httpError(409, `Returned items changed while processing product: ${returnedItem.productId}`);
      }
    }

    // Update return status to processed
    returnRecord.returnStatus = 'processed';
    returnRecord.processedDate = new Date();
    returnRecord.processedBy = req.user._id;
    if (notes) returnRecord.notes = notes;
    await returnRecord.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      message: "Return processed successfully",
      return: returnRecord
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(error.statusCode || 400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Get all returns
export const getAllReturns = catchAsyncErrors(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const assignedWarehouseId = getAssignedWarehouseId(req);

  const filter = {};
  if (status) filter.returnStatus = status;
  if (assignedWarehouseId) filter.warehouseId = assignedWarehouseId;

  const returns = await Return.find(filter)
    .populate({
      path: 'packageId',
      select: 'packageId allocatedItems packageStatus orderId',
      populate: [
        {
          path: 'allocatedItems.productId',
          select: 'productName price sku',
        },
        {
          path: 'allocatedItems.batchId',
          select: 'batchNumber warehouseId',
          populate: { path: 'warehouseId', select: 'warehouseName address' }
        }
      ]
    })
    .populate('orderId', 'orderNumber platformOrderId orderStatus')
    .populate({
      path: 'transportId',
      select: 'trackingNumber status transportType transporterId dispatchedAt deliveredAt',
      populate: { path: 'transporterId', select: 'fullName companyName phone warehouseId' }
    })
    .populate('warehouseId', 'warehouseName address')
    .populate('processedBy', 'fullName')
    .populate('returnedItems.productId', 'productName sku')
    .populate('returnedItems.batchId', 'batchNumber warehouseId')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Return.countDocuments(filter);

  res.status(200).json({
    returns,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    total
  });
});

// Get return by ID
export const getReturnById = catchAsyncErrors(async (req, res) => {
  const { returnId } = req.params;
  const assignedWarehouseId = getAssignedWarehouseId(req);

  const returnRecord = await Return.findById(returnId)
    .populate('packageId')
    .populate('orderId')
    .populate({
      path: 'transportId',
      populate: { path: 'transporterId', select: 'fullName companyName phone warehouseId' }
    })
    .populate('warehouseId', 'warehouseName address')
    .populate('processedBy', 'fullName')
    .populate('returnedItems.productId', 'productName sku')
    .populate('returnedItems.batchId', 'batchNumber warehouseId');

  if (!returnRecord) {
    return res.status(404).json({ message: "Return not found" });
  }

  try {
    ensureReturnWarehouseAccess(returnRecord, assignedWarehouseId);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ message: error.message });
  }

  res.status(200).json({ return: returnRecord });
});
