import { Package, Order, Transport } from "../models/index.js";
import { catchAsyncErrors } from "../middlewares/index.js";

// Get all packages
export const getAllPackages = catchAsyncErrors(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (status) filter.packageStatus = status;

  const packages = await Package.find(filter)
    .populate('orderId', 'orderNumber platformOrderId')
    .populate('packedBy', 'fullName')
    .populate('allocatedItems.productId', 'productName sku')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Package.countDocuments(filter);

  res.status(200).json({
    packages,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    total
  });
});

// Get package by ID
export const getPackageById = catchAsyncErrors(async (req, res) => {
  const { packageId } = req.params;

  const packageDoc = await Package.findById(packageId)
    .populate('orderId')
    .populate('packedBy', 'fullName')
    .populate('allocatedItems.productId')
    .populate('allocatedItems.batchId')
    .populate('allocatedItems.itemIds');

  if (!packageDoc) {
    return res.status(404).json({ message: "Package not found" });
  }

  // Get transport info if available
  const transport = await Transport.findOne({ packageId: packageDoc._id })
    .populate('transporterId', 'fullName companyName');

  res.status(200).json({
    package: packageDoc,
    transport
  });
});

// Get packages by order ID
export const getPackagesByOrderId = catchAsyncErrors(async (req, res) => {
  const { orderId } = req.params;

  const packages = await Package.find({ orderId })
    .populate('packedBy', 'fullName')
    .populate('allocatedItems.productId', 'productName sku')
    .sort({ createdAt: -1 });

  res.status(200).json({ packages });
});

// Update package status
export const updatePackageStatus = catchAsyncErrors(async (req, res) => {
  const { packageId } = req.params;
  const { status, notes } = req.body;

  const packageDoc = await Package.findById(packageId);
  if (!packageDoc) {
    return res.status(404).json({ message: "Package not found" });
  }

  const validStatuses = ['created', 'ready_for_dispatch', 'dispatched', 'in_transit', 'delivered', 'returned'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid package status" });
  }

  packageDoc.packageStatus = status;
  if (notes) packageDoc.notes = notes;
  await packageDoc.save();

  res.status(200).json({
    message: "Package status updated successfully",
    package: packageDoc
  });
});
