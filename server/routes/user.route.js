import { Router } from "express";
import {
  getMyDetails,
  getAllUsers,
  getUserDetails,
  updateUser,
  createUser,
  deleteUser
} from "../controllers/index.js";
import { isAuthenticated, isAuthorized, canViewUserDetails } from "../middlewares/index.js"
import { createUserValidation } from "../validators/index.js";
import handleValidationErrors from "../middlewares/validationErrors.middleware.js";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the User API");
});
router.get("/me",
  isAuthenticated,
  getMyDetails
);
router.post("/create",
  isAuthenticated,
  isAuthorized("admin"),
  createUserValidation,
  handleValidationErrors,
  createUser
);
router.get("/all",
  isAuthenticated,
  isAuthorized("admin"),
  getAllUsers
)
router.get("/:id",
  isAuthenticated,
  canViewUserDetails,
  getUserDetails
)
router.put("/update/:id",
  isAuthenticated,
  isAuthorized("admin"),
  updateUser
)
router.delete("/delete/:id",
  isAuthenticated,
  isAuthorized("admin"),
  deleteUser
)


export default router;