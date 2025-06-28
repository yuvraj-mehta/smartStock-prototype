import { Router } from "express";
import {
  getMyDetails,
  getAllUsers,
  getUserDetails,
  updateUser,
  deleteUser
} from "../controllers/index.js";
import { isAuthenticated, isAuthorized } from "../middlewares/index.js"

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the User API");
});
router.get("/me",
  isAuthenticated,
  getMyDetails
);
router.get("/all",
  isAuthenticated,
  isAuthorized("admin"),
  getAllUsers
)
router.get("/:id",
  isAuthenticated,
  isAuthorized("admin"),
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