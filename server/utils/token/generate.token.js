import jwt from "jsonwebtoken";
import {conf} from "../../config/config.js"

const generateToken = (user) => {
  const token = jwt.sign({
    id: user._id,
    email: user.email,
    role: user.role,
  },
  conf.jwtSecret,
  {
    expiresIn: conf.jwtExpiration,
  })

  return token;
}

export default generateToken;