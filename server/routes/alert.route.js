import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the alert API");
});

export default router;