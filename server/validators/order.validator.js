import { body } from "express-validator";

const platformOrderIdValidator = () =>
  body("platformOrderId")
    .notEmpty().withMessage("Platform order ID is required")
    .isString().withMessage("Platform order ID must be a string")
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage("Platform order ID must be between 3 and 50 characters");

const orderItemsValidator = () =>
  body("items")
    .isArray({ min: 1 }).withMessage("Items must be an array with at least one item")
    .custom((items) => {
      for (const item of items) {
        if (!item.productId || !item.quantity) {
          throw new Error("Each item must have productId and quantity");
        }
        if (typeof item.quantity !== 'number' || item.quantity < 1) {
          throw new Error("Item quantity must be a positive number");
        }
      }
      return true;
    });

const orderNotesValidator = () =>
  body("notes")
    .optional()
    .isString().withMessage("Notes must be a string")
    .trim()
    .isLength({ max: 500 }).withMessage("Notes cannot exceed 500 characters");

export const createOrderValidation = [
  platformOrderIdValidator(),
  orderItemsValidator(),
  orderNotesValidator(),
];

export const processOrderValidation = [
  body("notes")
    .optional()
    .isString().withMessage("Notes must be a string")
    .trim()
    .isLength({ max: 500 }).withMessage("Notes cannot exceed 500 characters")
];

export const assignTransportValidation = [
  body("transporterId")
    .notEmpty().withMessage("Transporter ID is required")
    .isMongoId().withMessage("Transporter ID must be a valid Mongo ID"),
  body("notes")
    .optional()
    .isString().withMessage("Notes must be a string")
    .trim()
    .isLength({ max: 500 }).withMessage("Notes cannot exceed 500 characters")
];
