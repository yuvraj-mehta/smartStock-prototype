import { SalesInvoice } from '../models/index.js';
import { catchAsyncErrors } from '../middlewares/index.js';

// Create Sales Invoice
export const createSalesInvoice = catchAsyncErrors(async (req, res) => {
  const { salesOrderId, amount, dueDate, paidDate, status } = req.body;
  if (!salesOrderId || !amount || !dueDate) {
    return res.status(400).json({ message: 'All required fields must be provided.' });
  }
  if (amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a positive number.' });
  }
  const invoice = await SalesInvoice.create({ salesOrderId, amount, dueDate, paidDate, status });
  res.status(201).json({ message: 'Sales invoice created', salesInvoice: invoice });
});

// Get all Sales Invoices
export const getAllSalesInvoices = catchAsyncErrors(async (req, res) => {
  const invoices = await SalesInvoice.find().populate('salesOrderId');
  res.json(invoices);
});

// Update Sales Invoice
export const updateSalesInvoice = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const invoice = await SalesInvoice.findByIdAndUpdate(id, req.body, { new: true });
  res.json(invoice);
});

// Delete Sales Invoice
export const deleteSalesInvoice = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  await SalesInvoice.findByIdAndDelete(id);
  res.json({ message: 'Sales invoice deleted' });
});
