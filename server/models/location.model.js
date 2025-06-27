import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  cityName: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  zipCode: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['warehouse', 'retail', 'store'],
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
});

export const Location = mongoose.model('Location', locationSchema);
