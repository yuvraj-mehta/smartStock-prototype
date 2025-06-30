import { body } from "express-validator";

const productIdValidator = () =>
  body("productId")
    .notEmpty().withMessage("Product ID is required")
    .isMongoId().withMessage("Product ID must be a valid Mongo ID");

const supplierIdValidator = () =>
  body("supplierId")
    .notEmpty().withMessage("Supplier ID is required")
    .isMongoId().withMessage("Supplier ID must be a valid Mongo ID");

const warehouseIdValidator = () =>
  body("warehouseId")
    .notEmpty().withMessage("Warehouse ID is required")
    .isMongoId().withMessage("Warehouse ID must be a valid Mongo ID");

const supplyQuantityValidator = () =>
  body("quantity")
    .notEmpty().withMessage("Quantity is required")
    .isInt({ min: 1 }).withMessage("Quantity must be a positive integer");

const mfgDateValidator = () =>
  body("mfgDate")
    .notEmpty().withMessage("Manufacturing date is required")
    .isISO8601().withMessage("Manufacturing date must be a valid date (YYYY-MM-DD)");

const expDateValidator = () =>
  body("expDate")
    .notEmpty().withMessage("Expiry date is required")
    .isISO8601().withMessage("Expiry date must be a valid date (YYYY-MM-DD)");

const notesValidator = () =>
  body("notes")
    .optional()
    .isString().withMessage("Notes must be a string");

export const addSupplyValidation = [
  productIdValidator(),
  supplierIdValidator(),
  warehouseIdValidator(),
  supplyQuantityValidator(),
  mfgDateValidator(),
  expDateValidator(),
  notesValidator(),
];
