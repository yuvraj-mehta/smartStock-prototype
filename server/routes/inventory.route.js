import { Router } from "express";
import { isAuthenticated, isAuthorized } from "../middlewares/index.js";
import { addInventorySupply, viewInventory, getInventoryByProduct, markDamagedInventory } from "../controllers/index.js";
import { addSupplyValidation } from "../validators/index.js";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Inventory API");
});

router.post(
  "/add-supply",
  isAuthenticated,
  addSupplyValidation,
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

export default router;