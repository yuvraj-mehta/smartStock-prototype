import { body } from "express-validator";

const allowedReturnReasons = ['defective', 'damaged', 'wrong_item', 'quality_issue', 'customer_request'];

const returnItemsValidator = () =>
  body("returnedItems")
    .isArray({ min: 1 }).withMessage("Returned items must be an array with at least one item")
    .custom((items) => {
      for (const item of items) {
        if (!item.productId || !item.batchId || item.quantity === undefined) {
          throw new Error("Each returned item must have productId, batchId, and quantity");
        }
        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity < 1) {
          throw new Error("Return quantity must be a positive integer");
        }
        if (item.itemIds !== undefined && !Array.isArray(item.itemIds)) {
          throw new Error("Returned itemIds must be an array when provided");
        }
      }
      return true;
    });

const returnReasonValidator = () =>
  body("returnReason")
    .notEmpty().withMessage("Return reason is required")
    .isString().withMessage("Return reason must be a string")
    .trim()
    .isIn(allowedReturnReasons).withMessage("Return reason is invalid")
    .isLength({ min: 3, max: 200 }).withMessage("Return reason must be between 3 and 200 characters");

const packageIdValidator = () =>
  body("packageId")
    .notEmpty().withMessage("Package ID is required")
    .isMongoId().withMessage("Package ID must be a valid Mongo ID");

const transporterIdValidator = () =>
  body("transporterId")
    .notEmpty().withMessage("Transporter ID is required")
    .isMongoId().withMessage("Transporter ID must be a valid Mongo ID");

const notesValidator = () =>
  body("notes")
    .optional()
    .isString().withMessage("Notes must be a string")
    .trim()
    .isLength({ max: 500 }).withMessage("Notes cannot exceed 500 characters");

export const initiateReturnValidation = [
  packageIdValidator(),
  returnItemsValidator(),
  body("returnedItems.*.productId")
    .isMongoId().withMessage("Returned product ID must be a valid Mongo ID"),
  body("returnedItems.*.batchId")
    .isMongoId().withMessage("Returned batch ID must be a valid Mongo ID"),
  body("returnedItems.*.quantity")
    .isInt({ min: 1 }).withMessage("Return quantity must be a positive integer"),
  body("returnedItems.*.itemIds")
    .optional()
    .isArray().withMessage("Returned itemIds must be an array"),
  body("returnedItems.*.itemIds.*")
    .optional()
    .isMongoId().withMessage("Returned item ID must be a valid Mongo ID"),
  returnReasonValidator(),
  notesValidator(),
];

export const schedulePickupValidation = [
  transporterIdValidator(),
  notesValidator(),
];

export const updateReturnStatusValidation = [
  notesValidator(),
];
