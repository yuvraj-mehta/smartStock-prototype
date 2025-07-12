import express from 'express';
import {
  createInvoice,
  getAllInvoices,
  updateInvoice,
  deleteInvoice
} from '../controllers/invoice.controller.js';
import { isAuthenticated, isAuthorized } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Only admin or finance can create/update/delete invoices
router.post('/', isAuthenticated, isAuthorized('admin', 'finance'), createInvoice);
router.get('/', isAuthenticated, isAuthorized('admin', 'finance', 'staff'), getAllInvoices);
router.put('/:id', isAuthenticated, isAuthorized('admin', 'finance'), updateInvoice);
router.delete('/:id', isAuthenticated, isAuthorized('admin', 'finance'), deleteInvoice);

export default router;
