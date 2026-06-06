import { Router } from "express";
import {
  getAllTransports,
  getTransportById,
  updateTransportStatus,
  getTransportsByPackageId
} from "../controllers/index.js";
import {
  isAuthenticated,
  isTransportStatusAuthenticated,
  isAuthorized,
} from "../middlewares/index.js";

const router = Router();

router.get("/", isAuthenticated, isAuthorized("admin", "staff", "viewer"), (req, res) => {
  res.send("Welcome to the Transport API");
});

// Get all transports
router.get(
  "/all",
  isAuthenticated,
  isAuthorized("admin", "staff", "viewer"),
  getAllTransports
);

// Get transports by package ID
router.get(
  "/package/:packageId",
  isAuthenticated,
  isAuthorized("admin", "staff", "viewer"),
  getTransportsByPackageId
);

// Get transport by ID
router.get(
  "/:transportId",
  isAuthenticated,
  isAuthorized("admin", "staff", "viewer"),
  getTransportById
);

// Update transport status
router.patch(
  "/status/:transportId",
  isTransportStatusAuthenticated,
  updateTransportStatus
);

export default router;
