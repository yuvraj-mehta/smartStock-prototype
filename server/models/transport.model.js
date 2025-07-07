import mongoose from 'mongoose';

const transportSchema = new mongoose.Schema({
  trackingNumber: {
    type: String,
    required: true,
    unique: true,
    default: function () {
      return `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    }
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Package',
    required: true
  },
  transportType: {
    type: String,
    enum: ['forward', 'reverse'], // forward for delivery, reverse for return
    default: 'forward'
  },
  transporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExternalUser',
    required: true
  },
  status: {
    type: String,
    enum: ['dispatched', 'in_transit', 'delivered'],
    default: 'dispatched'
  },
  dispatchedAt: {
    type: Date,
    default: Date.now
  },
  deliveredAt: {
    type: Date
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String
  },
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExternalUser'
    }
  }]
}, { timestamps: true });

export const Transport = mongoose.model('Transport', transportSchema);