import { validationResult } from "express-validator";

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
    }));
    return res.status(400).json({
      message: "Input validation failed",
      errors: formattedErrors
    });
  }
  next();
}

export default handleValidationErrors;
