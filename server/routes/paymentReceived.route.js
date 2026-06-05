import express from 'express';
import {
  createPaymentReceived,
  getAllPaymentsReceived,
  updatePaymentReceived,
  deletePaymentReceived
} from '../controllers/paymentReceived.controller.js';
import { isAuthenticated, isAuthorized } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', isAuthenticated, isAuthorized('admin', 'staff'), createPaymentReceived);
router.get('/', isAuthenticated, isAuthorized('admin', 'staff'), getAllPaymentsReceived);
router.put('/:id', isAuthenticated, isAuthorized('admin', 'staff'), updatePaymentReceived);
router.delete('/:id', isAuthenticated, isAuthorized('admin', 'staff'), deletePaymentReceived);

export default router;
