import express from 'express';
import {
  createPurchaseOrder,
  getAllPurchaseOrders,
  updatePurchaseOrder,
  deletePurchaseOrder
} from '../controllers/purchaseOrder.controller.js';
import { isAuthenticated, isAuthorized } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Only admin or staff can create/update/delete purchase orders
router.post('/', isAuthenticated, isAuthorized('admin', 'staff'), createPurchaseOrder);
router.get('/', isAuthenticated, isAuthorized('admin', 'staff'), getAllPurchaseOrders);
router.put('/:id', isAuthenticated, isAuthorized('admin', 'staff'), updatePurchaseOrder);
router.delete('/:id', isAuthenticated, isAuthorized('admin', 'staff'), deletePurchaseOrder);

export default router;
