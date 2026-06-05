import mongoose from "mongoose";

export const ITEM_STATUSES = Object.freeze([
  "in_stock",
  "allocated",
  "packed",
  "shipped",
  "dispatched",
  "delivered",
  "returned",
  "damaged",
]);

export const ITEM_HISTORY_ACTIONS = Object.freeze([
  "added",
  "allocated",
  "packed",
  "shipped",
  "dispatched",
  "delivered",
  "returned",
  "damaged",
]);

const itemSchema = new mongoose.Schema(
  {
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
    serialNumber: {
      type: String,
      unique: true,
      required: true,
    },
    currentWarehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
    },
    status: {
      type: String,
      enum: ITEM_STATUSES,
      default: "in_stock",
    },
    history: [
      {
        action: {
          type: String,
          enum: ITEM_HISTORY_ACTIONS,
        },
        date: { type: Date, default: Date.now },
        location: { type: String },
        notes: { type: String },
      },
    ],
    // Financial Tracking (optional)
    purchasePrice: {
      type: Number,
      min: 0,
      required: false
    }
  },
  { timestamps: true }
);

itemSchema.index({ batchId: 1, status: 1 });
itemSchema.index({ productId: 1, status: 1 });

export const Item = mongoose.model("Item", itemSchema);
