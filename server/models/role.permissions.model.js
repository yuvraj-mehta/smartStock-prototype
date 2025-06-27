import mongoose from "mongoose";

const rolePermissions = new mongoose.Schema ({
  admin: {
    canManageUsers: true,
    canEditAllProducts: true,
    canViewAuditLogs: true,
  },
  staff: {
    canEditProductQuantity: true,
    canViewAlerts: true,
    canToggleProductStatus: true,
  },
  viewer: {
    canViewEverything: true,
  }
});

export const RolePermissions = mongoose.model("RolePermissions", rolePermissions);
