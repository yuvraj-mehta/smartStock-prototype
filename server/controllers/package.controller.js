import { Package, Transport, Item, Order } from "../models/index.js";
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

  // Only allow packing to 'ready_for_dispatch'
  if (status !== 'ready_for_dispatch') {
    return res.status(400).json({ message: "Only packing to 'ready_for_dispatch' is supported." });
  }

  const packageDoc = await Package.findById(packageId).populate('orderId');
  if (!packageDoc) {
    return res.status(404).json({ message: "Package not found" });
  }

  // Prevent double-packing
  if (packageDoc.packageStatus === 'ready_for_dispatch') {
    return res.status(400).json({ message: "Package is already packed." });
  }
  if (packageDoc.packageStatus !== 'created') {
    return res.status(400).json({ message: `Cannot pack package in status: ${packageDoc.packageStatus}` });
  }

  // Update all items in the package to 'packed' and log the action
  for (const alloc of packageDoc.allocatedItems) {
    if (alloc.itemIds && alloc.itemIds.length > 0) {
      await Item.updateMany(
        { _id: { $in: alloc.itemIds } },
        {
          $set: { status: 'packed' },
          $push: { history: { action: 'packed', date: new Date(), notes: notes || '' } }
        }
      );
    }
  }

  // Update package fields
  packageDoc.packageStatus = 'ready_for_dispatch';
  packageDoc.packedBy = req.user?._id || null;
  packageDoc.packedAt = new Date();
  if (notes) packageDoc.notes = notes;
  await packageDoc.save();

  // If all packages for the order are packed, update order status
  const order = packageDoc.orderId;
  const allPackages = await Package.find({ orderId: order._id });
  const allPacked = allPackages.every(pkg => pkg.packageStatus === 'ready_for_dispatch');
  if (allPacked && order.orderStatus !== 'packaged') {
    order.orderStatus = 'packaged';
    await order.save();
  }

  res.status(200).json({
    message: "Package packed successfully",
    package: packageDoc,
    order: order
  });
});

// Assign or reassign a transporter to a package
export const assignOrReassignTransport = catchAsyncErrors(async (req, res) => {
  const { packageId } = req.params;
  const { transporterId, notes } = req.body;

  const packageDoc = await Package.findById(packageId).populate('orderId');
  if (!packageDoc) {
    return res.status(404).json({ message: "Package not found" });
  }

  // Allow assigning/reassigning transporter if package is not delivered or returned
  if (["delivered", "returned"].includes(packageDoc.packageStatus)) {
    return res.status(400).json({ message: "Cannot assign transporter to a delivered or returned package." });
  }

  // Remove any previous transport assignment for this package
  await Transport.deleteMany({ packageId: packageDoc._id });

  // Create new transport assignment
  const transport = await Transport.create({
    packageId: packageDoc._id,
    transporterId,
    transportType: 'forward',
    assignedBy: req.user._id,
    status: 'dispatched',
    notes
  });

  // If package is not already dispatched, update status
  if (packageDoc.packageStatus !== 'dispatched') {
    packageDoc.packageStatus = 'dispatched';
    await packageDoc.save();
  }

  // If order is not already dispatched, update status
  const order = packageDoc.orderId;
  if (order && order.orderStatus !== 'dispatched') {
    order.orderStatus = 'dispatched';
    await order.save();
  }

  res.status(200).json({
    message: "Transporter assigned/reassigned successfully",
    transport,
    package: packageDoc
  });
});
