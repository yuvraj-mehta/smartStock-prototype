import { AuditLog } from '../models/index.js';

export async function logAudit({ userId, action, entityType, entityId, value, details }) {
  try {
    await AuditLog.create({
      userId,
      action,
      entityType,
      entityId,
      value,
      details
    });
  } catch (err) {
    // Optionally log error to a file or monitoring system
    console.error('Audit log error:', err);
  }
}
