import { catchAsyncErrors } from "../middlewares/index.js";
import { User } from "../models/index.js"
import { ExternalUser } from "../models/externalUsers.model.js";
import bcrypt from "bcryptjs";

// Create User Controller
const createUser = catchAsyncErrors(async (req, res) => {
  const { fullName, email, password, phone, wagePerHour, role } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      message: 'User with this email already exists.'
    });
  }

  if (role === 'admin') {
    return res.status(403).json({
      message: 'Admins cannot create admins. Please use the staff role.'
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    fullName,
    email,
    password: hashedPassword,
    phone,
    wagePerHour,
    role,
    assignedWarehouseId: req.user.assignedWarehouseId,
  })

  res.status(201).json({
    message: 'User created successfully.',
    user: {
      id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      phone: newUser.phone,
      wagePerHour: newUser.wagePerHour,
      role: newUser.role,
      status: newUser.status,
      isVerified: newUser.isVerified,
      assignedWarehouseId: newUser.assignedWarehouseId
    }
  })
})


// Get All Users Controller
const getAllUsers = catchAsyncErrors(async (req, res) => {
  const users = await User.find({
    assignedLocation: req.user.assignedLocation,
  }, {
    password: 0,
    email: 0,
    __v: 0,
    phone: 0,
    verificationToken: 0,
    verificationTokenExpiry: 0,
    resetPasswordToken: 0,
    resetPasswordTokenExpires: 0,
  }).populate('assignedWarehouseId', 'address warehouseName');

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

  const user = await User.findOne({
    _id: userId,
    assignedLocation: req.user.assignedLocation,
  }).populate('assignedLocation', 'name code');


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
      assignedLocation: user.assignedLocation,
      avatar: user.avatar,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin,
    }
  })
})

// Update User data by Admin
const updateUser = catchAsyncErrors(async (req, res) => {
  const userId = req.params.id;
  const {
    fullName,
    email,
    role,
    status,
    phone,
    avatar,
    shift,
    wagePerHour,
    hoursThisMonth,
  } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  // Validate fields only if provided
  if (email !== undefined && !email.includes('@')) {
    return res.status(400).json({ message: 'Please provide a valid email address.' });
  }

  const validRoles = ['admin', 'staff', 'viewer'];
  if (role !== undefined && !validRoles.includes(role)) {
    return res.status(400).json({ message: 'Invalid role.' });
  }

  const validStatuses = ['active', 'inactive', 'suspended'];
  if (status !== undefined && !validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status.' });
  }

  const validShifts = ['morning', 'afternoon', 'night'];
  if (shift !== undefined && !validShifts.includes(shift)) {
    return res.status(400).json({ message: 'Invalid shift.' });
  }

  if (wagePerHour !== undefined && (typeof wagePerHour !== 'number' || wagePerHour < 0)) {
    return res.status(400).json({ message: 'Invalid wage per hour.' });
  }

  if (hoursThisMonth !== undefined && (typeof hoursThisMonth !== 'number' || hoursThisMonth < 0)) {
    return res.status(400).json({ message: 'Invalid hours this month.' });
  }

  const user = await User.findOne({
    _id: userId,
    assignedWarehouseId: req.user.assignedWarehouseId
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  // Check if email already exists when changing email
  if (email !== undefined && user.email !== email) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists.' });
    }
  }

  if (user._id.toString() === req.user._id.toString() && role !== undefined && role !== user.role) {
    return res.status(400).json({ message: "Cannot change your own role." });
  }

  // Update only provided fields
  if (fullName !== undefined) user.fullName = fullName;
  if (email !== undefined) user.email = email;
  if (role !== undefined) user.role = role;
  if (status !== undefined) user.status = status;
  if (phone !== undefined) user.phone = phone;
  if (avatar !== undefined) user.avatar = avatar;
  if (shift !== undefined) user.shift = shift;
  if (wagePerHour !== undefined) user.wagePerHour = wagePerHour;
  if (hoursThisMonth !== undefined) user.hoursThisMonth = hoursThisMonth;
  user.updatedAt = new Date();

  await user.save();

  res.status(200).json({
    message: 'User updated successfully.',
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      shift: user.shift,
      wagePerHour: user.wagePerHour,
      hoursThisMonth: user.hoursThisMonth,
      assignedWarehouseId: user.assignedWarehouseId,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin,
    }
  })
})

const deleteUser = catchAsyncErrors(async (req, res) => {
  const userId = req.params.id;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  const user = await User.findOne({
    _id: userId,
    assignedLocation: req.user.assignedLocation
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ message: "Cannot delete your own account." });
  }

  await User.findByIdAndDelete(userId);
  res.status(200).json({ message: 'User deleted successfully.' });
})

export { createUser, getAllUsers, getUserDetails, updateUser, deleteUser };