import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  description: {
    type: String
  },
  category: {
    type: String,
    enum: ['electronics', 'clothing', 'food', 'other'],
    required: true
  },
  reorderPoint: {
    type: Number,
    required: true
  },
  restockTime: {
    type: Number
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  incomingStock: {
    type: Number,
    default: 0
  },
  lastRestockedAt: {
    type: Date
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  },
  unit: {
    type: String,
    required: true
  },
  active: {
    type: Boolean,
    required: true,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
});

export const Product = mongoose.model('Product', productSchema);