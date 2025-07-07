import { Router } from "express";
import {
  initiateReturn,
  schedulePickup,
  markPickedUp,
  processReturn,
  getAllReturns,
  getReturnById
} from "../controllers/index.js";
import {
  isAuthenticated,
  isAuthorized,
} from "../middlewares/index.js";
import {
  initiateReturnValidation,
  schedulePickupValidation,
  updateReturnStatusValidation
} from "../validators/index.js";
import handleValidationErrors from "../middlewares/validationErrors.middleware.js";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Return API");
});

// Initiate return
router.post(
  "/initiate",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  initiateReturnValidation,
  handleValidationErrors,
  initiateReturn
);

// Schedule pickup for return
router.post(
  "/schedule-pickup/:returnId",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  schedulePickupValidation,
  handleValidationErrors,
  schedulePickup
);

// Mark return as picked up
router.post(
  "/picked-up/:returnId",
  isAuthenticated,
  isAuthorized("admin", "staff", "transporter"),
  updateReturnStatusValidation,
  handleValidationErrors,
  markPickedUp
);

// Process return at warehouse
router.post(
  "/process/:returnId",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  updateReturnStatusValidation,
  handleValidationErrors,
  processReturn
);

// Get all returns
router.get(
  "/all",
  isAuthenticated,
  isAuthorized("admin", "staff", "viewer"),
  getAllReturns
);

// Get return by ID
router.get(
  "/:returnId",
  isAuthenticated,
  isAuthorized("admin", "staff", "viewer"),
  getReturnById
);

export default router;