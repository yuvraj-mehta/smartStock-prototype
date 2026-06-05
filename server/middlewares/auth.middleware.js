import { catchAsyncErrors } from "./index.js";
import jwt from "jsonwebtoken";
import { conf } from "../config/config.js";
import { User } from "../models/user.model.js";
import {
  ROLES,
  getRoleScopes,
  getUnsupportedPolicyRoles,
  isInternalUserRole,
  normalizePolicyRoles,
  normalizeRole,
} from "../services/policy/index.js";

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
      .populate('assignedWarehouseId', 'address warehouseName');

    if (!req.user) {
      return res.status(401).json({ message: 'User not found, authorization denied.' });
    }

    const role = normalizeRole(req.user.role);
    if (!isInternalUserRole(role)) {
      return res.status(403).json({ message: 'Forbidden: Unsupported internal user role.' });
    }

    req.user.role = role;
    req.authPolicy = {
      role,
      scopes: getRoleScopes(role),
    };

    // Expose user's warehouse assignment for downstream use
    req.assignedWarehouseId = req.user.assignedWarehouseId;

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is not valid, authorization denied.' });
  }
});

/**
 * Role-based authorization
 * Accepts one or more supported internal roles.
 * External roles are intentionally ignored here; external users do not use the
 * internal User JWT surface.
 */
const isAuthorized = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const unsupportedRoles = getUnsupportedPolicyRoles(roles);
  if (unsupportedRoles.length > 0) {
    return res.status(500).json({
      message: 'Authorization policy contains unsupported internal roles.',
    });
  }

  const allowedRoles = normalizePolicyRoles(roles);
  if (allowedRoles.length === 0) {
    return res.status(500).json({ message: 'Authorization policy requires at least one role.' });
  }

  if (!allowedRoles.includes(normalizeRole(req.user.role))) {
    return res
      .status(403)
      .json({ message: 'Forbidden: You are not authorized to access this resource.' });
  }
  next();
};

const canViewUserDetails = (req, res, next) => {
  // Allow access if user is admin or viewing their own details
  if (normalizeRole(req.user.role) === ROLES.ADMIN || req.user._id.toString() === req.params.id) {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden: You are not authorized to view this user.' });
};

export {
  isAuthenticated,
  isAuthorized,
  canViewUserDetails
};
