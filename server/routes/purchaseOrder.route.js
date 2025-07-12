import express from 'express';
import {
  createPurchaseOrder,
  getAllPurchaseOrders,
  updatePurchaseOrder,
  deletePurchaseOrder
} from '../controllers/purchaseOrder.controller.js';
import { isAuthenticated, isAuthorized } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Only admin or finance can create/update/delete purchase orders
router.post('/', isAuthenticated, isAuthorized('admin', 'finance'), createPurchaseOrder);
router.get('/', isAuthenticated, isAuthorized('admin', 'finance', 'staff'), getAllPurchaseOrders);
router.put('/:id', isAuthenticated, isAuthorized('admin', 'finance'), updatePurchaseOrder);
router.delete('/:id', isAuthenticated, isAuthorized('admin', 'finance'), deletePurchaseOrder);

export default router;
