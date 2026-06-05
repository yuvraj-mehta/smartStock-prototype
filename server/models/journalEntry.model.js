import mongoose from 'mongoose';
import { FINANCIAL_EVENT_TYPES } from './financialEvent.model.js';

export const JOURNAL_ENTRY_DIRECTIONS = Object.freeze([
  'debit',
  'credit',
]);

export const FINANCE_ACCOUNT_TYPES = Object.freeze([
  'asset',
  'liability',
  'equity',
  'revenue',
  'expense',
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

const journalEntrySchema = new mongoose.Schema(
  {
    financialEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinancialEvent',
      required: true,
      immutable: true,
    },
    lineNumber: {
      type: Number,
      required: true,
      min: 1,
      immutable: true,
    },
    occurredAt: {
      type: Date,
      required: true,
      immutable: true,
    },
    eventType: {
      type: String,
      enum: FINANCIAL_EVENT_TYPES,
      required: true,
      immutable: true,
    },
    direction: {
      type: String,
      enum: JOURNAL_ENTRY_DIRECTIONS,
      required: true,
      immutable: true,
    },
    accountType: {
      type: String,
      enum: FINANCE_ACCOUNT_TYPES,
      required: true,
      immutable: true,
    },
    accountCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      immutable: true,
    },
    accountName: {
      type: String,
      required: true,
      trim: true,
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

journalEntrySchema.index({ financialEventId: 1, lineNumber: 1 }, { unique: true });
journalEntrySchema.index({ eventType: 1, occurredAt: -1 });
journalEntrySchema.index({ accountCode: 1, occurredAt: -1 });
journalEntrySchema.index({ accountType: 1, occurredAt: -1 });
journalEntrySchema.index({ warehouseId: 1, occurredAt: -1 });
journalEntrySchema.index({ referenceType: 1, referenceId: 1 });

journalEntrySchema.pre('save', function preventJournalEntryResave(next) {
  if (!this.isNew && this.isModified()) {
    return next(new Error('Journal entries are immutable. Record a reversal event instead.'));
  }

  return next();
});

const preventJournalEntryUpdate = function preventJournalEntryUpdate(next) {
  return next(new Error('Journal entries are immutable. Record a reversal event instead.'));
};

[
  'updateOne',
  'updateMany',
  'findOneAndUpdate',
  'replaceOne',
].forEach((hook) => journalEntrySchema.pre(hook, preventJournalEntryUpdate));

export const JournalEntry = mongoose.model('JournalEntry', journalEntrySchema);
