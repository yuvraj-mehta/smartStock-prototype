import mongoose from "mongoose";

const returnSchema = new mongoose.Schema(
  {
    returnNumber: {
      type: String,
      unique: true,
      required: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
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
      ref: "Customer", // Changed from User to Customer
    },
    reason: {
      type: String,
      required: true,
    },
    returnType: {
      type: String,
      enum: ['defective', 'damaged', 'wrong_item', 'customer_request', 'quality_issue'],
      required: true,
      default: 'customer_request'
    },
    status: {
      type: String,
      enum: ['pending', 'received', 'inspected', 'approved', 'rejected', 'refunded'],
      default: 'pending'
    },
    refundAmount: {
      type: Number,
      min: 0
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'processed', 'completed'],
      default: 'pending'
    },
    inspectionNotes: {
      type: String
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
    inspectionDate: {
      type: Date
    },
    refundDate: {
      type: Date
    }
  },
  { timestamps: true }
);

export const Return = mongoose.model("Return", returnSchema);