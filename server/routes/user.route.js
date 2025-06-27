import { Router } from "express";
import { getUserDetails } from "../controllers/index.js";
import { isAuthenticated, isAuthorized } from "../middlewares/index.js"

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the User API");
});
router.get("/me",
  isAuthenticated,
  getUserDetails
);


export default router;