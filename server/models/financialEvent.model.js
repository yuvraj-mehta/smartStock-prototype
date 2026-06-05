import mongoose from 'mongoose';

export const FINANCIAL_EVENT_TYPES = Object.freeze([
  'inventory_receipt',
  'inventory_damage',
  'cogs_recognition',
  'supplier_invoice',
  'supplier_payment',
  'sales_invoice',
  'customer_payment',
  'manual_adjustment',
  'reversal',
]);

export const FINANCIAL_EVENT_STATUSES = Object.freeze([
  'posted',
  'reversed',
]);

const sourceSchema = new mongoose.Schema(
  {
    module: {
      type: String,
      trim: true,
    },
    model: {
      type: String,
      trim: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    documentNumber: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const financialEventSchema = new mongoose.Schema(
  {
    eventNumber: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      default: function () {
        return `FIN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      },
    },
    eventType: {
      type: String,
      enum: FINANCIAL_EVENT_TYPES,
      required: true,
      immutable: true,
    },
    status: {
      type: String,
      enum: FINANCIAL_EVENT_STATUSES,
      default: 'posted',
      immutable: true,
    },
    occurredAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      immutable: true,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
      immutable: true,
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      immutable: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      immutable: true,
    },
    source: {
      type: sourceSchema,
      immutable: true,
    },
    referenceType: {
      type: String,
      trim: true,
      immutable: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      immutable: true,
    },
    reversalOfEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinancialEvent',
      immutable: true,
    },
    idempotencyKey: {
      type: String,
      trim: true,
      immutable: true,
    },
    journalEntryCount: {
      type: Number,
      default: 0,
      min: 0,
      immutable: true,
    },
    totalDebit: {
      type: Number,
      default: 0,
      min: 0,
      immutable: true,
    },
    totalCredit: {
      type: Number,
      default: 0,
      min: 0,
      immutable: true,
    },
    memo: {
      type: String,
      trim: true,
      immutable: true,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      immutable: true,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  }
);

financialEventSchema.index({ eventType: 1, occurredAt: -1 });
financialEventSchema.index({ warehouseId: 1, occurredAt: -1 });
financialEventSchema.index({ referenceType: 1, referenceId: 1 });
financialEventSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
financialEventSchema.index({ reversalOfEventId: 1 });

financialEventSchema.pre('save', function preventFinancialEventResave(next) {
  if (!this.isNew && this.isModified()) {
    return next(new Error('Financial events are immutable. Record a reversal event instead.'));
  }

  return next();
});

const preventFinancialEventUpdate = function preventFinancialEventUpdate(next) {
  return next(new Error('Financial events are immutable. Record a reversal event instead.'));
};

[
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'replaceOne',
].forEach((hook) => financialEventSchema.pre(hook, preventFinancialEventUpdate));

export const FinancialEvent = mongoose.model('FinancialEvent', financialEventSchema);
