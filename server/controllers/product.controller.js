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
  const product = await Product.findById(productId);
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
      _id, productName, productImage, unit, manufacturer, productCategory, sku, price, quantity, weight, dimension, volume, thresholdLimit, mfgDate, expDate, shelfLifeDays, isActive, createdAt, updatedAt
    } = product;
    return res.status(200).json({
      product: {
        _id, productName, productImage, unit, manufacturer, productCategory, sku, price, quantity, weight, dimension, volume, thresholdLimit, mfgDate, expDate, shelfLifeDays, isActive, createdAt, updatedAt
      }
    });
  }
  // Admins get full product
  res.status(200).json({ product });
})


// get all products
export const getAllProducts = catchAsyncErrors(async (req, res) => {
  if (req.user.role !== 'admin') {
    const products = await Product.find({}, '-createdAt -updatedAt -__v -restockRecommended -supplierIds -batchNumber');

    if (!products || products.length === 0) {
      return res.status(404).json({
        message: "No products found."
      });
    }

    return res.status(200).json({
      numberOfProducts: products.length,
      message: "Products fetched successfully.",
      products,
    });
  }

  const products = await Product.find();
  if (!products || products.length === 0) {
    return res.status(404).json({
      message: "No products found."
    });
  }
  res.status(200).json({
    numberOfProducts: products.length,
    message: "Products fetched successfully.",
    products,
  });
})

// delete a product by id
export const deleteProductById = catchAsyncErrors(async (req, res) => {
  const productId = req.params.id;

  const product = await Product.findByIdAndDelete(productId);
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

  const product = await Product.findById(productId);
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
    quantity,
    weight,
    dimension,
    thresholdLimit,
    shelfLifeDays,
    isActive,
  } = req.body;
  console.log(req.body);
  

  product.productName = productName || product.productName;
  product.productImage = productImage || product.productImage;
  product.unit = unit || product.unit;
  product.manufacturer = manufacturer || product.manufacturer;
  product.productCategory = productCategory || product.productCategory;
  product.sku = sku || product.sku;
  product.price = price || product.price;
  product.quantity = quantity || product.quantity;
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