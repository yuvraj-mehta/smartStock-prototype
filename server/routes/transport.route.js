import { Router } from "express";
import {
  getAllTransports,
  getTransportById,
  updateTransportStatus,
  getTransportsByPackageId
} from "../controllers/index.js";
import {
  isAuthenticated,
  isAuthorized,
} from "../middlewares/index.js";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Transport API");
});

// Get all transports
router.get(
  "/all",
  isAuthenticated,
  isAuthorized("admin", "staff"),
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
  isAuthorized("admin", "staff"),
  getTransportById
);

// Update transport status
router.patch(
  "/status/:transportId",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  updateTransportStatus
);

export default router;
