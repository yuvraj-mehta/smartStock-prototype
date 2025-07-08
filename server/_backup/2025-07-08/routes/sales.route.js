import express from "express";
import {
  recordSale,
  getAllSales,
  getSaleById,
  getSaleByPackageId,
} from "../controllers/index.js";
import { isAuthenticated, isAuthorized } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/record",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  recordSale
);

router.get(
  "/all",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  getAllSales
);

router.get(
  "/:id",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  getSaleById
);

router.get(
  "/package/:packageId",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  getSaleByPackageId
);

export default router;