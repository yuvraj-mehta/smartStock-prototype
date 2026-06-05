import { Order, Package, Product, Batch, Item, Inventory, Transport, SalesHistory, ExternalUser } from "../models/index.js";
import { catchAsyncErrors } from "../middlewares/index.js";
import mongoose from "mongoose";
import { logAudit } from '../utils/auditLogger.js';

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const runWithOptionalSession = (query, session) => (session ? query.session(session) : query);

const normalizeId = (id) => (id?._id || id)?.toString();

const getAssignedWarehouseId = (req) => normalizeId(req.user?.assignedWarehouseId);

const getInventoryValueForBatch = async (batchId, session) => {
  const items = await runWithOptionalSession(
    Item.find({ batchId, status: "in_stock" }).select("purchasePrice"),
    session
  );

  if (items.every((item) => typeof item.purchasePrice === "number")) {
    return items.reduce((sum, item) => sum + item.purchasePrice, 0);
  }

  const batch = await runWithOptionalSession(Batch.findById(batchId).select("unitCost"), session);
  return (batch?.unitCost || 0) * items.length;
};

const syncInventoryForBatch = async (batchId, warehouseId, session) => {
  const [quantity, inventoryValue] = await Promise.all([
    runWithOptionalSession(Item.countDocuments({ batchId, status: "in_stock" }), session),
    getInventoryValueForBatch(batchId, session),
  ]);

  await Inventory.updateOne(
    { batchId, warehouseId },
    {
      $set: { quantity, inventoryValue },
      $setOnInsert: { batchId, warehouseId },
    },
    { upsert: true, session }
  );
};

const uniqueIds = (ids) => [...new Set(ids.filter(Boolean).map(normalizeId).filter(Boolean))];

const getBatchWarehouseMap = async (batchIds, session) => {
  const ids = uniqueIds(batchIds);
  if (ids.length === 0) return new Map();

  const batches = await runWithOptionalSession(
    Batch.find({ _id: { $in: ids } }).select("warehouseId"),
    session
  );

  return new Map(batches.map((batch) => [batch._id.toString(), batch.warehouseId]));
};

const ensurePackageWarehouseAccess = async (packageDoc, assignedWarehouseId, session) => {
  if (!assignedWarehouseId) return await getBatchWarehouseMap(packageDoc.allocatedItems?.map((item) => item.batchId), session);

  const batchIds = uniqueIds(packageDoc.allocatedItems?.map((item) => item.batchId) || []);
  const batchWarehouseMap = await getBatchWarehouseMap(batchIds, session);

  if (batchIds.length > 0 && batchWarehouseMap.size !== batchIds.length) {
    throw httpError(400, "Package contains an unknown inventory batch.");
  }

  const hasOutOfScopeBatch = [...batchWarehouseMap.values()].some(
    (warehouseId) => warehouseId?.toString() !== assignedWarehouseId.toString()
  );

  if (hasOutOfScopeBatch) {
    throw httpError(403, "Access denied for this warehouse.");
  }

  return batchWarehouseMap;
};

const ensureTransporterWarehouseAccess = async (transporterId, assignedWarehouseId, session) => {
  if (!assignedWarehouseId) return;

  const transporter = await runWithOptionalSession(
    ExternalUser.findById(transporterId).select("role warehouseId"),
    session
  );

  if (!transporter || transporter.role !== "transporter") {
    throw httpError(404, "Transporter not found.");
  }

  if (transporter.warehouseId && transporter.warehouseId.toString() !== assignedWarehouseId.toString()) {
    throw httpError(403, "Transporter is not assigned to this warehouse.");
  }
};

const applyScopedOrderFilter = async (filter, req) => {
  const assignedWarehouseId = getAssignedWarehouseId(req);
  if (!assignedWarehouseId) return filter;

  const batchIds = await Batch.find({ warehouseId: assignedWarehouseId }).distinct("_id");
  const packageOrderIds = await Package.find({ "allocatedItems.batchId": { $in: batchIds } }).distinct("orderId");

  return {
    ...filter,
    $or: [
      { _id: { $in: packageOrderIds } },
      { orderStatus: "pending", createdBy: req.user._id },
    ],
  };
};

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
  const assignedWarehouseId = getAssignedWarehouseId(req);

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await Order.findById(orderId).populate('items.productId').session(session);
    if (!order) {
      throw httpError(404, "Order not found");
    }

    if (order.orderStatus !== 'pending') {
      throw httpError(400, "Order is not in pending status");
    }

    let totalWeight = 0;
    let totalVolume = 0;
    let totalValue = 0;
    const allocatedItems = [];

    // Allocate inventory for each item using FIFO. Item.status is the source of truth for availability.
    for (const orderItem of order.items) {
      const product = orderItem.productId;
      let remainingQuantity = orderItem.quantity;

      const batchQuery = { productId: product._id };
      if (assignedWarehouseId) batchQuery.warehouseId = assignedWarehouseId;

      const batches = await Batch.find(batchQuery)
        .sort({ mfgDate: 1, receivedAt: 1, createdAt: 1 })
        .session(session);

      const productAllocatedItems = [];

      for (const batch of batches) {
        if (remainingQuantity <= 0) break;

        const items = await Item.find({
          batchId: batch._id,
          productId: product._id,
          status: 'in_stock'
        })
          .limit(remainingQuantity)
          .session(session);

        if (items.length === 0) continue;

        const itemIds = items.map((item) => item._id);
        const now = new Date();
        const updateResult = await Item.updateMany(
          { _id: { $in: itemIds }, status: 'in_stock' },
          {
            $set: { status: 'allocated' },
            $push: {
              history: {
                action: 'allocated',
                location: batch.warehouseId?.toString() || 'Processing',
                notes: `Allocated for order ${order.orderNumber}`,
                date: now
              }
            }
          },
          { session }
        );

        const modifiedCount = updateResult.modifiedCount ?? updateResult.nModified ?? 0;
        if (modifiedCount !== itemIds.length) {
          throw httpError(409, `Inventory changed while allocating product: ${product.productName}`);
        }

        await syncInventoryForBatch(batch._id, batch.warehouseId, session);

        productAllocatedItems.push({
          productId: product._id,
          batchId: batch._id,
          quantity: itemIds.length,
          itemIds
        });

        remainingQuantity -= itemIds.length;
        totalWeight += (product.weight || 0) * itemIds.length;
        totalVolume += (product.volume || 0) * itemIds.length;
        totalValue += (product.price || 0) * itemIds.length;
      }

      if (remainingQuantity > 0) {
        throw httpError(400, `Insufficient in-stock inventory for product: ${product.productName}`);
      }

      allocatedItems.push(...productAllocatedItems);
    }

    const [packageDoc] = await Package.create([{
      orderId: order._id,
      allocatedItems,
      totalWeight,
      totalVolume,
      totalValue,
      packedBy: req.user._id,
      notes
    }], { session });

    order.orderStatus = 'processing';
    await order.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      message: "Order processed and package created successfully",
      order,
      package: packageDoc
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(error.statusCode || 400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Assign transport to package
export const assignTransport = catchAsyncErrors(async (req, res) => {
  const { packageId } = req.params;
  const { transporterId, notes } = req.body;
  const assignedWarehouseId = getAssignedWarehouseId(req);

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const packageDoc = await Package.findById(packageId).populate('orderId').session(session);
    if (!packageDoc) {
      throw httpError(404, "Package not found");
    }

    if (packageDoc.packageStatus !== 'ready_for_dispatch') {
      throw httpError(400, "Package is not ready for transport assignment");
    }

    await ensurePackageWarehouseAccess(packageDoc, assignedWarehouseId, session);
    await ensureTransporterWarehouseAccess(transporterId, assignedWarehouseId, session);

    const [transport] = await Transport.create([{
      packageId: packageDoc._id,
      transporterId,
      transportType: 'forward',
      assignedBy: req.user._id,
      notes
    }], { session });

    packageDoc.packageStatus = 'dispatched';
    await packageDoc.save({ session });

    const order = packageDoc.orderId;
    order.orderStatus = 'dispatched';
    await order.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      message: "Transport assigned successfully",
      transport,
      package: packageDoc
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(error.statusCode || 400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Mark package as dispatched
export const dispatchPackage = catchAsyncErrors(async (req, res) => {
  const { packageId } = req.params;
  const { notes } = req.body;
  const assignedWarehouseId = getAssignedWarehouseId(req);

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const packageDoc = await Package.findById(packageId).populate('orderId').session(session);
    if (!packageDoc) {
      throw httpError(404, "Package not found");
    }

    await ensurePackageWarehouseAccess(packageDoc, assignedWarehouseId, session);

    const transport = await Transport.findOne({ packageId: packageDoc._id }).session(session);
    if (!transport) {
      throw httpError(404, "Transport not found for this package");
    }

    packageDoc.packageStatus = 'dispatched';
    await packageDoc.save({ session });

    transport.status = 'dispatched';
    if (notes) transport.notes = notes;
    await transport.save({ session });

    const order = packageDoc.orderId;
    order.orderStatus = 'dispatched';
    await order.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      message: "Package dispatched successfully",
      package: packageDoc,
      transport
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(error.statusCode || 400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Mark package as delivered
export const markDelivered = catchAsyncErrors(async (req, res) => {
  const { packageId } = req.params;
  const { notes } = req.body;
  const assignedWarehouseId = getAssignedWarehouseId(req);

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const packageDoc = await Package.findById(packageId).populate('orderId').session(session);
    if (!packageDoc) {
      throw httpError(404, "Package not found");
    }

    const batchWarehouseMap = await ensurePackageWarehouseAccess(packageDoc, assignedWarehouseId, session);

    const transport = await Transport.findOne({ packageId: packageDoc._id }).session(session);
    if (!transport) {
      throw httpError(404, "Transport not found for this package");
    }

    packageDoc.packageStatus = 'delivered';
    await packageDoc.save({ session });

    transport.status = 'delivered';
    transport.deliveredAt = new Date();
    if (notes) transport.notes = notes;
    await transport.save({ session });

    const order = packageDoc.orderId;
    order.orderStatus = 'delivered';
    await order.save({ session });

    if (Array.isArray(packageDoc.allocatedItems)) {
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
            },
            { session }
          );

          const warehouseId = batchWarehouseMap.get(normalizeId(alloc.batchId));
          if (warehouseId) {
            await syncInventoryForBatch(alloc.batchId, warehouseId, session);
          }
        }
      }
    }

    await session.commitTransaction();

    res.status(200).json({
      message: "Package marked as delivered successfully",
      package: packageDoc,
      transport
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(error.statusCode || 400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Auto-confirm sale after 10 days (this would be called by a cron job)
export const autoConfirmSale = catchAsyncErrors(async (req, res) => {
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

  const packages = await Package.find({
    packageStatus: 'delivered',
    updatedAt: { $lt: tenDaysAgo }
  }).populate('orderId');

  let confirmedCount = 0;
  const assignedWarehouseId = getAssignedWarehouseId(req);

  for (const packageDoc of packages) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const scopedPackage = await Package.findById(packageDoc._id).populate('orderId').session(session);
      if (!scopedPackage) throw httpError(404, "Package not found");

      const batchWarehouseMap = await ensurePackageWarehouseAccess(scopedPackage, assignedWarehouseId, session);
      const transport = await Transport.findOne({ packageId: scopedPackage._id }).session(session);
      if (!transport || !transport.deliveredAt) {
        await session.abortTransaction();
        continue;
      }

      const deliveryDate = new Date(transport.deliveredAt);
      const daysSinceDelivery = Math.floor((new Date() - deliveryDate) / (1000 * 60 * 60 * 24));

      if (daysSinceDelivery < 10) {
        await session.abortTransaction();
        continue;
      }

      const fallbackWarehouseId = batchWarehouseMap.values().next().value;

      await SalesHistory.create([{
        packageId: scopedPackage._id,
        orderId: scopedPackage.orderId._id,
        products: scopedPackage.allocatedItems,
        warehouseId: assignedWarehouseId || fallbackWarehouseId,
        saleConfirmationDate: new Date(),
        deliveryDate: transport.deliveredAt,
        notes: 'Auto-confirmed after 10 days'
      }], { session });

      scopedPackage.orderId.orderStatus = 'sale_confirmed';
      await scopedPackage.orderId.save({ session });

      await session.commitTransaction();
      confirmedCount++;
    } catch (error) {
      await session.abortTransaction();
      if (error.statusCode !== 403) {
        throw error;
      }
    } finally {
      session.endSession();
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

  let filter = {};
  if (status) filter.orderStatus = status;
  filter = await applyScopedOrderFilter(filter, req);

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
  const assignedWarehouseId = getAssignedWarehouseId(req);

  const order = await Order.findById(orderId)
    .populate('items.productId')
    .populate('createdBy', 'fullName');

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (assignedWarehouseId) {
    const packages = await Package.find({ orderId: order._id });
    if (packages.length === 0 && order.createdBy?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied for this warehouse." });
    }

    for (const packageDoc of packages) {
      await ensurePackageWarehouseAccess(packageDoc, assignedWarehouseId);
    }
  }

  res.status(200).json({ order });
});
