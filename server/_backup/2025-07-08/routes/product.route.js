import { Router } from "express";
import {
  isAuthenticated,
  isAuthorized,
} from "../middlewares/index.js"

import {
  createProduct,
  getProductById,
  getAllProducts,
  deleteProductById,
  updateProductById
} from "../controllers/index.js"
import { createProductValidation, updateProductValidation } from "../validators/index.js";
const router = Router();

router.get("/", (req, res) => {
  res.send("Welcome to the Product API");
});

router.post(
  "/add",
  isAuthenticated,
  isAuthorized("admin"),
  createProductValidation,
  createProduct
);
router.get(
  "/all",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  getAllProducts
);
router.get(
  "/:id",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  getProductById
);
router.delete(
  "/delete/:id",
  isAuthenticated,
  isAuthorized("admin"),
  deleteProductById
);
router.put(
  "/update/:id",
  isAuthenticated,
  isAuthorized("admin"),
  updateProductValidation,
  updateProductById
);

export default router;