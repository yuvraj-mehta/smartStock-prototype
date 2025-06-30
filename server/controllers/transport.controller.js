import { v4 as uuidv4 } from "uuid";
import { catchAsyncErrors } from "../middlewares/index.js";
import { Transport } from "../models/transport.model.js";
import { Inventory } from "../models/inventory.model.js";
import { Item } from "../models/item.model.js";
import { Batch } from "../models/batch.model.js";


// create transport
export const createTransport = catchAsyncErrors(async (req, res) => {
  const {
    transportCost,
    products,
    location,
    assignedTo,
    transportMode
  } = req.body;

  let totalWeight = 0;
  let totalVolume = 0;
  let totalValue = 0;

  const packageId = `PKG-${uuidv4().slice(0, 8).toUpperCase()}`;
  const trackingNumber = `TRK-${uuidv4().slice(0, 8).toUpperCase()}`;

  for (const { batchId, quantity } of products) {
    const inventory = await Inventory.findOne({ batchId });
    if (!inventory || inventory.quantity < quantity) {
      return res.status(400).json({ message: `Insufficient inventory for batch ${batchId}` });
    }

    // Update inventory
    inventory.quantity -= quantity;
    await inventory.save();

    // Update Item status
    const items = await Item.find({ batchId, status: "in_stock" }).limit(quantity);
    for (const item of items) {
      item.status = "dispatched";
      item.history.push({ action: "dispatched", location: location.to });
      await item.save();
    }

    // Update product quantity
    const batch = await Batch.findById(batchId).populate("productId");
    const product = batch.productId;
    product.quantity -= quantity;
    await product.save();

    totalWeight += product.weight * quantity;
    totalVolume += product.volume * quantity;
    totalValue += product.price * quantity;
  }

  const transport = await Transport.create({
    packageId,
    trackingNumber,
    transportCost,
    products,
    location,
    assignedTo,
    transportMode,
    totalWeight,
    totalVolume,
    totalValue,
    status: "dispatched",
    dispatchedAt: new Date()
  });

  res.status(201).json({ message: "Transport created successfully", transport });
});

// get all transports
export const getAllTransports = async (req, res) => {
  const query = req.user.role === "transporter"
    ? { assignedTo: req.user._id }
    : {};

  const transports = await Transport.find(query)
    .populate("assignedTo", "fullName email")
    .populate("products.batchId")
    .sort({ createdAt: -1 });

  res.json(transports);
};


// update transport status
export const updateTransportStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ["dispatched", "intransit", "delivered", "returned"];
  if (!allowed.includes(status))
    return res.status(400).json({ error: "Invalid status" });

  const transport = await Transport.findById(req.params.id);
  if (!transport) return res.status(404).json({ error: "Transport not found" });

  if (transport.assignedTo.toString() !== req.user._id.toString())
    return res.status(403).json({ error: "Not authorized to update this transport" });

  transport.status = status;
  if (status === "dispatched") transport.dispatchedAt = new Date();
  if (status === "delivered") transport.deliveredAt = new Date();

  await transport.save();
  res.json({ message: "Transport status updated", transport });
};