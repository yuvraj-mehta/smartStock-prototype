import jwt from "jsonwebtoken";
import {conf} from "../../config/config.js"

export const generateToken = (user) => {
  const assignedWarehouse = user.assignedWarehouseId?._id ?? user.assignedWarehouseId;
  const assignedWarehouseId = assignedWarehouse ? assignedWarehouse.toString() : null;

  const token = jwt.sign({
    id: user._id,
    email: user.email,
    role: user.role,
    assignedWarehouseId,
  },
  conf.jwtSecret,
  {
    expiresIn: conf.jwtExpiration,
  })

  return token;
}
