import express from 'express';
import {
  createPaymentReceived,
  getAllPaymentsReceived,
  updatePaymentReceived,
  deletePaymentReceived
} from '../controllers/paymentReceived.controller.js';
import { isAuthenticated, isAuthorized } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', isAuthenticated, isAuthorized('admin', 'sales', 'finance'), createPaymentReceived);
router.get('/', isAuthenticated, isAuthorized('admin', 'sales', 'finance'), getAllPaymentsReceived);
router.put('/:id', isAuthenticated, isAuthorized('admin', 'sales', 'finance'), updatePaymentReceived);
router.delete('/:id', isAuthenticated, isAuthorized('admin', 'sales', 'finance'), deletePaymentReceived);

export default router;
