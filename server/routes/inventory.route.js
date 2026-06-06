import { Router } from "express";
import { isAuthenticated, isAuthorized } from "../middlewares/index.js";
import { addInventorySupply, viewInventory, getInventoryByProduct, markDamagedInventory, getRealTimeInventoryStatus, trackBatchByNumber } from "../controllers/index.js";
import { addSupplyValidation } from "../validators/index.js";
import handleValidationErrors from "../middlewares/validationErrors.middleware.js";

const router = Router();

router.get("/", isAuthenticated, isAuthorized("admin", "staff", "viewer"), (req, res) => {
  res.send("Welcome to the Inventory API");
});

router.post(
  "/add-supply",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  addSupplyValidation,
  handleValidationErrors,
  addInventorySupply
);

router.get(
  "/all",
  isAuthenticated,
  isAuthorized("admin", "staff", "viewer"),
  viewInventory
);

router.get(
  "/product/:productId",
  isAuthenticated,
  isAuthorized("admin", "staff", "viewer"),
  getInventoryByProduct
)

router.post(
  "/mark-damaged",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  markDamagedInventory
);

// New tracking and analytics routes (safe additions)
router.get(
  "/real-time",
  isAuthenticated,
  isAuthorized("admin", "staff", "viewer"),
  getRealTimeInventoryStatus
);

router.get(
  "/batch/track/:batchNumber",
  isAuthenticated,
  isAuthorized("admin", "staff", "viewer"),
  trackBatchByNumber
);

export default router;
