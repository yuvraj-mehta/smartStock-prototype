import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: true,
    trim: true,
  },
  productImage: {
    type: String,
    required: true,
  },
  unit: {
    type: String,
    required: true,
  },
  manufacturer: {
    type: String,
  },
  productCategory: {
    type: String,
    enum: ['electronics', 'apparel', 'decor', 'furniture'],
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
  },
  weight: {
    type: Number,
    default: 0,
  },
  dimension: {
    length: { type: Number, required: true },
    breadth: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  volume: {
    type: Number,
    default: function () {
      return this.dimension.length * this.dimension.breadth * this.dimension.height;
    }
  },
  thresholdLimit: {
    type: Number,
    required: true,
    default: 10,
  },
  restockRecommended: {
    type: Boolean,
    default: function() {
      return this.quantity <= this.thresholdLimit;
    }
  },
  shelfLifeDays: {
    type: Number,
    required: true,
  },
  batchNumber: {
    type: Number,
  },
  mfgDate: {
    type: Date,
  },
  expDate: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  supplierIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExternalUser",
    }
  ],
}, { timestamps: true });

export const Product = mongoose.model('Product', productSchema);