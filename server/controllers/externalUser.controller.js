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
    warehouseId,
  } = req.body;

  // Check if email already exists
  const existing = await ExternalUser.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: "Transporter with this email already exists." });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create the transporter
  const newTransporter = await ExternalUser.create({
    fullName,
    companyName,
    email,
    password: hashedPassword,
    phone,
    role: "transporter",
    warehouseId,
  });

  return res.status(201).json({
    message: "Transporter created successfully.",
    transporter: {
      id: newTransporter._id,
      fullName: newTransporter.fullName,
      email: newTransporter.email,
      phone: newTransporter.phone,
      companyName: newTransporter.companyName,
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
    warehouseId,
  } = req.body;

  // 2. Check if email already exists
  const existing = await ExternalUser.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: "Supplier with this email already exists." });
  }

  // 3. Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // 4. Create the supplier
  const newSupplier = await ExternalUser.create({
    fullName,
    companyName,
    email,
    password: hashedPassword,
    phone,
    role: "supplier",
    warehouseId,
  });

  return res.status(201).json({
    message: "Supplier created successfully.",
    supplier: {
      id: newSupplier._id,
      fullName: newSupplier.fullName,
      email: newSupplier.email,
      phone: newSupplier.phone,
      companyName: newSupplier.companyName,
      warehouseId: newSupplier.warehouseId,
      status: newSupplier.status,
    },
  });
});

export { createTransporter, createSupplier };
