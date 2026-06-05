import express from 'express';
import {
  createSalesInvoice,
  getAllSalesInvoices,
  updateSalesInvoice,
  deleteSalesInvoice
} from '../controllers/salesInvoice.controller.js';
import { isAuthenticated, isAuthorized } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', isAuthenticated, isAuthorized('admin', 'staff'), createSalesInvoice);
router.get('/', isAuthenticated, isAuthorized('admin', 'staff'), getAllSalesInvoices);
router.put('/:id', isAuthenticated, isAuthorized('admin', 'staff'), updateSalesInvoice);
router.delete('/:id', isAuthenticated, isAuthorized('admin', 'staff'), deleteSalesInvoice);

export default router;
