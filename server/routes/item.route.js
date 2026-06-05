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
  (req, res) => {
    res.status(200).json({ message: 'Welcome to the Item API' });
  }
)

router.get(
  '/all',
  isAuthenticated,
  isAuthorized('admin', 'staff'),
  getAllItems
);

router.get(
  "/batch/:batchId",
  isAuthenticated,
  isAuthorized('admin', 'staff'),
  getItemsByBatch
);

router.get(
  "/track/:serialNumber",
  trackItemBySerial
);

router.get(
  "/product/:productId/movement-history",
  isAuthenticated,
  isAuthorized('admin', 'staff'),
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
  isAuthorized('admin', 'staff'),
  getItemById
);

export default router;
