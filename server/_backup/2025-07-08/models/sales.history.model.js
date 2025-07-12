import mongoose from "mongoose";

const SalesHistorySchema = new mongoose.Schema(
  {
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },
    products: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch",
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      },
      itemIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item"
      }]
    }],
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true
    },
    saleConfirmationDate: {
      type: Date,
      required: true
    },
    deliveryDate: {
      type: Date,
      required: true
    },
    notes: {
      type: String
    }
  },
  { timestamps: true }
);

export const SalesHistory = mongoose.model("SalesHistory", SalesHistorySchema);