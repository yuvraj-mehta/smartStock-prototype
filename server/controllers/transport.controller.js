import { Transport, Package, Order } from "../models/index.js";
import { catchAsyncErrors } from "../middlewares/index.js";

// Get all transports
export const getAllTransports = catchAsyncErrors(async (req, res) => {
  const { status, transportType, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (transportType) filter.transportType = transportType;

  // If user is a transporter, only show their assigned transports
  if (req.user.role === "transporter") {
    filter.transporterId = req.user._id;
  }

  const transports = await Transport.find(filter)
    .populate('packageId', 'packageId')
    .populate('transporterId', 'fullName companyName')
    .populate('assignedBy', 'fullName')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Transport.countDocuments(filter);

  res.status(200).json({
    transports,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    total
  });
});

// Get transport by ID
export const getTransportById = catchAsyncErrors(async (req, res) => {
  const { transportId } = req.params;

  const transport = await Transport.findById(transportId)
    .populate('packageId')
    .populate('transporterId', 'fullName companyName phone')
    .populate('assignedBy', 'fullName');

  if (!transport) {
    return res.status(404).json({ message: "Transport not found" });
  }

  res.status(200).json({ transport });
});

// Update transport status (for transporters)
export const updateTransportStatus = catchAsyncErrors(async (req, res) => {
  const { transportId } = req.params;
  const { status, notes } = req.body;

  const transport = await Transport.findById(transportId);
  if (!transport) {
    return res.status(404).json({ message: "Transport not found" });
  }

  // Check if user is authorized to update this transport
  if (req.user.role === "transporter" && transport.transporterId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Not authorized to update this transport" });
  }

  const allowedStatuses = ["dispatched", "in_transit", "delivered"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }

  const previousStatus = transport.status;
  transport.status = status;
  if (notes) transport.notes = notes;

  // Update timestamps based on status
  if (status === "delivered") {
    transport.deliveredAt = new Date();
  }

  // Add to status history
  transport.statusHistory.push({
    status: status,
    timestamp: new Date(),
    notes: notes,
    updatedBy: req.user._id
  });

  await transport.save();

  // Update associated package and order status
  const packageDoc = await Package.findById(transport.packageId).populate('orderId');
  if (packageDoc) {
    if (status === "in_transit") {
      packageDoc.packageStatus = 'in_transit';
      packageDoc.orderId.orderStatus = 'dispatched';
    } else if (status === "delivered") {
      packageDoc.packageStatus = 'delivered';
      packageDoc.orderId.orderStatus = 'delivered';
      // Update all items in the package to status 'delivered'
      if (Array.isArray(packageDoc.allocatedItems)) {
        const { Item } = await import('../models/item.model.js');
        for (const alloc of packageDoc.allocatedItems) {
          if (Array.isArray(alloc.itemIds) && alloc.itemIds.length > 0) {
            await Item.updateMany(
              { _id: { $in: alloc.itemIds } },
              {
                $set: { status: 'delivered' },
                $push: {
                  history: {
                    action: 'delivered',
                    location: 'Customer',
                    notes: `Delivered via package ${packageDoc.packageId}`,
                    date: new Date()
                  }
                }
              }
            );
          }
        }
      }
    }

    await packageDoc.save();
    await packageDoc.orderId.save();
  }

  res.status(200).json({
    message: "Transport status updated successfully",
    transport,
    previousStatus,
    newStatus: status
  });
});

// Get transports by package ID
export const getTransportsByPackageId = catchAsyncErrors(async (req, res) => {
  const { packageId } = req.params;

  const transports = await Transport.find({ packageId })
    .populate('transporterId', 'fullName companyName')
    .populate('assignedBy', 'fullName')
    .sort({ createdAt: -1 });

  res.status(200).json({ transports });
});
