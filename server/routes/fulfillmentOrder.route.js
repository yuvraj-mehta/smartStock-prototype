import express from "express";
import {
  receiveOrder,
  processOrder,
  packOrder,
  shipOrder,
  markDelivered,
  trackOrder,
  getAllOrders,
  processReturn
} from "../controllers/fulfillmentOrder.controller.js";
import { isAuthenticated, isAuthorized } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Receive order from e-commerce platform (manual entry)
router.post(
  "/receive",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  receiveOrder
);

// Process order (allocate inventory)
router.post(
  "/process/:orderNumber",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  processOrder
);

// Pack order
router.post(
  "/pack/:orderNumber",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  packOrder
);

// Ship order
router.post(
  "/ship/:orderNumber",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  shipOrder
);

// Mark as delivered
router.post(
  "/delivered/:orderNumber",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  markDelivered
);

// Track order (public endpoint for customer tracking)
router.get(
  "/track/:identifier",
  trackOrder
);

// Get all orders with filtering
router.get(
  "/",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  getAllOrders
);

// Process return
router.post(
  "/return/:orderNumber",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  processReturn
);

export default router;
