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
      const { length = 0, breadth = 0, height = 0 } = this?.dimension || {};
      return length * breadth * height;
    }
  },
  thresholdLimit: {
    type: Number,
    required: true,
    default: 10,
  },
  restockRecommended: {
    type: Boolean,
    default: function () {
      return (this?.quantity || 0) <= (this?.thresholdLimit || 0);
    }
  },
  shelfLifeDays: {
    type: Number,
    required: true,
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
