import mongoose from "mongoose";
import { ITEM_HISTORY_ACTIONS, ITEM_STATUSES } from "./item.model.js";

export const INVENTORY_MOVEMENT_TYPES = Object.freeze([
  "receipt",
  "allocation",
  "packing",
  "shipping",
  "dispatch",
  "delivery",
  "return",
  "damage",
  "adjustment",
  "status_transition",
  "stock_sync",
]);

const inventoryMovementSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
    },
    fromWarehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
    },
    toWarehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
    },
    fromStatus: {
      type: String,
      enum: ITEM_STATUSES,
    },
    toStatus: {
      type: String,
      enum: ITEM_STATUSES,
      required: true,
    },
    action: {
      type: String,
      enum: ITEM_HISTORY_ACTIONS,
      required: true,
    },
    movementType: {
      type: String,
      enum: INVENTORY_MOVEMENT_TYPES,
      default: "status_transition",
    },
    quantity: {
      type: Number,
      min: 1,
      default: 1,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    referenceType: {
      type: String,
      trim: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    notes: {
      type: String,
      trim: true,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

inventoryMovementSchema.index({ itemId: 1, createdAt: -1 });
inventoryMovementSchema.index({ batchId: 1, toStatus: 1, createdAt: -1 });
inventoryMovementSchema.index({ productId: 1, toStatus: 1, createdAt: -1 });
inventoryMovementSchema.index({ warehouseId: 1, createdAt: -1 });
inventoryMovementSchema.index({ referenceType: 1, referenceId: 1 });

export const InventoryMovement = mongoose.model("InventoryMovement", inventoryMovementSchema);
