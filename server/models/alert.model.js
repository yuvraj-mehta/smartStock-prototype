import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true
  },
  type: {
    type: String,
    enum: ['low-stock', 'surge', 'forecast-error'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  triggeredAt: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'acknowledged', 'closed'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Alert = mongoose.model('Alert', alertSchema);