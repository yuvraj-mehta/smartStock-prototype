import express from "express";
import { Customer } from "../models/customer.model.js";
import { catchAsyncErrors } from "../middlewares/index.js";
import { isAuthenticated, isAuthorized } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Create customer
const createCustomer = catchAsyncErrors(async (req, res) => {
  const {
    customerName,
    email,
    phone,
    address,
    customerType
  } = req.body;

  // Check if customer already exists
  const existingCustomer = await Customer.findOne({ email });
  if (existingCustomer) {
    return res.status(400).json({ message: "Customer with this email already exists" });
  }

  const customer = await Customer.create({
    customerName,
    email,
    phone,
    address,
    customerType
  });

  res.status(201).json({
    message: "Customer created successfully",
    customer
  });
});

// Get all customers
const getAllCustomers = catchAsyncErrors(async (req, res) => {
  const { page = 1, limit = 10, search, status } = req.query;

  let filter = {};
  if (search) {
    filter.$or = [
      { customerName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }
  if (status) filter.status = status;

  const customers = await Customer.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Customer.countDocuments(filter);

  res.status(200).json({
    customers,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    }
  });
});

// Get customer by ID
const getCustomerById = catchAsyncErrors(async (req, res) => {
  const customer = await Customer.findById(req.params.id)
    .populate('orderHistory');

  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  res.status(200).json({ customer });
});

// Update customer
const updateCustomer = catchAsyncErrors(async (req, res) => {
  const customer = await Customer.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  res.status(200).json({
    message: "Customer updated successfully",
    customer
  });
});

// Routes
router.post(
  "/create",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  createCustomer
);

router.get(
  "/",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  getAllCustomers
);

router.get(
  "/:id",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  getCustomerById
);

router.put(
  "/:id",
  isAuthenticated,
  isAuthorized("admin", "staff"),
  updateCustomer
);

export default router;
