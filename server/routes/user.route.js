import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the User API");
});

export default router;