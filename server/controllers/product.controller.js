import {
  catchAsyncErrors
} from "../middlewares/index.js";

import { Product } from "../models/product.model.js";

/**
 * @desc    Admin can create a new product
 * @route   POST /product/create
 * @access  Admin only
 */
export const createProduct = catchAsyncErrors(async (req, res) => {

  const {
    productName,
    productImage,
    unit,
    manufacturer,
    productCategory,
    sku,
    price,
    weight,
    dimension,
    thresholdLimit,
    shelfLifeDays,
  } = req.body;

  const existingProduct = await Product.findOne({ sku });

  if (existingProduct) {
    return res.status(400).json({
      message: 'Product with this sku already exists.'
    });
  }

  const newProduct = new Product({
    productName,
    productImage,
    unit,
    manufacturer,
    productCategory,
    sku,
    price,
    weight,
    dimension,
    thresholdLimit,
    shelfLifeDays,
  });

  const savedProduct = await newProduct.save();

  res.status(201).json({
    message: "Product created successfully.",
    product: savedProduct,
  });
});

export const getProductById = catchAsyncErrors(async (req, res) => {
  const productId = req.params.id;
  const product = await Product.findOne({ _id: productId, isDeleted: { $ne: true } });
  if (!product) {
    return res.status(404).json({
      message: "Product not found.",
      product,
    });
  }

  // Hide sensitive info for non-admins
  if (req.user.role !== 'admin') {
    // Only expose non-sensitive fields
    const {
      _id, productName, productImage, unit, manufacturer, productCategory, sku, price, weight, dimension, volume, thresholdLimit, shelfLifeDays, isActive, createdAt, updatedAt
    } = product;
    return res.status(200).json({
      product: {
        _id, productName, productImage, unit, manufacturer, productCategory, sku, price, weight, dimension, volume, thresholdLimit, shelfLifeDays, isActive, createdAt, updatedAt
      }
    });
  }
  // Admins get full product
  res.status(200).json({ product });
})


// get all products
export const getAllProducts = catchAsyncErrors(async (req, res) => {
  if (req.user.role !== 'admin') {
    const products = await Product.find({ isDeleted: { $ne: true } }, '-createdAt -updatedAt -__v -restockRecommended -supplierIds -quantity');

    return res.status(200).json({
      numberOfProducts: products.length,
      message: "Products fetched successfully.",
      products,
    });
  }

  const products = await Product.find({ isDeleted: { $ne: true } });
  res.status(200).json({
    numberOfProducts: products.length,
    message: "Products fetched successfully.",
    products,
  });
})

// delete a product by id
export const deleteProductById = catchAsyncErrors(async (req, res) => {
  const productId = req.params.id;

  const product = await Product.findOneAndUpdate(
    { _id: productId, isDeleted: { $ne: true } },
    { $set: { isDeleted: true, isActive: false } },
    { new: true }
  );
  if (!product) {
    return res.status(404).json({
      message: "Product not found."
    });
  }
  res.status(200).json({
    message: "Product deleted successfully.",
    product,
  });
})

// update a product by id
// add content-type: application/json to the request header
export const updateProductById = catchAsyncErrors(async (req, res) => {
  const productId = req.params.id;

  const product = await Product.findOne({ _id: productId, isDeleted: { $ne: true } });
  if (!product) {
    return res.status(404).json({
      message: "Product not found."
    });
  }

  const {
    productName,
    productImage,
    unit,
    manufacturer,
    productCategory,
    sku,
    price,
    weight,
    dimension,
    thresholdLimit,
    shelfLifeDays,
    isActive,
  } = req.body;
  product.productName = productName || product.productName;
  product.productImage = productImage || product.productImage;
  product.unit = unit || product.unit;
  product.manufacturer = manufacturer || product.manufacturer;
  product.productCategory = productCategory || product.productCategory;
  product.sku = sku || product.sku;
  product.price = price || product.price;
  product.weight = weight || product.weight;
  product.dimension = dimension || product.dimension;
  product.thresholdLimit = thresholdLimit || product.thresholdLimit;
  product.shelfLifeDays = shelfLifeDays || product.shelfLifeDays;
  product.isActive = isActive !== undefined ? isActive : product.isActive;

  const updatedProduct = await product.save();

  res.status(200).json({
    message: "Product updated successfully.",
    product: updatedProduct
  });
});
