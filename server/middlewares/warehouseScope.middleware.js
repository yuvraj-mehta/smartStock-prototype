import mongoose from 'mongoose';

export const WAREHOUSE_ACCESS_DENIED_MESSAGE = 'Access denied for this warehouse.';
export const USER_WAREHOUSE_REQUIRED_MESSAGE = 'User is not assigned to any valid warehouse.';

export const normalizeId = (id) => (id?._id || id)?.toString();

const createScopeError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

export const getAssignedWarehouseId = (req) =>
  normalizeId(req.user?.assignedWarehouseId || req.assignedWarehouseId);

export const toMongoId = (id) => {
  const normalizedId = normalizeId(id);
  if (!normalizedId || !mongoose.Types.ObjectId.isValid(normalizedId)) {
    return null;
  }

  return new mongoose.Types.ObjectId(normalizedId);
};

export const getAssignedWarehouseObjectId = (req) => toMongoId(getAssignedWarehouseId(req));

export const requireAssignedWarehouseId = (req) => {
  const assignedWarehouseId = getAssignedWarehouseId(req);
  if (!assignedWarehouseId || !mongoose.Types.ObjectId.isValid(assignedWarehouseId)) {
    throw createScopeError(400, USER_WAREHOUSE_REQUIRED_MESSAGE);
  }

  return assignedWarehouseId;
};

export const assertWarehouseAccess = (req, warehouseId) => {
  const assignedWarehouseId = requireAssignedWarehouseId(req);
  const requestedWarehouseId = normalizeId(warehouseId);

  if (!requestedWarehouseId || !mongoose.Types.ObjectId.isValid(requestedWarehouseId)) {
    throw createScopeError(400, 'Warehouse ID must be a valid Mongo ID.');
  }

  if (requestedWarehouseId !== assignedWarehouseId) {
    throw createScopeError(403, WAREHOUSE_ACCESS_DENIED_MESSAGE);
  }

  return assignedWarehouseId;
};
