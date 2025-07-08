import { Router } from "express";
import {
  createOrder,
  processOrder,
  assignTransport,
  dispatchPackage,
  markDelivered,
  autoConfirmSale,
  getAllOrders,
  getOrderById
} from "../controllers/index.js";
import {
  isAuthenticated,
  isAuthorized,
} from "../middlewares/index.js";
import {
  createOrderValidation,
  processOrderValidation,
  assignTransportValidation
} from "../validators/index.js";
import handleValidationErrors from "../middlewares/validationErrors.middleware.js";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Order API");
});

// Create new order
router.post(
  "/create",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  createOrderValidation,
  handleValidationErrors,
  createOrder
);

// Process order and create package
router.post(
  "/process/:orderId",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  processOrderValidation,
  handleValidationErrors,
  processOrder
);

// Assign transport to package
router.post(
  "/assign-transport/:packageId",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  assignTransportValidation,
  handleValidationErrors,
  assignTransport
);

// Dispatch package
router.post(
  "/dispatch/:packageId",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  dispatchPackage
);

// Mark as delivered
router.post(
  "/delivered/:packageId",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  markDelivered
);

// Auto-confirm sales (typically called by cron job)
router.post(
  "/auto-confirm-sales",
  isAuthenticated,
  isAuthorized("admin"),
  autoConfirmSale
);

// Get all orders
router.get(
  "/all",
  isAuthenticated,
  isAuthorized("admin", "staff", "viewer"),
  getAllOrders
);

// Get order by ID
router.get(
  "/:orderId",
  isAuthenticated,
  isAuthorized("admin", "staff", "viewer"),
  getOrderById
);

export default router;
