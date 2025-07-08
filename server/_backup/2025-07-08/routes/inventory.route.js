import { Router } from "express";
import { isAuthenticated, isAuthorized } from "../middlewares/index.js";
import { addInventorySupply, viewInventory, getInventoryByProduct, markDamagedInventory, getRealTimeInventoryStatus, trackBatchByNumber } from "../controllers/index.js";
import { addSupplyValidation } from "../validators/index.js";
import handleValidationErrors from "../middlewares/validationErrors.middleware.js";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Inventory API");
});

router.post(
  "/add-supply",
  isAuthenticated,
  addSupplyValidation,
  handleValidationErrors,
  addInventorySupply
);

router.get(
  "/all",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  viewInventory
);

router.get(
  "/product/:productId",
  isAuthenticated,
  isAuthorized("admin", "staff"),
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
  isAuthorized("admin", "staff"),
  getRealTimeInventoryStatus
);

router.get(
  "/batch/track/:batchNumber",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  trackBatchByNumber
);

export default router;