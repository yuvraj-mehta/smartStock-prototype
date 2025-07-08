import { catchAsyncErrors } from "../middlewares/index.js";
import { ExternalUser } from "../models/externalUsers.model.js";
import bcrypt from "bcryptjs";

const createTransporter = catchAsyncErrors(async (req, res) => {
  const {
    fullName,
    companyName,
    email,
    password,
    phone,
    address,
    contactPerson,
  } = req.body;

  // Check if email already exists
  const existing = await ExternalUser.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: "Transporter with this email already exists." });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the transporter (using the warehouse from the authenticated user)
  const newTransporter = await ExternalUser.create({
    fullName,
    companyName,
    email,
    password: hashedPassword,
    phone,
    address,
    contactPerson,
    role: "transporter",
    warehouseId: req.user.assignedWarehouseId,
  });

  return res.status(201).json({
    message: "Transporter created successfully.",
    transporter: {
      id: newTransporter._id,
      fullName: newTransporter.fullName,
      email: newTransporter.email,
      phone: newTransporter.phone,
      companyName: newTransporter.companyName,
      address: newTransporter.address,
      contactPerson: newTransporter.contactPerson,
      role: newTransporter.role,
      warehouseId: newTransporter.warehouseId,
      status: newTransporter.status,
    },
  });
});

const createSupplier = catchAsyncErrors(async (req, res) => {
  const {
    fullName,
    companyName,
    email,
    password,
    phone,
    address,
    contactPerson,
  } = req.body;

  // Check if email already exists
  const existing = await ExternalUser.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: "Supplier with this email already exists." });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the supplier (using the warehouse from the authenticated user)
  const newSupplier = await ExternalUser.create({
    fullName,
    companyName,
    email,
    password: hashedPassword,
    phone,
    address,
    contactPerson,
    role: "supplier",
    warehouseId: req.user.assignedWarehouseId,
  });

  return res.status(201).json({
    message: "Supplier created successfully.",
    supplier: {
      id: newSupplier._id,
      fullName: newSupplier.fullName,
      email: newSupplier.email,
      phone: newSupplier.phone,
      companyName: newSupplier.companyName,
      address: newSupplier.address,
      contactPerson: newSupplier.contactPerson,
      role: newSupplier.role,
      warehouseId: newSupplier.warehouseId,
      status: newSupplier.status,
    },
  });
});

const getAllExternalUsers = catchAsyncErrors(async (req, res) => {
  const { role } = req.query; // optional filter by role (supplier/transporter)

  const filter = {
    warehouseId: req.user.assignedWarehouseId
  };

  if (role) {
    filter.role = role;
  }

  const externalUsers = await ExternalUser.find(filter, {
    password: 0, // Don't return password
    __v: 0
  }).sort({ createdAt: -1 });

  return res.status(200).json({
    message: "External users fetched successfully.",
    externalUsers: externalUsers.map(user => ({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      companyName: user.companyName,
      address: user.address,
      contactPerson: user.contactPerson,
      role: user.role,
      status: user.status,
      warehouseId: user.warehouseId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }))
  });
});

const updateExternalUser = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const {
    fullName,
    companyName,
    email,
    phone,
    address,
    contactPerson,
  } = req.body;

  // Find the external user
  const externalUser = await ExternalUser.findById(id);
  if (!externalUser) {
    return res.status(404).json({ message: "External user not found." });
  }

  // For admin users, allow update regardless of warehouse
  // Check if user belongs to the same warehouse (convert both to strings for comparison)
  if (req.user.role !== 'admin') {
    const userWarehouseId = externalUser.warehouseId ? externalUser.warehouseId.toString() : null;
    const requestWarehouseId = req.user.assignedWarehouseId ? req.user.assignedWarehouseId.toString() : null;

    if (userWarehouseId !== requestWarehouseId) {
      console.log('Warehouse mismatch:', {
        externalUserWarehouse: userWarehouseId,
        requestUserWarehouse: requestWarehouseId,
        user: req.user
      });
      return res.status(403).json({ message: "Access denied." });
    }
  }

  // Check if email already exists (if email is being changed)
  if (email && email !== externalUser.email) {
    const existing = await ExternalUser.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already exists." });
    }
  }

  // Update the external user
  const updatedUser = await ExternalUser.findByIdAndUpdate(
    id,
    {
      fullName,
      companyName,
      email,
      phone,
      address,
      contactPerson,
      updatedAt: new Date(),
    },
    { new: true }
  );

  return res.status(200).json({
    message: "External user updated successfully.",
    externalUser: {
      id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      companyName: updatedUser.companyName,
      address: updatedUser.address,
      contactPerson: updatedUser.contactPerson,
      role: updatedUser.role,
      status: updatedUser.status,
      warehouseId: updatedUser.warehouseId,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    },
  });
});

const deleteExternalUser = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;

  // Find the external user
  const externalUser = await ExternalUser.findById(id);
  if (!externalUser) {
    return res.status(404).json({ message: "External user not found." });
  }

  // For admin users, allow deletion regardless of warehouse
  // Check if user belongs to the same warehouse (convert both to strings for comparison)
  if (req.user.role !== 'admin') {
    const userWarehouseId = externalUser.warehouseId ? externalUser.warehouseId.toString() : null;
    const requestWarehouseId = req.user.assignedWarehouseId ? req.user.assignedWarehouseId.toString() : null;

    if (userWarehouseId !== requestWarehouseId) {
      console.log('Warehouse mismatch:', {
        externalUserWarehouse: userWarehouseId,
        requestUserWarehouse: requestWarehouseId,
        user: req.user
      });
      return res.status(403).json({ message: "Access denied." });
    }
  }

  // Delete the external user
  await ExternalUser.findByIdAndDelete(id);

  return res.status(200).json({
    message: "External user deleted successfully.",
  });
});

export { createTransporter, createSupplier, getAllExternalUsers, updateExternalUser, deleteExternalUser };
