import { Router } from "express";
import {
  login,
  logout,
  changePassword
} from "../controllers/index.js";
import { isAuthenticated, isAuthorized } from "../middlewares/index.js";
import {
  loginValidation,
  changePasswordValidation
} from "../validators/auth.validator.js";
import handleValidationErrors from "../middlewares/validationErrors.middleware.js";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Auth API");
});

router.post("/login", loginValidation, handleValidationErrors, login);
router.get("/logout",
  isAuthenticated,
  logout
)
router.post("/change-password",
  isAuthenticated,
  changePasswordValidation,
  handleValidationErrors,
  changePassword
)

export default router;