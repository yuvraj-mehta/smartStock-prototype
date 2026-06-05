import express from 'express';
import {
  createSalesOrder,
  getAllSalesOrders,
  updateSalesOrder,
  deleteSalesOrder
} from '../controllers/salesOrder.controller.js';
import { isAuthenticated, isAuthorized } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/', isAuthenticated, isAuthorized('admin', 'staff'), createSalesOrder);
router.get('/', isAuthenticated, isAuthorized('admin', 'staff'), getAllSalesOrders);
router.put('/:id', isAuthenticated, isAuthorized('admin', 'staff'), updateSalesOrder);
router.delete('/:id', isAuthenticated, isAuthorized('admin', 'staff'), deleteSalesOrder);

export default router;
