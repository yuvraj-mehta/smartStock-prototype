// models/SalesHistory.js
import mongoose from "mongoose";

const SalesHistorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    saleDate: {
      type: Date,
      default: Date.now,
    },
    action: {
      type: String,
      enum: ["dispatched", "returned"],
      required: true,
    },
    referenceItemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
      },
    ],
    notes: {
      type: String,
    },
    packageId: {
      type: String,
      required: function () { return this.action === "dispatched"; },
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

export const SalesHistory = mongoose.model("SalesHistory", SalesHistorySchema);