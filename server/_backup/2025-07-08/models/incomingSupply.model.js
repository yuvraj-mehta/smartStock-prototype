import mongoose from "mongoose";

const incomingSupplySchema = new mongoose.Schema({
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Batch",
    required: true,
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // staff/admin
  },
  receivedAt: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
  },
});

export const IncomingSupply = mongoose.model("IncomingSupply", incomingSupplySchema);