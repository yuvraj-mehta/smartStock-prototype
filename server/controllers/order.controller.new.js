import { Order, Package, Product, Batch, Item, Inventory, Transport, SalesHistory, Return } from "../models/index.js";
import { catchAsyncErrors } from "../middlewares/index.js";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { logAudit } from '../utils/auditLogger.js';

// Create new order (manually entered by staff)
export const createOrder = catchAsyncErrors(async (req, res) => {
  const { platformOrderId, items, notes } = req.body;

  // Validate input
  if (!platformOrderId || !items || items.length === 0) {
    return res.status(400).json({ message: "Platform order ID and items are required" });
  }

  // Check if order already exists
  const existingOrder = await Order.findOne({ platformOrderId });
  if (existingOrder) {
    return res.status(400).json({ message: "Order with this platform ID already exists" });
  }

  // Validate all products exist
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      return res.status(404).json({ message: `Product not found: ${item.productId}` });
    }
  }

  // Create order
  const order = await Order.create({
    platformOrderId,
    items,
    notes,
    createdBy: req.user._id,
    orderStatus: 'pending'
  });

  // Audit log for order creation
  await logAudit({
    userId: req.user?._id,
    action: 'CREATE_ORDER',
    entityType: 'Order',
    entityId: order._id,
    value: order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
    details: { platformOrderId, items, notes }
  });

  res.status(201).json({
    message: "Order created successfully",
    order
  });
});

// Process order and create package
export const processOrder = catchAsyncErrors(async (req, res) => {
  const { orderId } = req.params;
  const { notes } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).populate('items.productId');
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.orderStatus !== 'pending') {
      return res.status(400).json({ message: "Order is not in pending status" });
    }

    let totalWeight = 0;
    let totalVolume = 0;
    let totalValue = 0;
    let allocatedItems = [];

    // Allocate inventory for each item using FIFO
    for (const orderItem of order.items) {
      const product = orderItem.productId;
      let remainingQuantity = orderItem.quantity;

      // Find available inventory batches (FIFO - oldest first)
      const inventoryBatches = await Inventory.find({})
        .populate({
          path: 'batchId',
          match: { productId: product._id },
          populate: { path: 'productId' }
        })
        .sort({ 'batchId.mfgDate': 1 });

      const validBatches = inventoryBatches.filter(inv => inv.batchId && inv.quantity > 0);

      if (validBatches.length === 0) {
        throw new Error(`No inventory available for product: ${product.productName}`);
      }

      let productAllocatedItems = [];

      for (const inventory of validBatches) {
        if (remainingQuantity <= 0) break;

        const availableQty = Math.min(inventory.quantity, remainingQuantity);

        // Find specific items to allocate
        const items = await Item.find({
          batchId: inventory.batchId._id,
          status: 'in_stock'
        }).limit(availableQty);

        if (items.length < availableQty) {
          throw new Error(`Insufficient physical items for product: ${product.productName}`);
        }

        // Update item statuses
        for (const item of items) {
          item.status = 'allocated';
          item.history.push({
            action: 'allocated',
            location: 'Processing',
            notes: `Allocated for order ${order.orderNumber}`
          });
          await item.save({ session });
        }

        productAllocatedItems.push({
          productId: product._id,
          batchId: inventory.batchId._id,
          quantity: availableQty,
          itemIds: items.map(item => item._id)
        });

        // Update inventory

        // No longer update inventory.quantity or product.quantity directly. Only Item.status is updated.

        remainingQuantity -= availableQty;

        // Calculate totals
        totalWeight += (product.weight || 0) * availableQty;
        totalVolume += (product.volume || 0) * availableQty;
        totalValue += (product.price || 0) * availableQty;
      }

      if (remainingQuantity > 0) {
        throw new Error(`Insufficient inventory for product: ${product.productName}`);
      }

      allocatedItems.push(...productAllocatedItems);
    }

    // Create package
    const packageDoc = await Package.create([{
      orderId: order._id,
      allocatedItems,
      totalWeight,
      totalVolume,
      totalValue,
      packedBy: req.user._id,
      notes
    }], { session });

    // Update order status
    order.orderStatus = 'processing';
    await order.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      message: "Order processed and package created successfully",
      order,
      package: packageDoc[0]
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Assign transport to package
export const assignTransport = catchAsyncErrors(async (req, res) => {
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

// Mark package as dispatched
export const dispatchPackage = catchAsyncErrors(async (req, res) => {
  const { packageId } = req.params;
  const { notes } = req.body;

  const packageDoc = await Package.findById(packageId).populate('orderId');
  if (!packageDoc) {
    return res.status(404).json({ message: "Package not found" });
  }

  const transport = await Transport.findOne({ packageId: packageDoc._id });
  if (!transport) {
    return res.status(404).json({ message: "Transport not found for this package" });
  }

  // Update statuses
  packageDoc.packageStatus = 'dispatched';
  await packageDoc.save();

  transport.status = 'dispatched';
  if (notes) transport.notes = notes;
  await transport.save();

  const order = packageDoc.orderId;
  order.orderStatus = 'dispatched';
  await order.save();

  res.status(200).json({
    message: "Package dispatched successfully",
    package: packageDoc,
    transport
  });
});

// Mark package as delivered
export const markDelivered = catchAsyncErrors(async (req, res) => {
  const { packageId } = req.params;
  const { notes } = req.body;

  const packageDoc = await Package.findById(packageId).populate('orderId');
  if (!packageDoc) {
    return res.status(404).json({ message: "Package not found" });
  }

  const transport = await Transport.findOne({ packageId: packageDoc._id });
  if (!transport) {
    return res.status(404).json({ message: "Transport not found for this package" });
  }

  // Update statuses
  packageDoc.packageStatus = 'delivered';
  await packageDoc.save();

  transport.status = 'delivered';
  transport.deliveredAt = new Date();
  if (notes) transport.notes = notes;
  await transport.save();

  const order = packageDoc.orderId;
  order.orderStatus = 'delivered';
  await order.save();

  res.status(200).json({
    message: "Package marked as delivered successfully",
    package: packageDoc,
    transport
  });
});

// Auto-confirm sale after 10 days (this would be called by a cron job)
export const autoConfirmSale = catchAsyncErrors(async (req, res) => {
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

  // Find all packages delivered more than 10 days ago that haven't been confirmed
  const packages = await Package.find({
    packageStatus: 'delivered',
    updatedAt: { $lt: tenDaysAgo }
  }).populate('orderId');

  let confirmedCount = 0;

  for (const packageDoc of packages) {
    const transport = await Transport.findOne({ packageId: packageDoc._id });
    if (!transport || !transport.deliveredAt) continue;

    const deliveryDate = new Date(transport.deliveredAt);
    const daysSinceDelivery = Math.floor((new Date() - deliveryDate) / (1000 * 60 * 60 * 24));

    if (daysSinceDelivery >= 10) {
      // Create sales history record
      await SalesHistory.create({
        packageId: packageDoc._id,
        orderId: packageDoc.orderId._id,
        products: packageDoc.allocatedItems,
        warehouseId: req.user.assignedWarehouseId,
        saleConfirmationDate: new Date(),
        deliveryDate: transport.deliveredAt,
        notes: 'Auto-confirmed after 10 days'
      });

      // Update order status
      packageDoc.orderId.orderStatus = 'sale_confirmed';
      await packageDoc.orderId.save();

      confirmedCount++;
    }
  }

  res.status(200).json({
    message: `${confirmedCount} sales confirmed automatically`,
    confirmedCount
  });
});

// Get all orders
export const getAllOrders = catchAsyncErrors(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (status) filter.orderStatus = status;

  const orders = await Order.find(filter)
    .populate('items.productId', 'productName sku')
    .populate('createdBy', 'fullName')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Order.countDocuments(filter);

  res.status(200).json({
    orders,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    total
  });
});

// Get order by ID
export const getOrderById = catchAsyncErrors(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId)
    .populate('items.productId')
    .populate('createdBy', 'fullName');

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  res.status(200).json({ order });
});
