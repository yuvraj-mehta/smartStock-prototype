import { body } from "express-validator";

const productNameValidator = () =>
  body("productName")
    .notEmpty().withMessage("Product name is required")
    .isLength({ min: 3 }).withMessage("Product name must be at least 3 characters long");

const productImageValidator = () =>
  body("productImage")
    .notEmpty().withMessage("Product image is required")
    .isURL().withMessage("Product image must be a valid URL");

const unitValidator = () =>
  body("unit")
    .notEmpty().withMessage("Unit is required")

const manufacturerValidator = () =>
  body("manufacturer")
    .notEmpty().withMessage("Manufacturer is required");

const productCategoryValidator = () =>
  body("productCategory")
    .notEmpty().withMessage("Product category is required");

const skuValidator = () =>
  body("sku")
    .notEmpty().withMessage("SKU is required")
    .isLength({ min: 3 }).withMessage("SKU must be at least 3 characters long");

const priceValidator = () =>
  body("price")
    .notEmpty().withMessage("Price is required")
    .isNumeric().withMessage("Price must be a number");

const weightValidator = () =>
  body("weight")
    .optional()
    .isNumeric().withMessage("Weight must be a number");

const dimensionValidator = () =>
  body("dimension")
    .notEmpty().withMessage("Dimension is required")
    .isObject().withMessage("Dimension must be an object")
    .custom(value => {
      if (!value.length || !value.breadth || !value.height) {
        throw new Error("Dimension must include length, breadth, and height");
      }
      return true;
    });

const thresholdLimitValidator = () =>
  body("thresholdLimit")
    .optional()
    .isNumeric().withMessage("Threshold limit must be a number");

const shelfLifeDaysValidator = () =>
  body("shelfLifeDays")
    .optional()
    .isNumeric().withMessage("Shelf life days must be a number");

const quantityValidator = () =>
  body("quantity")
    .optional()
    .isNumeric().withMessage("Quantity must be a number");

const isActiveValidator = () =>
  body("isActive")
    .optional()
    .isBoolean().withMessage("isActive must be a boolean");

const transportCostValidator = () =>
  body("transportCost")
    .notEmpty().withMessage("Transport cost is required")
    .isNumeric().withMessage("Transport cost must be a number");

const productsValidator = () =>
  body("products")
    .isArray({ min: 1 }).withMessage("Products must be a non-empty array");

const locationValidator = () =>
  body("location")
    .notEmpty().withMessage("Location is required");

const assignedToValidator = () =>
  body("assignedTo")
    .notEmpty().withMessage("AssignedTo is required");

const transportModeValidator = () =>
  body("transportMode")
    .notEmpty().withMessage("Transport mode is required");









// Update Product Validation
export const updateProductValidation = [
  body("productName").optional().isLength({ min: 3 }).withMessage("Product name must be at least 3 characters long"),
  body("productImage").optional().isURL().withMessage("Product image must be a valid URL"),
  body("unit").optional(),
  body("manufacturer").optional(),
  body("productCategory").optional(),
  body("sku").optional().isLength({ min: 3 }).withMessage("SKU must be at least 3 characters long"),
  body("price").optional().isNumeric().withMessage("Price must be a number"),
  quantityValidator(),
  body("weight").optional().isNumeric().withMessage("Weight must be a number"),
  body("dimension").optional().isObject().withMessage("Dimension must be an object").custom(value => {
    if (value && (!value.length || !value.breadth || !value.height)) {
      throw new Error("Dimension must include length, breadth, and height");
    }
    return true;
  }),
  body("thresholdLimit").optional().isNumeric().withMessage("Threshold limit must be a number"),
  body("shelfLifeDays").optional().isNumeric().withMessage("Shelf life days must be a number"),
  isActiveValidator(),
];

// Create Product Validation
export const createProductValidation = [
  productNameValidator(),
  productImageValidator(),
  unitValidator(),
  manufacturerValidator(),
  productCategoryValidator(),
  skuValidator(),
  priceValidator(),
  weightValidator(),
  dimensionValidator(),
  thresholdLimitValidator(),
  shelfLifeDaysValidator(),
];

export const createTransportValidation = [
  transportCostValidator(),
  productsValidator(),
  locationValidator(),
  assignedToValidator(),
  transportModeValidator(),
];

export {
  transportCostValidator,
  productsValidator,
  locationValidator,
  assignedToValidator,
  transportModeValidator,
};