import { Router } from "express";
import {
  createSupplier,
  createTransporter,
  deleteExternalUser,
  getAllExternalUsers,
  updateExternalUser
} from "../controllers/externalUser.controller.js";
import { isAuthenticated, isAuthorized } from "../middlewares/auth.middleware.js";
import {
  createSupplierValidation,
  createTransporterValidation
} from "../validators/index.js";
import handleValidationErrors from "../middlewares/validationErrors.middleware.js";

const router = Router();

// External suppliers and transporters are managed by authenticated internal users.
// This router does not provide external-user login or token issuance.
router.get(
  "/",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  getAllExternalUsers
);

router.post(
  "/supplier",
  isAuthenticated,
  isAuthorized("admin"),
  createSupplierValidation,
  handleValidationErrors,
  createSupplier
);

router.post(
  "/transporter",
  isAuthenticated,
  isAuthorized("admin"),
  createTransporterValidation,
  handleValidationErrors,
  createTransporter
);

router.put(
  "/:id",
  isAuthenticated,
  isAuthorized("admin"),
  updateExternalUser
);

router.delete(
  "/:id",
  isAuthenticated,
  isAuthorized("admin"),
  deleteExternalUser
);

export default router;
