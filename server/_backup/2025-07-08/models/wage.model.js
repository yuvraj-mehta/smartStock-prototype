import mongoose from 'mongoose';

const wageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: String, // e.g., "2025-06"
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  wageForMonth: {
    type: Number,
    required: true
  },
  hoursWorked: {
    type: Number,
    required: true
  },
  overTime: {
    type: Number,
    default: 0
  },
  wagePerHour: {
    type: Number,
    required: true
  },
  totalPay: {
    type: Number,
    required: true
  },
  paidStatus: {
    type: String,
    enum: ['pending', 'paid'],
    default: 'pending'
  },
  paidAt: {
    type: Date
  }
}, {
  timestamps: true // adds createdAt and updatedAt
});

export const Wage = mongoose.model('Wage', wageSchema);