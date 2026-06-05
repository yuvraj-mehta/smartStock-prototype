import jwt from "jsonwebtoken";
import {conf} from "../../config/config.js"
import { getRoleScopes, normalizeRole } from "../../services/policy/index.js";

export const generateToken = (user) => {
  const assignedWarehouse = user.assignedWarehouseId?._id ?? user.assignedWarehouseId;
  const assignedWarehouseId = assignedWarehouse ? assignedWarehouse.toString() : null;
  const role = normalizeRole(user.role);

  const token = jwt.sign({
    id: user._id,
    email: user.email,
    role,
    scopes: getRoleScopes(role),
    assignedWarehouseId,
  },
  conf.jwtSecret,
  {
    expiresIn: conf.jwtExpiration,
  })

  return token;
}
