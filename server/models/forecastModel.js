import mongoose from 'mongoose';

const forecastSchema = new mongoose.Schema({
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
  forecastData: {
    type: Date,
    required: true
  },
  forecastPeriod: {
    type: Number,
    required: true
  },
  predictedDemand: {
    type: Number,
    required: true
  },
  method: {
    type: String
  },
  accuracy: {
    type: Number
  },
  notes: {
    type: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
});

export const Forecast = mongoose.model('Forecast', forecastSchema);