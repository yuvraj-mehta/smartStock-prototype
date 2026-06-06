import express from 'express';
const router = express.Router();
import { isAuthenticated, isAuthorized } from '../middlewares/index.js';
import {
  getAllItems,
  getItemById,
  getItemsByBatch,
  updateItemStatus,
  trackItemBySerial,
  getProductMovementHistory
} from '../controllers/item.controller.js';

router.get(
  '/',
  isAuthenticated,
  isAuthorized('admin', 'staff', 'viewer'),
  (req, res) => {
    res.status(200).json({ message: 'Welcome to the Item API' });
  }
)

router.get(
  '/all',
  isAuthenticated,
  isAuthorized('admin', 'staff', 'viewer'),
  getAllItems
);

router.get(
  "/batch/:batchId",
  isAuthenticated,
  isAuthorized('admin', 'staff', 'viewer'),
  getItemsByBatch
);

router.get(
  "/track/:serialNumber",
  isAuthenticated,
  isAuthorized('admin', 'staff', 'viewer'),
  trackItemBySerial
);

router.get(
  "/product/:productId/movement-history",
  isAuthenticated,
  isAuthorized('admin', 'staff', 'viewer'),
  getProductMovementHistory
);

router.put(
  "/update-status/:id",
  isAuthenticated,
  isAuthorized('admin'),
  updateItemStatus
);

router.get(
  "/:id",
  isAuthenticated,
  isAuthorized('admin', 'staff', 'viewer'),
  getItemById
);

export default router;
