import express from "express";
import { Customer } from "../models/customer.model.js";
import { catchAsyncErrors } from "../middlewares/index.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = express.Router();

// Customer Registration
const registerCustomer = catchAsyncErrors(async (req, res) => {
  const {
    customerName,
    email,
    password,
    phone,
    address,
    customerType = 'individual'
  } = req.body;

  // Check if customer already exists
  const existingCustomer = await Customer.findOne({ email });
  if (existingCustomer) {
    return res.status(400).json({ message: "Customer with this email already exists" });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create customer
  const customer = await Customer.create({
    customerName,
    email,
    password: hashedPassword,
    phone,
    address,
    customerType,
    status: 'active'
  });

  // Generate JWT token
  const token = jwt.sign(
    { customerId: customer._id, email: customer.email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '30d' }
  );

  res.status(201).json({
    message: "Customer registered successfully",
    customer: {
      id: customer._id,
      customerName: customer.customerName,
      email: customer.email,
      phone: customer.phone,
      customerType: customer.customerType
    },
    token
  });
});

// Customer Login
const loginCustomer = catchAsyncErrors(async (req, res) => {
  const { email, password } = req.body;

  // Find customer
  const customer = await Customer.findOne({ email }).select('+password');
  if (!customer) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, customer.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  // Check if customer is active
  if (customer.status !== 'active') {
    return res.status(403).json({ message: "Account is inactive. Please contact support." });
  }

  // Generate JWT token
  const token = jwt.sign(
    { customerId: customer._id, email: customer.email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '30d' }
  );

  res.status(200).json({
    message: "Login successful",
    customer: {
      id: customer._id,
      customerName: customer.customerName,
      email: customer.email,
      phone: customer.phone,
      customerType: customer.customerType,
      totalOrders: customer.totalOrders,
      totalValue: customer.totalValue
    },
    token
  });
});

// Customer Authentication Middleware
const authenticateCustomer = catchAsyncErrors(async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const customer = await Customer.findById(decoded.customerId);

    if (!customer || customer.status !== 'active') {
      return res.status(401).json({ message: "Invalid token or inactive account" });
    }

    req.customer = customer;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

// Routes
router.post("/register", registerCustomer);
router.post("/login", loginCustomer);

export { authenticateCustomer };
export default router;
