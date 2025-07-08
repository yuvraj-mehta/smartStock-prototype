import express from 'express';
import {
  createSalesInvoice,
  getAllSalesInvoices,
  updateSalesInvoice,
  deleteSalesInvoice
} from '../controllers/salesInvoice.controller.js';
import { isAuthenticated, isAuthorized } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', isAuthenticated, isAuthorized('admin', 'sales', 'finance'), createSalesInvoice);
router.get('/', isAuthenticated, isAuthorized('admin', 'sales', 'finance'), getAllSalesInvoices);
router.put('/:id', isAuthenticated, isAuthorized('admin', 'sales', 'finance'), updateSalesInvoice);
router.delete('/:id', isAuthenticated, isAuthorized('admin', 'sales', 'finance'), deleteSalesInvoice);

export default router;
