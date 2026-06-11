import { catchAsyncErrors } from "./index.js";
import jwt from "jsonwebtoken";
import { conf } from "../config/config.js";
import { ExternalUser } from "../models/externalUsers.model.js";
import { User } from "../models/user.model.js";
import {
  ROLES,
  getRoleScopes,
  getUnsupportedPolicyRoles,
  isInternalUserRole,
  normalizePolicyRoles,
  normalizeRole,
} from "../services/policy/index.js";

const EXTERNAL_TRANSPORTER_ROLE = "transporter";
const TRANSPORT_STATUS_INTERNAL_ROLES = [ROLES.ADMIN, ROLES.STAFF];

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

const getDecodedUserId = (decoded) => decoded?.id || decoded?._id || decoded?.userId || decoded?.sub;
const verifyToken = (token) => jwt.verify(token, conf.jwtSecret, conf.jwtVerifyOptions);

const findInternalUserById = (id) => User.findById(id)
  .populate('assignedWarehouseId', 'address warehouseName');

const attachInternalAuthContext = (req, user) => {
  const role = normalizeRole(user.role);
  if (!isInternalUserRole(role)) {
    return { statusCode: 403, message: 'Forbidden: Unsupported internal user role.' };
  }

  if (!user.assignedWarehouseId) {
    return { statusCode: 403, message: 'User must be assigned to a warehouse.' };
  }

  req.user = user;
  req.user.role = role;
  req.authPolicy = {
    role,
    scopes: getRoleScopes(role),
  };

  // Expose user's warehouse assignment for downstream use
  req.assignedWarehouseId = req.user.assignedWarehouseId;

  return null;
};

const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: 'No token provided, authorization denied.' });
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Token is not valid, authorization denied.' });
    }

    // Populate user with warehouse location
    const user = await findInternalUserById(getDecodedUserId(decoded));

    if (!user) {
      return res.status(401).json({ message: 'User not found, authorization denied.' });
    }

    const authError = attachInternalAuthContext(req, user);
    if (authError) {
      return res.status(authError.statusCode).json({ message: authError.message });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is not valid, authorization denied.' });
  }
});

const isTransportStatusAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: 'No token provided, authorization denied.' });
  }

  try {
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Token is not valid, authorization denied.' });
    }

    const decodedUserId = getDecodedUserId(decoded);
    const internalUser = decodedUserId ? await findInternalUserById(decodedUserId) : null;
    if (internalUser) {
      const authError = attachInternalAuthContext(req, internalUser);
      if (authError) {
        return res.status(authError.statusCode).json({ message: authError.message });
      }

      if (!TRANSPORT_STATUS_INTERNAL_ROLES.includes(normalizeRole(req.user.role))) {
        return res
          .status(403)
          .json({ message: 'Forbidden: You are not authorized to access this resource.' });
      }

      return next();
    }

    const externalUser = decodedUserId ? await ExternalUser.findById(decodedUserId) : null;
    const externalRole = normalizeRole(externalUser?.role);
    if (!externalUser || externalRole !== EXTERNAL_TRANSPORTER_ROLE) {
      return res.status(403).json({ message: 'Forbidden: You are not authorized to access this resource.' });
    }
    if (externalUser.status !== 'active') {
      return res.status(403).json({ message: 'Transporter is inactive or suspended.' });
    }
    if (!externalUser.warehouseId) {
      return res.status(403).json({ message: 'Transporter must be assigned to a warehouse.' });
    }

    const requestUser = typeof externalUser.toObject === 'function'
      ? externalUser.toObject()
      : { ...externalUser };
    req.user = {
      ...requestUser,
      _id: externalUser._id,
      role: externalRole,
      assignedWarehouseId: externalUser.warehouseId,
    };
    req.assignedWarehouseId = externalUser.warehouseId;
    req.authPolicy = {
      role: externalRole,
      scopes: [],
    };

    return next();
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
  isTransportStatusAuthenticated,
  isAuthorized,
  canViewUserDetails
};
