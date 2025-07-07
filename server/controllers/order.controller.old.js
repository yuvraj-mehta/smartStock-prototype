import { Order } from "../models/order.model.js";
import { Customer } from "../models/customer.model.js";
import { Product } from "../models/product.model.js";
import { Batch } from "../models/batch.model.js";
import { Item } from "../models/item.model.js";
import { Inventory } from "../models/inventory.model.js";
import { Transport } from "../models/transport.model.js";
import { SalesHistory } from "../models/sales.history.model.js";
import { catchAsyncErrors } from "../middlewares/index.js";
import { v4 as uuidv4 } from "uuid";

// Create new order
export const createOrder = catchAsyncErrors(async (req, res) => {
  const {
    customerId,
    items,
    shippingAddress,
    billingAddress,
    notes
  } = req.body;

  // Validate customer
  const customer = await Customer.findById(customerId);
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  let totalAmount = 0;
  let processedItems = [];

  // Process each item
  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) {
      return res.status(404).json({ message: `Product ${item.productId} not found` });
    }

    // Check inventory availability
    const inventory = await Inventory.findOne({
      batchId: item.batchId || { $exists: true }
    }).populate('batchId').sort({ 'batchId.mfgDate': 1 }); // FIFO

    if (!inventory || inventory.quantity < item.quantity) {
      return res.status(400).json({
        message: `Insufficient inventory for product ${product.productName}`
      });
    }

    const itemTotal = product.price * item.quantity;
    totalAmount += itemTotal;

    processedItems.push({
      productId: item.productId,
      batchId: inventory.batchId._id,
      quantity: item.quantity,
      unitPrice: product.price,
      totalPrice: itemTotal
    });
  }

  // Calculate final amount (including tax and shipping)
  const taxAmount = totalAmount * 0.1; // 10% tax
  const shippingCost = totalAmount > 1000 ? 0 : 50; // Free shipping over $1000
  const finalAmount = totalAmount + taxAmount + shippingCost;

  // Create order
  const order = await Order.create({
    customerId,
    items: processedItems,
    shippingAddress,
    billingAddress: billingAddress || shippingAddress,
    totalAmount,
    taxAmount,
    shippingCost,
    finalAmount,
    notes,
    orderStatus: 'confirmed'
  });

  // Update customer statistics
  customer.totalOrders += 1;
  customer.totalValue += finalAmount;
  customer.orderHistory.push(order._id);
  await customer.save();

  res.status(201).json({
    message: "Order created successfully",
    order: order
  });
});

// Process order (allocate inventory and create transport)
export const processOrder = catchAsyncErrors(async (req, res) => {
  const { orderId } = req.params;
  const { assignedTransporter, expectedDeliveryDate } = req.body;

  const order = await Order.findById(orderId)
    .populate('customerId')
    .populate('items.productId')
    .populate('items.batchId');

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  if (order.orderStatus !== 'confirmed') {
    return res.status(400).json({ message: "Order is not in confirmed status" });
  }

  const packageId = `PKG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const trackingNumber = `TRK-${uuidv4().slice(0, 8).toUpperCase()}`;

  let allocatedItems = [];
  let totalWeight = 0;
  let totalVolume = 0;
  let totalValue = 0;

  // Allocate inventory and items
  for (const orderItem of order.items) {
    const inventory = await Inventory.findOne({ batchId: orderItem.batchId });

    // Reduce inventory
    inventory.quantity -= orderItem.quantity;
    await inventory.save();

    // Find and allocate specific items
    const items = await Item.find({
      batchId: orderItem.batchId,
      status: "in_stock"
    }).limit(orderItem.quantity);

    for (const item of items) {
      item.status = "dispatched";
      item.history.push({
        action: "dispatched",
        location: `Order ${order.orderNumber}`,
        notes: `Dispatched for order ${order.orderNumber}`
      });
      await item.save();
      allocatedItems.push(item._id);
    }

    // Update order item with allocated items
    orderItem.itemIds = items.map(item => item._id);

    // Calculate transport metrics
    const product = orderItem.productId;
    totalWeight += (product.weight || 0) * orderItem.quantity;
    totalVolume += (product.volume || 0) * orderItem.quantity;
    totalValue += orderItem.totalPrice;

    // Update product quantity
    product.quantity -= orderItem.quantity;
    await product.save();
  }

  // Create transport record
  const transport = await Transport.create({
    packageId,
    trackingNumber,
    transportCost: order.shippingCost,
    totalWeight,
    totalVolume,
    totalValue,
    status: "dispatched",
    products: order.items.map(item => ({
      batchId: item.batchId._id,
      quantity: item.quantity
    })),
    location: {
      from: "Main Warehouse", // This should come from warehouse data
      to: `${order.shippingAddress.city}, ${order.shippingAddress.state}`
    },
    assignedTo: assignedTransporter,
    transportMode: "land", // Default, can be customized
    estimatedDeliveryDate: expectedDeliveryDate,
    dispatchedAt: new Date()
  });

  // Update order with transport details
  order.orderStatus = 'dispatched';
  order.packageId = packageId;
  order.trackingNumber = trackingNumber;
  order.transportId = transport._id;
  order.expectedDeliveryDate = expectedDeliveryDate;
  await order.save();

  // Create sales history record
  await SalesHistory.create({
    productId: order.items[0].productId._id, // Primary product
    batchId: order.items[0].batchId._id,
    warehouseId: req.user.assignedWarehouseId,
    quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    action: "dispatched",
    referenceItemIds: allocatedItems,
    packageId,
    notes: `Order ${order.orderNumber} dispatched`
  });

  res.status(200).json({
    message: "Order processed and dispatched successfully",
    order: order,
    transport: transport
  });
});

// Get order details with full tracking
export const getOrderDetails = catchAsyncErrors(async (req, res) => {
  const { orderId } = req.params;

  const order = await Order.findById(orderId)
    .populate('customerId')
    .populate('items.productId')
    .populate('items.batchId')
    .populate('items.itemIds')
    .populate('transportId');

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  res.status(200).json({ order });
});

// Track order by order number or tracking number
export const trackOrder = catchAsyncErrors(async (req, res) => {
  const { identifier } = req.params; // Can be orderNumber or trackingNumber

  const order = await Order.findOne({
    $or: [
      { orderNumber: identifier },
      { trackingNumber: identifier }
    ]
  })
    .populate('customerId', 'customerName email phone')
    .populate('transportId')
    .populate('items.productId', 'productName sku');

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  // Get transport status history if available
  let trackingHistory = order.statusHistory || [];
  if (order.transportId) {
    trackingHistory = order.transportId.statusHistory || [];
  }

  res.status(200).json({
    order: {
      orderNumber: order.orderNumber,
      trackingNumber: order.trackingNumber,
      orderStatus: order.orderStatus,
      orderDate: order.orderDate,
      expectedDeliveryDate: order.expectedDeliveryDate,
      actualDeliveryDate: order.actualDeliveryDate,
      customer: order.customerId,
      items: order.items,
      shippingAddress: order.shippingAddress,
      trackingHistory
    }
  });
});

// Confirm delivery
export const confirmDelivery = catchAsyncErrors(async (req, res) => {
  const { orderId } = req.params;
  const {
    deliverySignature,
    deliveryNotes,
    deliveryPhotos,
    customerRating,
    customerFeedback
  } = req.body;

  const order = await Order.findById(orderId).populate('transportId');

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  const deliveryDate = new Date();

  // Update order
  order.orderStatus = 'delivered';
  order.actualDeliveryDate = deliveryDate;
  await order.save();

  // Update transport
  if (order.transportId) {
    order.transportId.status = 'delivered';
    order.transportId.deliveredAt = deliveryDate;
    order.transportId.actualDeliveryDate = deliveryDate;
    order.transportId.deliverySignature = deliverySignature;
    order.transportId.deliveryNotes = deliveryNotes;
    order.transportId.deliveryPhotos = deliveryPhotos || [];
    order.transportId.customerRating = customerRating;
    order.transportId.customerFeedback = customerFeedback;

    order.transportId.statusHistory.push({
      status: 'delivered',
      timestamp: deliveryDate,
      notes: deliveryNotes || 'Package delivered successfully',
      updatedBy: req.user._id
    });

    await order.transportId.save();
  }

  // Update item statuses to delivered
  for (const orderItem of order.items) {
    await Item.updateMany(
      { _id: { $in: orderItem.itemIds } },
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

  res.status(200).json({
    message: "Delivery confirmed successfully",
    order: order
  });
});

// Get all orders with filtering
export const getAllOrders = catchAsyncErrors(async (req, res) => {
  const {
    status,
    customerId,
    startDate,
    endDate,
    page = 1,
    limit = 10
  } = req.query;

  let filter = {};

  if (status) filter.orderStatus = status;
  if (customerId) filter.customerId = customerId;
  if (startDate || endDate) {
    filter.orderDate = {};
    if (startDate) filter.orderDate.$gte = new Date(startDate);
    if (endDate) filter.orderDate.$lte = new Date(endDate);
  }

  const orders = await Order.find(filter)
    .populate('customerId', 'customerName email')
    .populate('items.productId', 'productName sku')
    .sort({ orderDate: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Order.countDocuments(filter);

  res.status(200).json({
    orders,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    }
  });
});
