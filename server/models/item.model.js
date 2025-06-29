import mongoose from "mongoose";

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
      enum: ["in_stock", "dispatched", "returned", "damaged"],
      default: "in_stock",
    },
    history: [
      {
        action: {
          type: String,
          enum: ["added", "dispatched", "returned", "transferred", "damaged"],
        },
        date: { type: Date, default: Date.now },
        location: { type: String },
        notes: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export const Item = mongoose.model("Item", itemSchema);