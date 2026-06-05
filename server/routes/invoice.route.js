import express from 'express';
import {
  createInvoice,
  getAllInvoices,
  updateInvoice,
  deleteInvoice
} from '../controllers/invoice.controller.js';
import { isAuthenticated, isAuthorized } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Only admin or staff can create/update/delete invoices
router.post('/', isAuthenticated, isAuthorized('admin', 'staff'), createInvoice);
router.get('/', isAuthenticated, isAuthorized('admin', 'staff'), getAllInvoices);
router.put('/:id', isAuthenticated, isAuthorized('admin', 'staff'), updateInvoice);
router.delete('/:id', isAuthenticated, isAuthorized('admin', 'staff'), deleteInvoice);

export default router;
