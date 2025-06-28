// import authController from "./auth.controller.js";
import {
  login,
  logout,
  getMyDetails,
  changePassword
} from "./auth.controller.js"

import {
  createUser,
  getAllUsers,
  getUserDetails,
  updateUser,
  deleteUser
} from "./user.controller.js";

// const { login, logout } = authController;

export {
  login,
  logout,
  getMyDetails,
  getUserDetails,
  changePassword,
  createUser,
  getAllUsers,
  updateUser,
  deleteUser
};