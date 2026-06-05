import { SalesHistory } from "../models/sales.history.model.js";
import { catchAsyncErrors } from "../middlewares/index.js";

export const recordSale = catchAsyncErrors(async (req, res) => {
  res.status(410).json({
    message: "Manual sales recording has been retired. Sales history is created from delivered packages and sale confirmation.",
    replacementFlow: "/api/v1/order",
  });
});

export const getAllSales = catchAsyncErrors(async (req, res) => {
  const records = await SalesHistory.find()
    .populate("packageId", "packageId packageStatus")
    .populate("orderId", "orderNumber platformOrderId orderStatus")
    .populate("products.productId", "productName sku")
    .populate("products.batchId", "batchNumber")
    .populate("products.itemIds", "serialNumber status")
    .populate("warehouseId", "warehouseName")
    .sort({ saleConfirmationDate: -1 });

  res.status(200).json(records);
});

export const getSaleById = catchAsyncErrors(async (req, res) => {
  const { id } = req.params;
  const record = await SalesHistory.findById(id)
    .populate("packageId", "packageId packageStatus")
    .populate("orderId", "orderNumber platformOrderId orderStatus")
    .populate("products.productId", "productName sku")
    .populate("products.batchId", "batchNumber")
    .populate("products.itemIds", "serialNumber status")
    .populate("warehouseId", "warehouseName")
    .sort({ saleConfirmationDate: -1 });

  if (!record) return res.status(404).json({ message: "Record not found." });

  res.status(200).json(record);
});

export const getSaleByPackageId = catchAsyncErrors(async (req, res) => {
  const { packageId } = req.params;
  const record = await SalesHistory.findOne({ packageId })
    .populate("packageId", "packageId packageStatus")
    .populate("orderId", "orderNumber platformOrderId orderStatus")
    .populate("products.productId", "productName sku")
    .populate("products.batchId", "batchNumber")
    .populate("products.itemIds", "serialNumber status")
    .populate("warehouseId", "warehouseName")
    .sort({ saleConfirmationDate: -1 });

  if (!record) return res.status(404).json({ message: "Record not found." });

  res.status(200).json(record);
});
