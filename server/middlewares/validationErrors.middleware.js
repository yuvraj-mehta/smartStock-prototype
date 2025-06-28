import { validationResult } from "express-validator";

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Custom error formatting
    const formattedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value
    }));
    return res.status(400).json({
      message: "Input validation failed",
      errors: formattedErrors
    });
  }
  next();
}

export default handleValidationErrors;