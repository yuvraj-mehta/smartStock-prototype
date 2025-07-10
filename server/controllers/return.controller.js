import { Return, Package, Order, Product, Batch, Item, Inventory, Transport } from "../models/index.js";
import { catchAsyncErrors } from "../middlewares/index.js";
import mongoose from "mongoose";
import { logAudit } from '../utils/auditLogger.js';

// Initiate return within 10 days of delivery
export const initiateReturn = catchAsyncErrors(async (req, res) => {
  const { packageId, returnedItems, returnReason, notes } = req.body;


  // Validate input
  if (!packageId || !returnedItems || returnedItems.length === 0 || !returnReason) {
    return res.status(400).json({ message: "Package ID, returned items, and return reason are required" });
  }

  // Check if a return already exists for this package
  const existingReturn = await Return.findOne({ packageId });
  if (existingReturn) {
    return res.status(409).json({ message: "A return already exists for this package." });
  }

  const packageDoc = await Package.findById(packageId).populate('orderId');
  if (!packageDoc) {
    return res.status(404).json({ message: "Package not found" });
  }

  if (packageDoc.packageStatus !== 'delivered') {
    return res.status(400).json({ message: "Package is not delivered yet" });
  }

  // Check if return is within 10 days
  const transport = await Transport.findOne({ packageId: packageDoc._id });
  if (!transport || !transport.deliveredAt) {
    return res.status(400).json({ message: "Delivery date not found" });
  }

  const deliveryDate = new Date(transport.deliveredAt);
  const daysSinceDelivery = Math.floor((new Date() - deliveryDate) / (1000 * 60 * 60 * 24));

  if (daysSinceDelivery > 10) {
    return res.status(400).json({ message: "Return window has expired (10 days)" });
  }

  // Validate returned items against package items
  for (const returnItem of returnedItems) {
    const packageItem = packageDoc.allocatedItems.find(
      item => item.productId.toString() === returnItem.productId &&
        item.batchId.toString() === returnItem.batchId
    );

    if (!packageItem) {
      return res.status(400).json({ message: `Product not found in original package: ${returnItem.productId}` });
    }

    if (returnItem.quantity > packageItem.quantity) {
      return res.status(400).json({ message: `Return quantity exceeds original quantity for product: ${returnItem.productId}` });
    }
  }

  // Create return record
  const returnRecord = await Return.create({
    packageId: packageDoc._id,
    orderId: packageDoc.orderId._id,
    returnedItems,
    returnReason,
    returnStatus: 'initiated',
    warehouseId: req.user.assignedWarehouseId,
    notes
  });

  // Audit log for return creation
  await logAudit({
    userId: req.user?._id,
    action: 'CREATE_RETURN',
    entityType: 'Return',
    entityId: returnRecord._id,
    value: returnedItems.reduce((sum, item) => sum + (item.quantity || 0), 0),
    details: { packageId, returnedItems, returnReason, notes }
  });

  // Update order status
  packageDoc.orderId.orderStatus = 'returned';
  await packageDoc.orderId.save();

  res.status(201).json({
    message: "Return initiated successfully",
    return: returnRecord
  });
});

// Schedule pickup for return
export const schedulePickup = catchAsyncErrors(async (req, res) => {
  const { returnId } = req.params;
  const { transporterId, notes } = req.body;

  const returnRecord = await Return.findById(returnId).populate('packageId');
  if (!returnRecord) {
    return res.status(404).json({ message: "Return not found" });
  }

  if (returnRecord.returnStatus !== 'initiated') {
    return res.status(400).json({ message: "Return is not in initiated status" });
  }

  // Create reverse transport
  const transport = await Transport.create({
    packageId: returnRecord.packageId._id,
    transporterId,
    transportType: 'reverse',
    assignedBy: req.user._id,
    notes
  });

  // Update return record
  returnRecord.returnStatus = 'pickup_scheduled';
  returnRecord.transportId = transport._id;
  await returnRecord.save();

  res.status(200).json({
    message: "Pickup scheduled successfully",
    return: returnRecord,
    transport
  });
});

// Mark return as picked up
export const markPickedUp = catchAsyncErrors(async (req, res) => {
  const { returnId } = req.params;
  const { notes } = req.body;

  const returnRecord = await Return.findById(returnId).populate('transportId');
  if (!returnRecord) {
    return res.status(404).json({ message: "Return not found" });
  }

  if (returnRecord.returnStatus !== 'pickup_scheduled') {
    return res.status(400).json({ message: "Return is not scheduled for pickup" });
  }

  // Update transport status
  const transport = returnRecord.transportId;
  transport.status = 'in_transit';
  if (notes) transport.notes = notes;
  await transport.save();

  // Update return status
  returnRecord.returnStatus = 'picked_up';
  await returnRecord.save();

  res.status(200).json({
    message: "Return marked as picked up successfully",
    return: returnRecord
  });
});

// Process return at warehouse
export const processReturn = catchAsyncErrors(async (req, res) => {
  const { returnId } = req.params;
  const { notes } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const returnRecord = await Return.findById(returnId)
      .populate('packageId')
      .populate('orderId')
      .populate('transportId');

    if (!returnRecord) {
      return res.status(404).json({ message: "Return not found" });
    }

    if (returnRecord.returnStatus !== 'picked_up') {
      return res.status(400).json({ message: "Return is not picked up yet" });
    }

    // Update transport status
    const transport = returnRecord.transportId;
    transport.status = 'delivered';
    transport.deliveredAt = new Date();
    await transport.save({ session });

    // Update return status
    returnRecord.returnStatus = 'received';
    returnRecord.receivedDate = new Date();
    await returnRecord.save({ session });

    // Process each returned item
    for (const returnedItem of returnRecord.returnedItems) {
      // Find the original allocated items
      const originalItem = returnRecord.packageId.allocatedItems.find(
        item => item.productId.toString() === returnedItem.productId.toString() &&
          item.batchId.toString() === returnedItem.batchId.toString()
      );

      if (!originalItem) continue;

      // Update item statuses back to in_stock
      const itemsToUpdate = originalItem.itemIds.slice(0, returnedItem.quantity);

      await Item.updateMany(
        { _id: { $in: itemsToUpdate } },
        {
          $set: { status: 'in_stock' },
          $push: {
            history: {
              action: 'returned',
              location: 'Warehouse',
              notes: `Returned from order ${returnRecord.orderId.orderNumber}`,
              date: new Date()
            }
          }
        },
        { session }
      );

      // Update inventory
      let inventory = await Inventory.findOne({
        batchId: returnedItem.batchId,
        warehouseId: returnRecord.warehouseId
      });

      if (inventory) {
        // No longer update inventory.quantity directly. Only Item.status is updated.
      } else {
        await Inventory.create([{
          batchId: returnedItem.batchId,
          quantity: returnedItem.quantity,
          warehouseId: returnRecord.warehouseId
        }], { session });
      }

      // Update product quantity
      const product = await Product.findById(returnedItem.productId);
      if (product) {
        // No longer update product.quantity directly. Only Item.status is updated.
      }
    }

    // Update return status to processed
    returnRecord.returnStatus = 'processed';
    returnRecord.processedDate = new Date();
    returnRecord.processedBy = req.user._id;
    if (notes) returnRecord.notes = notes;
    await returnRecord.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      message: "Return processed successfully",
      return: returnRecord
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
});

// Get all returns
export const getAllReturns = catchAsyncErrors(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (status) filter.returnStatus = status;

  const returns = await Return.find(filter)
    .populate({
      path: 'packageId',
      select: 'packageId allocatedItems',
      populate: {
        path: 'allocatedItems.productId',
        select: 'productName price',
      }
    })
    .populate('orderId', 'orderNumber')
    .populate('processedBy', 'fullName')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Return.countDocuments(filter);

  res.status(200).json({
    returns,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    total
  });
});

// Get return by ID
export const getReturnById = catchAsyncErrors(async (req, res) => {
  const { returnId } = req.params;

  const returnRecord = await Return.findById(returnId)
    .populate('packageId')
    .populate('orderId')
    .populate('transportId')
    .populate('processedBy', 'fullName')
    .populate('returnedItems.productId', 'productName sku')
    .populate('returnedItems.batchId', 'batchNumber');

  if (!returnRecord) {
    return res.status(404).json({ message: "Return not found" });
  }

  res.status(200).json({ return: returnRecord });
});