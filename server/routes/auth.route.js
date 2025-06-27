import { Router } from "express";
import {
  login,
  logout,
  createUser,
  changePassword
} from "../controllers/index.js";
import { isAuthenticated, isAuthorized } from "../middlewares/index.js";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Auth API");
});


router.post("/login", login);
router.get("/logout",
  isAuthenticated,
  logout
)
router.post("/add/new-user",
  isAuthenticated,
  isAuthorized("admin"),
  createUser
);
router.post("/change-password",
  isAuthenticated,
  changePassword
)

export default router;