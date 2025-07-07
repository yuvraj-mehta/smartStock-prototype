import { Router } from "express";
import {
  getAllPackages,
  getPackageById,
  getPackagesByOrderId,
  updatePackageStatus
} from "../controllers/index.js";
import {
  isAuthenticated,
  isAuthorized,
} from "../middlewares/index.js";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Package API");
});

// Get all packages
router.get(
  "/all",
  isAuthenticated,
  isAuthorized("admin", "staff", "viewer"),
  getAllPackages
);

// Get package by ID
router.get(
  "/:packageId",
  isAuthenticated,
  isAuthorized("admin", "staff", "viewer"),
  getPackageById
);

// Get packages by order ID
router.get(
  "/order/:orderId",
  isAuthenticated,
  isAuthorized("admin", "staff", "viewer"),
  getPackagesByOrderId
);

// Update package status
router.patch(
  "/status/:packageId",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  updatePackageStatus
);

export default router;
