import express from 'express';
import {
  createPayment,
  getAllPayments,
  updatePayment,
  deletePayment
} from '../controllers/payment.controller.js';
import { isAuthenticated, isAuthorized } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Only admin or staff can create/update/delete payments
router.post('/', isAuthenticated, isAuthorized('admin', 'staff'), createPayment);
router.get('/', isAuthenticated, isAuthorized('admin', 'staff'), getAllPayments);
router.put('/:id', isAuthenticated, isAuthorized('admin', 'staff'), updatePayment);
router.delete('/:id', isAuthenticated, isAuthorized('admin', 'staff'), deletePayment);

export default router;
