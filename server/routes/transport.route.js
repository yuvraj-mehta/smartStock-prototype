import { Router } from "express";
const router = Router();

import { createTransportValidation } from "../validators/productAndInventory.validators.js";
import {
  isAuthenticated,
  isAuthorized,
  updateTransportStatus
} from "../middlewares/index.js";
import {
  createTransport,
  getAllTransports
} from "../controllers/index.js";

router.get("/", (req, res) => {
  res.send("Welcome to the Transport API");
});

router.get(
  "/all",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  getAllTransports
);

router.post(
  "/create",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  createTransportValidation,
  createTransport
);

router.patch(
  "/update/:id",
  isAuthenticated,
  isAuthorized("transporter"),
  updateTransportStatus
);

export default router;