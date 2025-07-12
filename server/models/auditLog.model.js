import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true }, // e.g., 'CREATE_PURCHASE_ORDER', 'MARK_DAMAGED', etc.
  entityType: { type: String, required: true }, // e.g., 'PurchaseOrder', 'Batch', 'Payment', etc.
  entityId: { type: mongoose.Schema.Types.ObjectId },
  value: { type: mongoose.Schema.Types.Mixed }, // Can store amount, details, etc.
  timestamp: { type: Date, default: Date.now },
  details: { type: String },
}, { timestamps: true });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
