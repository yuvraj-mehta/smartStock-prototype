import { catchAsyncErrors } from "../middlewares/index.js";
import { User } from "../models/index.js"
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/index.js";
import jwt from "jsonwebtoken";




// login controller
const login = catchAsyncErrors(async (req, res) => {
  const { email, password } = req.body;

  // const user = await User.findOne({ email, status: 'active' }).select("+password");
  const user = await User.findOne({ email, status: "active" })
    .populate('assignedLocation', 'name code') // ✅ Add population
    .select("+password");


  if (!user) {
    return res.status(404).json({ message: 'User not found or inactive.' });
  }

  // CHANGE: Check if admin has assigned location
  if (user.role === 'admin' && !user.assignedLocation) {
    return res.status(403).json({
      message: "Admin must be assigned to a warehouse location"
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  // Update last login time
  user.lastLogin = new Date();
  await user.save();

  // Generate JWT token
  const token = generateToken(user);

  res.status(200).json({
    message: "Login successful",
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      assignedLocation: user.assignedLocation,
      lastLogin: user.lastLogin,
    },
  });
})

// logout controller
// const logout = catchAsyncErrors(async (req, res) => {
//   // Invalidate the token or perform any necessary cleanup
//   // Generate JWT token
//   const authHeader = req.headers.authorization;
//   if (!authHeader || !authHeader.startsWith('Bearer ')) {
//     return res.status(401).json({ message: 'No token provided, authorization denied.' });
//   }

//   const oldToken = authHeader.split(' ')[1];
//   const token = jwt.sign({
//     id: oldToken.id,
//     fullName: oldToken.fullName,
//     email: oldToken.email,
//     role: oldToken.role,
//   }, process.env.JWT_SECRET, {
//     expiresIn: '0s'
//   })

//   res.status(200).json({
//     message: "Logout successful",
//     token,
//   });
// });



// CHANGE: Fix logout controller (current implementation is incorrect)
const logout = catchAsyncErrors(async (req, res) => {
  // CHANGE: Simple logout response (client should discard token)
  res.status(200).json({
    message: "Logout successful"
  });
});



// get user details
const getMyDetails = catchAsyncErrors(async (req, res) => {
  const user = req.user;
  return res.status(200).json({
    message: "User details fetched successfully",
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
      assignedLocation: user.assignedLocation,
      isVerified: user.isVerified,
    },
  });
});

// change password controller
const changePassword = catchAsyncErrors(async (req, res) => {
  const oldPassword = req.body.oldPassword;
  const newPassword = req.body.newPassword;

  const isValid = await bcrypt.compare(oldPassword, req.user.password);

  if (!isValid) {
    return res.status(401).json({ message: 'Old password is incorrect.' });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const user = await User.findByIdAndUpdate(req.user._id, { password: hashedPassword }, { new: true });
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }
  res.status(200).json({
    message: "Password changed successfully",
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  });
})

export { login, logout, getMyDetails, changePassword };




