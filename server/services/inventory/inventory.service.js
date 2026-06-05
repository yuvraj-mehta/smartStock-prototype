import { Batch } from "../../models/batch.model.js";
import { Inventory } from "../../models/inventory.model.js";
import { InventoryMovement } from "../../models/inventoryMovement.model.js";
import { Item, ITEM_HISTORY_ACTIONS, ITEM_STATUSES } from "../../models/item.model.js";

export const STOCK_COUNT_STATUS = "in_stock";

export const ITEM_STATUS_TRANSITIONS = Object.freeze({
  in_stock: Object.freeze(["allocated", "dispatched", "damaged"]),
  allocated: Object.freeze(["in_stock", "packed", "dispatched", "delivered", "returned", "damaged"]),
  packed: Object.freeze(["shipped", "dispatched", "delivered", "returned", "damaged"]),
  shipped: Object.freeze(["dispatched", "delivered", "returned", "damaged"]),
  dispatched: Object.freeze(["delivered", "returned", "damaged"]),
  delivered: Object.freeze(["in_stock", "returned", "damaged"]),
  returned: Object.freeze(["in_stock", "damaged"]),
  damaged: Object.freeze([]),
});

export const createInventoryError = (statusCode, message, details) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (details) error.details = details;
  return error;
};

export const normalizeId = (id) => (id?._id || id)?.toString();

const isClientSession = (value) => Boolean(value && typeof value.endSession === "function");

const isOptionsObject = (value) => (
  Boolean(value) &&
  typeof value === "object" &&
  !isClientSession(value) &&
  !value._bsontype &&
  typeof value.toHexString !== "function" &&
  !value._id
);

const normalizeOptions = (options = {}) => {
  if (isClientSession(options)) return { session: options };
  return options || {};
};

export const runWithOptionalSession = (query, session) => (session ? query.session(session) : query);

export const assertItemStatus = (status) => {
  if (!ITEM_STATUSES.includes(status)) {
    throw createInventoryError(400, `Unsupported item status: ${status}`);
  }
  return status;
};

export const assertItemHistoryAction = (action) => {
  if (!ITEM_HISTORY_ACTIONS.includes(action)) {
    throw createInventoryError(400, `Unsupported item history action: ${action}`);
  }
  return action;
};

export const getAllowedNextStatuses = (fromStatus, transitionMap = ITEM_STATUS_TRANSITIONS) => {
  assertItemStatus(fromStatus);
  return transitionMap[fromStatus] || [];
};

export const validateItemStatusTransition = (fromStatus, toStatus, options = {}) => {
  const { allowSameStatus = false, transitionMap = ITEM_STATUS_TRANSITIONS } = options;

  assertItemStatus(fromStatus);
  assertItemStatus(toStatus);

  if (fromStatus === toStatus) {
    if (allowSameStatus) return { fromStatus, toStatus, allowed: true };
    throw createInventoryError(400, `Item is already ${toStatus}.`);
  }

  const allowedStatuses = getAllowedNextStatuses(fromStatus, transitionMap);
  if (!allowedStatuses.includes(toStatus)) {
    throw createInventoryError(
      400,
      `Invalid item status transition from ${fromStatus} to ${toStatus}.`,
      { fromStatus, toStatus, allowedStatuses }
    );
  }

  return { fromStatus, toStatus, allowed: true };
};

export const getHistoryActionForTransition = (fromStatus, toStatus, action) => {
  if (action) return assertItemHistoryAction(action);
  if (toStatus === STOCK_COUNT_STATUS) return "returned";
  return assertItemHistoryAction(toStatus);
};

const buildItemFilter = ({ batchId, productId, warehouseId, status, statuses, itemIds } = {}) => {
  const filter = {};
  if (batchId) filter.batchId = batchId;
  if (productId) filter.productId = productId;
  if (warehouseId) filter.currentWarehouseId = warehouseId;
  if (itemIds?.length) filter._id = { $in: itemIds };

  const statusFilter = statuses || status;
  if (Array.isArray(statusFilter)) {
    filter.status = { $in: statusFilter };
  } else if (statusFilter) {
    filter.status = statusFilter;
  }

  return filter;
};

export const countItemsByStatus = async (filter = {}, options = {}) => {
  const { session } = normalizeOptions(options);
  return runWithOptionalSession(Item.countDocuments(buildItemFilter(filter)), session);
};

export const getItemStatusCounts = async (filter = {}, options = {}) => {
  const { session } = normalizeOptions(options);
  const [match] = [buildItemFilter(filter)];

  const rows = await runWithOptionalSession(
    Item.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    session
  );

  const counts = ITEM_STATUSES.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {});

  for (const row of rows) {
    counts[row._id] = row.count;
  }

  counts.total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return counts;
};

export const getInventoryValueForBatch = async (batchId, options = {}) => {
  const {
    session,
    status = STOCK_COUNT_STATUS,
    warehouseId,
    scopeByItemWarehouse = false,
  } = normalizeOptions(options);

  const itemFilter = buildItemFilter({
    batchId,
    status,
    warehouseId: scopeByItemWarehouse ? warehouseId : undefined,
  });

  const items = await runWithOptionalSession(
    Item.find(itemFilter).select("purchasePrice").lean(),
    session
  );

  const knownValue = items.reduce((sum, item) => (
    typeof item.purchasePrice === "number" ? sum + item.purchasePrice : sum
  ), 0);
  const missingPriceCount = items.filter((item) => typeof item.purchasePrice !== "number").length;

  if (missingPriceCount === 0) return knownValue;

  const batch = await runWithOptionalSession(Batch.findById(batchId).select("unitCost").lean(), session);
  return knownValue + ((batch?.unitCost || 0) * missingPriceCount);
};

export const getBatchInventoryMetrics = async (batchId, options = {}) => {
  const normalizedOptions = normalizeOptions(options);
  const { warehouseId, scopeByItemWarehouse = false } = normalizedOptions;
  const statusCounts = await getItemStatusCounts({
    batchId,
    warehouseId: scopeByItemWarehouse ? warehouseId : undefined,
  }, normalizedOptions);
  const inventoryValue = await getInventoryValueForBatch(batchId, normalizedOptions);

  return {
    batchId,
    quantity: statusCounts[STOCK_COUNT_STATUS],
    inventoryValue,
    statusCounts,
  };
};

export const resolveWarehouseIdForBatch = async (batchId, options = {}) => {
  const { session, warehouseId } = normalizeOptions(options);
  if (warehouseId) return warehouseId;

  const batch = await runWithOptionalSession(Batch.findById(batchId).select("warehouseId").lean(), session);
  if (batch?.warehouseId) return batch.warehouseId;

  const item = await runWithOptionalSession(
    Item.findOne({ batchId }).select("currentWarehouseId").sort({ updatedAt: -1 }).lean(),
    session
  );
  if (item?.currentWarehouseId) return item.currentWarehouseId;

  throw createInventoryError(400, "Warehouse ID is required to synchronize inventory.");
};

const parseSyncArguments = (warehouseIdOrOptions, maybeOptions) => {
  if (isClientSession(warehouseIdOrOptions)) {
    return {
      warehouseId: undefined,
      options: normalizeOptions(warehouseIdOrOptions),
    };
  }

  if (isOptionsObject(warehouseIdOrOptions)) {
    return {
      warehouseId: warehouseIdOrOptions.warehouseId,
      options: normalizeOptions(warehouseIdOrOptions),
    };
  }

  return {
    warehouseId: warehouseIdOrOptions,
    options: normalizeOptions(maybeOptions),
  };
};

export const syncInventoryForBatch = async (batchId, warehouseIdOrOptions, maybeOptions) => {
  const { warehouseId, options } = parseSyncArguments(warehouseIdOrOptions, maybeOptions);
  const {
    session,
    scopeByItemWarehouse = false,
  } = options;

  const resolvedWarehouseId = await resolveWarehouseIdForBatch(batchId, {
    ...options,
    warehouseId,
  });

  const quantity = await countItemsByStatus(
    {
      batchId,
      status: STOCK_COUNT_STATUS,
      warehouseId: scopeByItemWarehouse ? resolvedWarehouseId : undefined,
    },
    { session }
  );
  const inventoryValue = await getInventoryValueForBatch(batchId, {
    session,
    warehouseId: resolvedWarehouseId,
    scopeByItemWarehouse,
  });

  const inventory = await Inventory.findOneAndUpdate(
    { batchId, warehouseId: resolvedWarehouseId },
    {
      $set: { quantity, inventoryValue },
      $setOnInsert: { batchId, warehouseId: resolvedWarehouseId },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, session }
  );

  return {
    batchId,
    warehouseId: resolvedWarehouseId,
    quantity,
    inventoryValue,
    inventory,
  };
};

export const recordInventoryMovement = async (movement, options = {}) => {
  const { session } = normalizeOptions(options);
  const [createdMovement] = await InventoryMovement.create([
    {
      ...movement,
      quantity: movement.quantity || 1,
    },
  ], { session });

  return createdMovement;
};

const getMovementTypeForStatus = (status) => {
  const movementTypesByStatus = {
    allocated: "allocation",
    packed: "packing",
    shipped: "shipping",
    dispatched: "dispatch",
    delivered: "delivery",
    returned: "return",
    damaged: "damage",
  };

  return movementTypesByStatus[status] || "status_transition";
};

const buildHistoryEntry = ({ action, location, notes, date = new Date() }) => ({
  action,
  date,
  location: location || "Unknown",
  notes: notes || `Item ${action}`,
});

const buildMovementFromItem = (item, movementDetails) => ({
  itemId: item._id,
  batchId: item.batchId,
  productId: item.productId,
  warehouseId: movementDetails.toWarehouseId || movementDetails.warehouseId || item.currentWarehouseId,
  fromWarehouseId: movementDetails.fromWarehouseId || item.currentWarehouseId,
  toWarehouseId: movementDetails.toWarehouseId || movementDetails.warehouseId || item.currentWarehouseId,
  fromStatus: movementDetails.fromStatus,
  toStatus: movementDetails.toStatus,
  action: movementDetails.action,
  movementType: movementDetails.movementType || getMovementTypeForStatus(movementDetails.toStatus),
  actorId: movementDetails.actorId,
  referenceType: movementDetails.referenceType,
  referenceId: movementDetails.referenceId,
  notes: movementDetails.notes,
  metadata: movementDetails.metadata,
});

const syncAffectedWarehouses = async (batchId, warehouseIds, options = {}) => {
  const syncResults = [];
  const uniqueWarehouseIds = [...new Set(warehouseIds.map(normalizeId).filter(Boolean))];

  for (const warehouseId of uniqueWarehouseIds) {
    syncResults.push(await syncInventoryForBatch(batchId, warehouseId, {
      ...options,
      scopeByItemWarehouse: true,
    }));
  }

  return syncResults;
};

const resolveItem = async (itemOrId, session) => {
  if (itemOrId && typeof itemOrId.save === "function") return itemOrId;
  return runWithOptionalSession(Item.findById(itemOrId), session);
};

export const transitionItemStatus = async (itemOrId, toStatus, options = {}) => {
  const {
    session,
    allowSameStatus = false,
    actorId,
    warehouseId,
    toWarehouseId,
    location,
    notes,
    referenceType,
    referenceId,
    movementType,
    metadata,
    historyAction,
    syncInventory = true,
  } = normalizeOptions(options);

  assertItemStatus(toStatus);

  const item = await resolveItem(itemOrId, session);
  if (!item) throw createInventoryError(404, "Item not found.");

  const fromStatus = item.status;
  validateItemStatusTransition(fromStatus, toStatus, { allowSameStatus });

  if (fromStatus === toStatus) {
    return { item, fromStatus, toStatus, skipped: true };
  }

  const action = getHistoryActionForTransition(fromStatus, toStatus, historyAction);
  const fromWarehouseId = item.currentWarehouseId || warehouseId;
  const resolvedToWarehouseId = toWarehouseId || warehouseId || item.currentWarehouseId;
  const historyEntry = buildHistoryEntry({
    action,
    location: location || normalizeId(resolvedToWarehouseId),
    notes,
  });

  item.status = toStatus;
  if (resolvedToWarehouseId) item.currentWarehouseId = resolvedToWarehouseId;
  item.history.push(historyEntry);
  await item.save({ session });

  const movement = await recordInventoryMovement(
    buildMovementFromItem(item, {
      fromStatus,
      toStatus,
      action,
      warehouseId,
      fromWarehouseId,
      toWarehouseId: resolvedToWarehouseId,
      actorId,
      referenceType,
      referenceId,
      movementType,
      notes: historyEntry.notes,
      metadata,
    }),
    { session }
  );

  const inventorySyncs = syncInventory
    ? await syncAffectedWarehouses(item.batchId, [fromWarehouseId, resolvedToWarehouseId], { session })
    : [];

  return { item, movement, inventorySyncs, fromStatus, toStatus };
};

export const transitionItemsStatus = async ({
  itemIds,
  filter = {},
  fromStatus,
  toStatus,
  quantity,
  allowSameStatus = false,
  actorId,
  warehouseId,
  toWarehouseId,
  location,
  notes,
  referenceType,
  referenceId,
  movementType,
  metadata,
  historyAction,
  syncInventory = true,
  session,
} = {}) => {
  assertItemStatus(toStatus);
  if (fromStatus) assertItemStatus(fromStatus);

  const itemFilterInput = { ...filter, itemIds };
  if (fromStatus) itemFilterInput.status = fromStatus;
  const itemFilter = buildItemFilter(itemFilterInput);

  let itemQuery = Item.find(itemFilter).sort({ createdAt: 1 });
  if (quantity) itemQuery = itemQuery.limit(quantity);
  const items = await runWithOptionalSession(itemQuery, session);

  if (quantity && items.length < quantity) {
    throw createInventoryError(400, `Only ${items.length} matching item(s) are available.`);
  }

  const actionableItems = [];
  for (const item of items) {
    validateItemStatusTransition(item.status, toStatus, { allowSameStatus });
    if (item.status !== toStatus) actionableItems.push(item);
  }

  if (actionableItems.length === 0) {
    return { modifiedCount: 0, items, movements: [], inventorySyncs: [] };
  }

  const action = getHistoryActionForTransition(actionableItems[0].status, toStatus, historyAction);
  const historyEntry = buildHistoryEntry({
    action,
    location: location || normalizeId(toWarehouseId || warehouseId),
    notes,
  });

  const bulkOperations = actionableItems.map((item) => ({
    updateOne: {
      filter: { _id: item._id, status: item.status },
      update: {
        $set: {
          status: toStatus,
          ...(toWarehouseId || warehouseId ? { currentWarehouseId: toWarehouseId || warehouseId } : {}),
        },
        $push: { history: historyEntry },
      },
    },
  }));

  const result = await Item.bulkWrite(bulkOperations, { session });
  const modifiedCount = result.modifiedCount ?? result.nModified ?? 0;
  if (modifiedCount !== actionableItems.length) {
    throw createInventoryError(409, "Inventory changed while updating item statuses.");
  }

  const movementDocs = actionableItems.map((item) => buildMovementFromItem(item, {
    fromStatus: item.status,
    toStatus,
    action,
    warehouseId,
    fromWarehouseId: item.currentWarehouseId || warehouseId,
    toWarehouseId: toWarehouseId || warehouseId || item.currentWarehouseId,
    actorId,
    referenceType,
    referenceId,
    movementType,
    notes: historyEntry.notes,
    metadata,
  }));

  const movements = await InventoryMovement.insertMany(movementDocs, { session });
  const inventorySyncs = [];

  if (syncInventory) {
    const pairs = new Map();
    for (const item of actionableItems) {
      const batchId = normalizeId(item.batchId);
      const fromWarehouse = normalizeId(item.currentWarehouseId || warehouseId);
      const targetWarehouse = normalizeId(toWarehouseId || warehouseId || item.currentWarehouseId);
      if (fromWarehouse) pairs.set(`${batchId}:${fromWarehouse}`, { batchId: item.batchId, warehouseId: fromWarehouse });
      if (targetWarehouse) pairs.set(`${batchId}:${targetWarehouse}`, { batchId: item.batchId, warehouseId: targetWarehouse });
    }

    for (const pair of pairs.values()) {
      inventorySyncs.push(await syncInventoryForBatch(pair.batchId, pair.warehouseId, {
        session,
        scopeByItemWarehouse: true,
      }));
    }
  }

  return { modifiedCount, items: actionableItems, movements, inventorySyncs };
};

export default {
  ITEM_STATUS_TRANSITIONS,
  STOCK_COUNT_STATUS,
  assertItemHistoryAction,
  assertItemStatus,
  countItemsByStatus,
  createInventoryError,
  getAllowedNextStatuses,
  getBatchInventoryMetrics,
  getHistoryActionForTransition,
  getInventoryValueForBatch,
  getItemStatusCounts,
  normalizeId,
  recordInventoryMovement,
  resolveWarehouseIdForBatch,
  runWithOptionalSession,
  syncInventoryForBatch,
  transitionItemStatus,
  transitionItemsStatus,
  validateItemStatusTransition,
};
