import { Router } from "express";
import {
  login,
  logout,
  changePassword,
  updateProfile
} from "../controllers/index.js";
import { isAuthenticated, isAuthorized } from "../middlewares/index.js";
import {
  loginValidation,
  changePasswordValidation
} from "../validators/index.js";
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
router.put("/update-profile",
  isAuthenticated,
  updateProfile
)

export default router;