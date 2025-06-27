// import authController from "./auth.controller.js";
import {
  login,
  logout,
  getUserDetails,
  changePassword
} from "./auth.controller.js"

import createUser from "./create.user.controller.js";

// const { login, logout } = authController;

export {
  login,
  logout,
  getUserDetails,
  changePassword,
  createUser
};