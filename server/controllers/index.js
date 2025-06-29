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

import {
  createProduct,
  getProductById,
  getAllProducts,
  deleteProductById,
  updateProductById
} from "./product.controller.js"; 

// const { login, logout } = authController;

export {
  login,
  logout,
  getMyDetails,
  changePassword,
  getUserDetails,
  createUser,
  getAllUsers,
  updateUser,
  deleteUser,
  createProduct,
  getProductById,
  getAllProducts,
  deleteProductById,
  updateProductById
};