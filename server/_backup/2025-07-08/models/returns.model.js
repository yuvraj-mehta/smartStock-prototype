import mongoose from "mongoose";

const returnSchema = new mongoose.Schema(
  {
    returnNumber: {
      type: String,
      unique: true,
      required: true,
      default: function () {
        return `RET-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      }
    },
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
    returnedItems: [{
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
    returnReason: {
      type: String,
      enum: ['defective', 'damaged', 'wrong_item', 'quality_issue', 'customer_request'],
      required: true
    },
    returnStatus: {
      type: String,
      enum: ['initiated', 'pickup_scheduled', 'picked_up', 'received', 'processed'],
      default: 'initiated'
    },
    returnDate: {
      type: Date,
      default: Date.now
    },
    receivedDate: {
      type: Date
    },
    processedDate: {
      type: Date
    },
    transportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transport"
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    notes: {
      type: String
    }
  },
  { timestamps: true }
);

export const Return = mongoose.model("Return", returnSchema);