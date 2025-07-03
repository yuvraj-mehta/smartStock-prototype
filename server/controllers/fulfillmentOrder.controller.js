import { FulfillmentOrder } from "../models/fulfillmentOrder.model.js";
import { Product } from "../models/product.model.js";
import { Batch } from "../models/batch.model.js";
import { Item } from "../models/item.model.js";
import { Inventory } from "../models/inventory.model.js";
import { Transport } from "../models/transport.model.js";
import { SalesHistory } from "../models/sales.history.model.js";
import { catchAsyncErrors } from "../middlewares/index.js";
import { v4 as uuidv4 } from "uuid";

// Receive order from e-commerce platform (manual entry by staff)
export const receiveOrder = catchAsyncErrors(async (req, res) => {
  const {
    platformOrderId,
    platform,
    customerInfo,
    shippingAddress,
    items,
    subtotal,
    tax,
    shipping,
    total,
    priority,
    specialInstructions
  } = req.body;

  // Check if order already exists
  const existingOrder = await FulfillmentOrder.findOne({ platformOrderId });
  if (existingOrder) {
    return res.status(400).json({
      message: "Order already exists in system",
      existingOrder: existingOrder.orderNumber
    });
  }

  // Validate all products exist and are available
  let processedItems = [];
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      return res.status(404).json({
        message: `Product not found: ${item.sku}`
      });
    }

    // Check if sufficient inventory exists
    const totalInventory = await Inventory.aggregate([
      {
        $lookup: {
          from: 'batches',
          localField: 'batchId',
          foreignField: '_id',
          as: 'batch'
        }
      },
      {
        $match: {
          'batch.productId': product._id
        }
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);

    const availableQty = totalInventory.length > 0 ? totalInventory[0].totalQuantity : 0;
    if (availableQty < item.quantity) {
      return res.status(400).json({
        message: `Insufficient inventory for ${product.productName}. Available: ${availableQty}, Required: ${item.quantity}`
      });
    }

    processedItems.push({
      productId: item.productId,
      sku: product.sku,
      productName: product.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice
    });
  }

  // Create fulfillment order
  const order = await FulfillmentOrder.create({
    platformOrderId,
    platform,
    customerInfo,
    shippingAddress,
    items: processedItems,
    subtotal,
    tax,
    shipping,
    total,
    priority,
    specialInstructions,
    receivedBy: req.user._id,
    orderStatus: 'received'
  });

  res.status(201).json({
    message: "Order received successfully",
    orderNumber: order.orderNumber,
    order
  });
});

// Process order (allocate inventory and pack)
export const processOrder = catchAsyncErrors(async (req, res) => {
  const { orderNumber } = req.params;
  const { packingNotes } = req.body;

  const order = await FulfillmentOrder.findOne({ orderNumber })
    .populate('items.productId');

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.orderStatus !== 'received') {
    return res.status(400).json({
      message: `Order cannot be processed. Current status: ${order.orderStatus}`
    });
  }

  // Allocate inventory for each item (FIFO)
  for (let i = 0; i < order.items.length; i++) {
    const orderItem = order.items[i];

    // Find available inventory batches (FIFO - oldest first)
    const inventoryBatches = await Inventory.find({})
      .populate({
        path: 'batchId',
        match: { productId: orderItem.productId._id },
        options: { sort: { mfgDate: 1 } } // FIFO
      })
      .sort({ 'batchId.mfgDate': 1 });

    let remainingQty = orderItem.quantity;
    let allocatedItems = [];

    for (const inventory of inventoryBatches) {
      if (!inventory.batchId || remainingQty <= 0) continue;

      const availableQty = Math.min(inventory.quantity, remainingQty);

      // Find specific items to allocate
      const items = await Item.find({
        batchId: inventory.batchId._id,
        status: 'in_stock'
      }).limit(availableQty);

      // Update item statuses
      for (const item of items) {
        item.status = 'allocated';
        item.history.push({
          action: 'allocated',
          location: 'Processing',
          notes: `Allocated for order ${order.orderNumber}`
        });
        await item.save();
        allocatedItems.push(item._id);
      }

      // Update inventory
      inventory.quantity -= availableQty;
      await inventory.save();

      // Update product quantity
      const product = await Product.findById(orderItem.productId._id);
      product.quantity -= availableQty;
      await product.save();

      remainingQty -= availableQty;

      // Set batch for this order item
      if (!orderItem.batchId) {
        orderItem.batchId = inventory.batchId._id;
      }
    }

    // Update order item with allocated items
    orderItem.allocatedItemIds = allocatedItems;
  }

  // Update order status
  order.orderStatus = 'processing';
  order.processedAt = new Date();
  order.processedBy = req.user._id;
  order.packingNotes = packingNotes;

  // Calculate processing time
  const processingTime = (order.processedAt - order.receivedAt) / (1000 * 60); // minutes
  order.processingTimes.orderToProcessing = processingTime;

  await order.save();

  res.status(200).json({
    message: "Order processed and inventory allocated",
    order
  });
});

// Pack order
export const packOrder = catchAsyncErrors(async (req, res) => {
  const { orderNumber } = req.params;
  const { packingNotes, specialPackaging } = req.body;

  const order = await FulfillmentOrder.findOne({ orderNumber });

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.orderStatus !== 'processing') {
    return res.status(400).json({
      message: `Order cannot be packed. Current status: ${order.orderStatus}`
    });
  }

  // Generate package details
  const packageId = `PKG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  // Update item statuses to packed
  for (const orderItem of order.items) {
    await Item.updateMany(
      { _id: { $in: orderItem.allocatedItemIds } },
      {
        $set: { status: 'packed' },
        $push: {
          history: {
            action: 'packed',
            location: 'Packing Station',
            notes: `Packed for shipment - Package: ${packageId}`
          }
        }
      }
    );
  }

  // Update order
  order.orderStatus = 'packed';
  order.packedAt = new Date();
  order.packedBy = req.user._id;
  order.packageId = packageId;
  if (packingNotes) order.packingNotes = packingNotes;

  // Calculate packing time
  const packingTime = (order.packedAt - order.processedAt) / (1000 * 60); // minutes
  order.processingTimes.processingToPacked = packingTime;

  await order.save();

  res.status(200).json({
    message: "Order packed successfully",
    packageId,
    order
  });
});

// Ship order
export const shipOrder = catchAsyncErrors(async (req, res) => {
  const { orderNumber } = req.params;
  const { transporterId, shippingMethod, shippingNotes } = req.body;

  const order = await FulfillmentOrder.findOne({ orderNumber });

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.orderStatus !== 'packed') {
    return res.status(400).json({
      message: `Order cannot be shipped. Current status: ${order.orderStatus}`
    });
  }

  // Generate tracking number
  const trackingNumber = `TRK-${uuidv4().slice(0, 8).toUpperCase()}`;

  // Calculate shipping metrics
  let totalWeight = 0;
  let totalVolume = 0;
  let totalValue = order.total;

  for (const orderItem of order.items) {
    const product = await Product.findById(orderItem.productId);
    totalWeight += (product.weight || 0) * orderItem.quantity;
    totalVolume += (product.volume || 0) * orderItem.quantity;
  }

  // Create transport record
  const transport = await Transport.create({
    packageId: order.packageId,
    trackingNumber,
    transportCost: order.shipping,
    totalWeight,
    totalVolume,
    totalValue,
    status: 'dispatched',
    products: order.items.map(item => ({
      batchId: item.batchId,
      quantity: item.quantity
    })),
    location: {
      from: "Fulfillment Center",
      to: `${order.shippingAddress.city}, ${order.shippingAddress.state}`
    },
    assignedTo: transporterId,
    transportMode: shippingMethod === 'express' ? 'air' : 'land',
    dispatchedAt: new Date()
  });

  // Update item statuses
  for (const orderItem of order.items) {
    await Item.updateMany(
      { _id: { $in: orderItem.allocatedItemIds } },
      {
        $set: { status: 'shipped' },
        $push: {
          history: {
            action: 'shipped',
            location: 'Dispatch Center',
            notes: `Shipped - Tracking: ${trackingNumber}`
          }
        }
      }
    );
  }

  // Update order
  order.orderStatus = 'shipped';
  order.shippedAt = new Date();
  order.trackingNumber = trackingNumber;
  order.transportId = transport._id;
  order.shippingMethod = shippingMethod;
  if (shippingNotes) order.shippingNotes = shippingNotes;

  // Calculate shipping preparation time
  const shippingTime = (order.shippedAt - order.packedAt) / (1000 * 60); // minutes
  order.processingTimes.packedToShipped = shippingTime;

  await order.save();

  // Create sales history record
  await SalesHistory.create({
    productId: order.items[0].productId,
    batchId: order.items[0].batchId,
    warehouseId: req.user.assignedWarehouseId,
    quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    action: "dispatched",
    referenceItemIds: order.items.flatMap(item => item.allocatedItemIds),
    packageId: order.packageId,
    notes: `Fulfillment order ${order.orderNumber} shipped`
  });

  res.status(200).json({
    message: "Order shipped successfully",
    trackingNumber,
    order,
    transport
  });
});

// Mark order as delivered
export const markDelivered = catchAsyncErrors(async (req, res) => {
  const { orderNumber } = req.params;
  const { deliveryNotes, customerFeedback } = req.body;

  const order = await FulfillmentOrder.findOne({ orderNumber })
    .populate('transportId');

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  const deliveryDate = new Date();

  // Update order
  order.orderStatus = 'delivered';
  order.deliveredAt = deliveryDate;

  // Calculate delivery time
  const deliveryTime = (order.deliveredAt - order.shippedAt) / (1000 * 60 * 60); // hours
  order.processingTimes.shippedToDelivered = deliveryTime;

  // Update transport
  if (order.transportId) {
    order.transportId.status = 'delivered';
    order.transportId.deliveredAt = deliveryDate;
    await order.transportId.save();
  }

  // Update item statuses
  for (const orderItem of order.items) {
    await Item.updateMany(
      { _id: { $in: orderItem.allocatedItemIds } },
      {
        $set: { status: 'delivered' },
        $push: {
          history: {
            action: 'delivered',
            location: `${order.shippingAddress.city}, ${order.shippingAddress.state}`,
            notes: 'Successfully delivered to customer'
          }
        }
      }
    );
  }

  await order.save();

  res.status(200).json({
    message: "Order marked as delivered",
    order
  });
});

// Track order
export const trackOrder = catchAsyncErrors(async (req, res) => {
  const { identifier } = req.params; // Can be orderNumber, platformOrderId, or trackingNumber

  const order = await FulfillmentOrder.findOne({
    $or: [
      { orderNumber: identifier },
      { platformOrderId: identifier },
      { trackingNumber: identifier }
    ]
  })
    .populate('items.productId', 'productName sku')
    .populate('transportId')
    .populate('receivedBy processedBy packedBy', 'fullName');

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  res.status(200).json({
    tracking: {
      orderNumber: order.orderNumber,
      platformOrderId: order.platformOrderId,
      trackingNumber: order.trackingNumber,
      status: order.orderStatus,
      customerInfo: order.customerInfo,
      items: order.items,
      shippingAddress: order.shippingAddress,
      statusHistory: order.statusHistory,
      processingTimes: order.processingTimes
    }
  });
});

// Get all orders with filtering and analytics
export const getAllOrders = catchAsyncErrors(async (req, res) => {
  const {
    status,
    platform,
    priority,
    startDate,
    endDate,
    page = 1,
    limit = 20
  } = req.query;

  let filter = {};

  if (status) filter.orderStatus = status;
  if (platform) filter.platform = platform;
  if (priority) filter.priority = priority;
  if (startDate || endDate) {
    filter.receivedAt = {};
    if (startDate) filter.receivedAt.$gte = new Date(startDate);
    if (endDate) filter.receivedAt.$lte = new Date(endDate);
  }

  const orders = await FulfillmentOrder.find(filter)
    .populate('items.productId', 'productName sku')
    .populate('receivedBy processedBy packedBy', 'fullName')
    .sort({ receivedAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await FulfillmentOrder.countDocuments(filter);

  // Calculate analytics
  const analytics = await FulfillmentOrder.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalValue: { $sum: '$total' },
        averageOrderValue: { $avg: '$total' },
        averageProcessingTime: { $avg: '$processingTimes.orderToProcessing' }
      }
    }
  ]);

  res.status(200).json({
    orders,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / limit),
      total
    },
    analytics: analytics[0] || {}
  });
});

// Process return
export const processReturn = catchAsyncErrors(async (req, res) => {
  const { orderNumber } = req.params;
  const { returnReason, returnedItems } = req.body;

  const order = await FulfillmentOrder.findOne({ orderNumber });

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  // Update order
  order.orderStatus = 'returned';
  order.returnReason = returnReason;
  order.returnDate = new Date();
  order.returnProcessed = true;

  // Process returned items - restore to inventory if in good condition
  for (const returnedItem of returnedItems) {
    const orderItem = order.items.find(item =>
      item.productId.toString() === returnedItem.productId
    );

    if (orderItem && returnedItem.condition === 'good') {
      // Restore to inventory
      const inventory = await Inventory.findOne({ batchId: orderItem.batchId });
      if (inventory) {
        inventory.quantity += returnedItem.quantity;
        await inventory.save();
      }

      // Update product quantity
      const product = await Product.findById(orderItem.productId);
      product.quantity += returnedItem.quantity;
      await product.save();

      // Update item statuses
      const itemsToUpdate = orderItem.allocatedItemIds.slice(0, returnedItem.quantity);
      await Item.updateMany(
        { _id: { $in: itemsToUpdate } },
        {
          $set: { status: 'returned' },
          $push: {
            history: {
              action: 'returned',
              location: 'Returns Processing',
              notes: `Returned: ${returnReason}`
            }
          }
        }
      );
    }
  }

  await order.save();

  res.status(200).json({
    message: "Return processed successfully",
    order
  });
});
