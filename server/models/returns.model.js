import mongoose from "mongoose";

const returnSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
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
    returnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // or ExternalUser
    },
    reason: {
      type: String,
      required: true,
    },
    referenceItemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
      },
    ],
    returnDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export const Return = mongoose.model("Return", returnSchema);