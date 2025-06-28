import { catchAsyncErrors } from "../middlewares/index.js";
import { User } from "../models/index.js"
import bcrypt from "bcryptjs";

// Create User Controller
const createUser = catchAsyncErrors(async (req, res) => {
  const { fullName, email, password, role, status } = req.body;;

  if (!fullName || !email || !password || !role || !status) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      message: 'User with this email already exists.'
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    fullName,
    email,
    password: hashedPassword,
    role,
    status,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  res.status(201).json({
    message: 'User created successfully.',
    user: {
      id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      emailVerified: newUser.emailVerified,
    }
  })
})


// Get All Users Controller
const getAllUsers = catchAsyncErrors(async (req, res) => {
  const users = await User.find();
  // const users = await User.find({ emailVerified: false });
  res.status(200).json({
    message: 'All users fetched successfully.',
    totalUsers: users.length,
    users
  });
})

// Get details of a single user
const getUserDetails = catchAsyncErrors(async (req, res) => {
  const userId = req.params.id;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.status(200).json({
    message: 'User details fetched successfully.',
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin,
    }
  })
})

// Update User data by Admin
const updateUser = catchAsyncErrors(async (req, res) => {
  const userId = req.params.id;
  const { fullName, email, role, status } = req.body;

  if (!userId || !fullName || !email || !role || !status) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // Simple email validation
  if (!email.includes('@')) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  // Validate role
  const validRoles = ['admin', 'staff', 'viewer'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role.' });
  }

  // Validate status
  const validStatuses = ['active', 'inactive', 'suspended'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  // Check if email already exists when changing email
  if (user.email !== email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists.' });
    }
  }

  if (user.fullName !== fullName) {
    user.fullName = fullName;
  }
  if (user.email !== email) {
    user.email = email;
  }
  if (user.role !== role) {
    user.role = role;
  }
  if (user.status !== status) {
    user.status = status;
  }
  user.updatedAt = new Date();

  await user.save();

  res.status(200).json({
    message: 'User updated successfully.',
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
    }
  })
})

const deleteUser = catchAsyncErrors(async (req, res) => {
  const userId = req.params.id;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  await User.findByIdAndDelete(userId);
  res.status(200).json({ message: 'User deleted successfully.' });
})

export { createUser, getAllUsers, getUserDetails, updateUser, deleteUser };