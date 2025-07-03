import { Return } from "../models/returns.model.js";
import { Item } from "../models/item.model.js";
import { Product } from "../models/product.model.js";
import { Batch } from "../models/batch.model.js";
import { SalesHistory } from "../models/sales.history.model.js";
import { catchAsyncErrors } from "../middlewares/index.js"

export const createReturn = catchAsyncErrors(async (req, res) => {
  const {
    orderId,
    productId,
    batchId,
    warehouseId,
    quantity,
    returnedBy,
    reason,
    returnType, // 'defective', 'damaged', 'wrong_item', 'customer_request'
    refundAmount,
    referenceItemIds,
  } = req.body;

  if (!productId || !batchId || !warehouseId || !quantity || !reason) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  // Validate product and batch
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: "Product not found." });

  const batch = await Batch.findById(batchId);
  if (!batch) return res.status(404).json({ message: "Batch not found." });

  // If orderId provided, validate and update order
  let order = null;
  if (orderId) {
    const Order = (await import("../models/order.model.js")).Order;
    order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found." });
    
    // Update order status to returned/partially_returned
    const isFullReturn = order.items.every(item => 
      item.productId.toString() === productId && item.quantity === quantity
    );
    order.orderStatus = isFullReturn ? 'returned' : 'partially_returned';
    await order.save();
  }

  // Update item statuses and restore to inventory if applicable
  if (referenceItemIds && referenceItemIds.length > 0) {
    await Item.updateMany(
      { _id: { $in: referenceItemIds } },
      {
        $set: {
          status: returnType === 'defective' || returnType === 'damaged' ? "damaged" : "returned",
        },
        $push: {
          history: {
            action: "returned",
            notes: `Returned: ${reason}`,
            location: warehouseId.toString()
          },
        },
      }
    );

    // If items are not damaged, restore to inventory
    if (returnType !== 'defective' && returnType !== 'damaged') {
      // Find or create inventory record
      let inventory = await Inventory.findOne({ batchId, warehouseId });
      if (inventory) {
        inventory.quantity += quantity;
        await inventory.save();
      } else {
        await Inventory.create({
          batchId,
          quantity,
          warehouseId
        });
      }

      // Update product quantity
      product.quantity += quantity;
      await product.save();
    }
  }

  // Generate return number
  const returnNumber = `RET-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  // Save Return record
  const returnRecord = await Return.create({
    returnNumber,
    orderId,
    productId,
    batchId,
    warehouseId,
    quantity,
    returnedBy,
    reason,
    returnType,
    refundAmount,
    referenceItemIds,
    status: 'received'
  });

  // Log in SalesHistory
  await SalesHistory.create({
    productId,
    batchId,
    warehouseId,
    quantity,
    action: "returned",
    referenceItemIds,
    notes: `${returnType}: ${reason}`,
  });

  res.status(201).json({ 
    message: "Return recorded successfully", 
    returnRecord,
    returnNumber 
  });
});

export const getAllReturns = catchAsyncErrors(async (req, res) => {
  const returns = await Return.find()
    .populate("productId", "productName sku")
    .populate("batchId", "batchNumber")
    .populate("warehouseId", "warehouseName")
    .populate("returnedBy", "fullName email")
    .populate("referenceItemIds", "serialNumber status");

  res.status(200).json(returns);
});

export const getReturnById = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const returnRecord = await Return.findById(id)
    .populate("productId", "productName")
    .populate("batchId", "batchNumber")
    .populate("warehouseId", "warehouseName")
    .populate("returnedBy", "fullName email")
    .populate("referenceItemIds", "serialNumber status");

  if (!returnRecord) {
    return res.status(404).json({ message: "Return record not found." });
  }

  res.status(200).json(returnRecord);
});