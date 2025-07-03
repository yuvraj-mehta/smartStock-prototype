import mongoose from 'mongoose';

const transportSchema = new mongoose.Schema({
  packageId: {
    type: String,
    required: true
  },
  trackingNumber: {
    type: String,
    required: true,
    unique: true
  },
  transportCost: {
    type: Number,
    required: true
  },
  totalWeight: {
    type: Number,
    required: true
  },
  totalVolume: {
    type: Number,
    required: true
  },
  totalValue: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'dispatched', 'intransit', 'delivered', 'returned'],
    required: true
  },
  products: [
    {
      batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
    },
  ],
  location: {
    from: {
      type: String,
      required: true
    },
    to: {
      type: String,
      required: true
    }
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExternalUser',
    required: true
  },
  transportMode: {
    type: String,
    enum: ['land', 'air', 'ship'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  dispatchedAt: {
    type: Date
  },
  deliveredAt: {
    type: Date
  },
  estimatedDeliveryDate: {
    type: Date
  },
  actualDeliveryDate: {
    type: Date
  },
  deliverySignature: {
    type: String
  },
  deliveryNotes: {
    type: String
  },
  deliveryPhotos: [{
    type: String // URLs to delivery photos
  }],
  statusHistory: [{
    status: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    location: {
      type: String
    },
    notes: {
      type: String
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExternalUser'
    }
  }],
  returnReason: {
    type: String
  },
  returnDate: {
    type: Date
  },
  customerRating: {
    type: Number,
    min: 1,
    max: 5
  },
  customerFeedback: {
    type: String
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export const Transport = mongoose.model('Transport', transportSchema);