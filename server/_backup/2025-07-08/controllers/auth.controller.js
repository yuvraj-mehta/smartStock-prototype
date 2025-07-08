import { catchAsyncErrors } from "../middlewares/index.js";
import { User } from "../models/index.js"
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/index.js";
import jwt from "jsonwebtoken";




// login controller
const login = catchAsyncErrors(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, status: "active" })
    .populate('assignedWarehouseId', 'address warehouseName')
    .select("+password");


  if (!user) {
    return res.status(404).json({ message: 'User not found or inactive.' });
  }

  // CHANGE: Check if admin has assigned location
  if (user.role === 'admin' && !user.assignedWarehouseId) {
    return res.status(403).json({
      message: "Admin must be assigned to a warehouse"
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
      avatar: user.avatar,
      assignedWarehouseId: user.assignedWarehouseId,
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



// CHANGE: Fix logout controller
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
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      shift: user.shift,
      wagePerHour: user.wagePerHour,
      hoursThisMonth: user.hoursThisMonth,
      status: user.status,
      assignedWarehouseId: user.assignedWarehouseId,
      isVerified: user.isVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
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
      phone: user.phone,
      email: user.email,
      role: user.role,
    },
  });
})

// update profile controller
const updateProfile = catchAsyncErrors(async (req, res) => {
  const { fullName, email, phone, avatar, shift } = req.body;
  const userId = req.user._id;

  // Validate fields only if provided
  if (email !== undefined && !email.includes('@')) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  const validShifts = ['morning', 'afternoon', 'night'];
  if (shift !== undefined && shift !== '' && !validShifts.includes(shift)) {
    return res.status(400).json({ message: 'Invalid shift.' });
  }

  // Check if email already exists when changing email
  if (email !== undefined && req.user.email !== email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists.' });
    }
  }

  // Create update object with only provided fields
  const updateData = {};
  if (fullName !== undefined) updateData.fullName = fullName;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (avatar !== undefined) updateData.avatar = avatar;
  if (shift !== undefined) updateData.shift = shift;

  const user = await User.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  ).populate('assignedWarehouseId', 'address warehouseName');

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  res.status(200).json({
    message: 'Profile updated successfully.',
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      shift: user.shift,
      wagePerHour: user.wagePerHour,
      hoursThisMonth: user.hoursThisMonth,
      status: user.status,
      assignedWarehouseId: user.assignedWarehouseId,
      isVerified: user.isVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  });
});

export { login, logout, getMyDetails, changePassword, updateProfile };




