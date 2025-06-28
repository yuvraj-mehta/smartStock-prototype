import { catchAsyncErrors } from "./index.js";
import jwt from "jsonwebtoken";
import { conf } from "../config/config.js";
import { User } from "../models/index.js";

const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided, authorization denied.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, conf.jwtSecret);
    if (!decoded) {
      return res.status(401).json({ message: 'Token is not valid, authorization denied.' });
    }

    // Populate user with warehouse location
    req.user = await User.findById(decoded.id)
      .populate('assignedLocation', 'name code');
    if (!req.user) {
      return res.status(401).json({ message: 'User not found, authorization denied.' });
    }

    // Expose user's warehouse location for downstream use
    req.userLocation = req.user.assignedLocation;

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is not valid, authorization denied.' });
  }
});

/**
 * Role-based authorization
 * Accepts one or more roles: isAuthorized('admin'), isAuthorized('admin','staff')
 */
const isAuthorized = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res
      .status(403)
      .json({ message: 'Forbidden: You are not authorized to access this resource.' });
  }
  next();
};

export {
  isAuthenticated,
  isAuthorized
};
