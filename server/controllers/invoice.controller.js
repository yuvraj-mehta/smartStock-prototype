import { Invoice } from '../models/index.js';
import { catchAsyncErrors } from '../middlewares/index.js';
import { logAudit } from '../utils/auditLogger.js';

// Create Invoice
export const createInvoice = catchAsyncErrors(async (req, res) => {
  const { purchaseOrderId, amount, dueDate, paidDate, status } = req.body;
  if (!purchaseOrderId || !amount || !dueDate) {
    return res.status(400).json({ message: 'All required fields must be provided.' });
  }
  if (amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number.' });
  }
  const invoice = await Invoice.create({ purchaseOrderId, amount, dueDate, paidDate, status });
  // Audit log
  await logAudit({
    userId: req.user?._id,
    action: "CREATE_INVOICE",
    entityType: "Invoice",
    entityId: invoice._id,
    value: amount,
    details: `PO: ${purchaseOrderId}, Due: ${dueDate}`
  });
  res.status(201).json({ message: 'Invoice created', invoice });
});

// Get all Invoices
export const getAllInvoices = catchAsyncErrors(async (req, res) => {
  const invoices = await Invoice.find().populate('purchaseOrderId');
  res.json(invoices);
});

// Update Invoice
export const updateInvoice = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const invoice = await Invoice.findByIdAndUpdate(id, req.body, { new: true });
  res.json(invoice);
});

// Delete Invoice
export const deleteInvoice = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  await Invoice.findByIdAndDelete(id);
  res.json({ message: 'Invoice deleted' });
});
