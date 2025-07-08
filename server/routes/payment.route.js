import express from 'express';
import {
  createPayment,
  getAllPayments,
  updatePayment,
  deletePayment
} from '../controllers/payment.controller.js';
import { isAuthenticated, isAuthorized } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Only admin or finance can create/update/delete payments
router.post('/', isAuthenticated, isAuthorized('admin', 'finance'), createPayment);
router.get('/', isAuthenticated, isAuthorized('admin', 'finance', 'staff'), getAllPayments);
router.put('/:id', isAuthenticated, isAuthorized('admin', 'finance'), updatePayment);
router.delete('/:id', isAuthenticated, isAuthorized('admin', 'finance'), deletePayment);

export default router;
