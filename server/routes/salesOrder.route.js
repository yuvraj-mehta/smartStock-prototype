import express from 'express';
import {
  createSalesOrder,
  getAllSalesOrders,
  updateSalesOrder,
  deleteSalesOrder
} from '../controllers/salesOrder.controller.js';
import { isAuthenticated, isAuthorized } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', isAuthenticated, isAuthorized('admin', 'sales'), createSalesOrder);
router.get('/', isAuthenticated, isAuthorized('admin', 'sales', 'finance'), getAllSalesOrders);
router.put('/:id', isAuthenticated, isAuthorized('admin', 'sales'), updateSalesOrder);
router.delete('/:id', isAuthenticated, isAuthorized('admin', 'sales'), deleteSalesOrder);

export default router;
