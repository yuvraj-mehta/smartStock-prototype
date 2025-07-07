import { catchAsyncErrors } from "../middlewares/index.js";

export const withTransaction = (callback) => {
  return catchAsyncErrors(async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await callback(req, res, next, session);
      await session.commitTransaction();
      return result;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  });
};

export const handleValidationError = (error, req, res, next) => {
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
    return res.status(400).json({
      message: 'Validation failed',
      errors
    });
  }
  next(error);
};

export const handleCastError = (error, req, res, next) => {
  if (error.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid ID format',
      error: error.message
    });
  }
  next(error);
};

export const handleDuplicateError = (error, req, res, next) => {
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];
    return res.status(400).json({
      message: `Duplicate entry for ${field}`,
      field,
      value
    });
  }
  next(error);
};
