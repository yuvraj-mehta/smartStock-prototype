import express from "express";
import {
  createOrder,
  processOrder,
  getOrderDetails,
  trackOrder,
  confirmDelivery,
  getAllOrders
} from "../controllers/order.controller.js";
import { isAuthenticated, isAuthorized } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Create new order
router.post(
  "/create",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  createOrder
);

// Process order (allocate inventory and create transport)
router.post(
  "/process/:orderId",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  processOrder
);

// Get order details
router.get(
  "/:orderId",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  getOrderDetails
);

// Track order by order number or tracking number
router.get(
  "/track/:identifier",
  trackOrder // No auth required for customer tracking
);

// Confirm delivery
router.post(
  "/confirm-delivery/:orderId",
  isAuthenticated,
  isAuthorized("transporter"),
  confirmDelivery
);

// Get all orders with filtering
router.get(
  "/",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  getAllOrders
);

export default router;
