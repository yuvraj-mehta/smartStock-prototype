import connectDb from "./database/db.js";
import { Product } from "./models/product.model.js";

const products = [
  {
    productName: "Wireless Mouse",
    productImage: "https://example.com/images/mouse.jpg",
    unit: "piece",
    manufacturer: "LogiTech",
    productCategory: "electronics",
    sku: "WMOUSE001",
    price: 25.99,
    quantity: 100,
    weight: 0.2,
    dimension: { length: 10, breadth: 6, height: 4 },
    shelfLifeDays: 365,
    isActive: true,
    thresholdLimit: 10,
    supplierIds: [],
  },
  {
    productName: "Cotton T-Shirt",
    productImage: "https://example.com/images/tshirt.jpg",
    unit: "piece",
    manufacturer: "Uniqlo",
    productCategory: "apparel",
    sku: "TSHIRT001",
    price: 15.5,
    quantity: 200,
    weight: 0.15,
    dimension: { length: 30, breadth: 25, height: 2 },
    shelfLifeDays: 730,
    isActive: true,
    thresholdLimit: 20,
    supplierIds: [],
  },
  {
    productName: "Ceramic Vase",
    productImage: "https://example.com/images/vase.jpg",
    unit: "piece",
    manufacturer: "HomeDeco",
    productCategory: "decor",
    sku: "VASE001",
    price: 40.0,
    quantity: 50,
    weight: 1.2,
    dimension: { length: 15, breadth: 15, height: 30 },
    shelfLifeDays: 1825,
    isActive: true,
    thresholdLimit: 5,
    supplierIds: [],
  },
  {
    productName: "Office Chair",
    productImage: "https://example.com/images/chair.jpg",
    unit: "piece",
    manufacturer: "FurniCo",
    productCategory: "furniture",
    sku: "CHAIR001",
    price: 120.0,
    quantity: 30,
    weight: 8.0,
    dimension: { length: 60, breadth: 60, height: 110 },
    shelfLifeDays: 1825,
    isActive: true,
    thresholdLimit: 3,
    supplierIds: [],
  },
  {
    productName: "LED Table Lamp",
    productImage: "https://example.com/images/lamp.jpg",
    unit: "piece",
    manufacturer: "BrightLite",
    productCategory: "electronics",
    sku: "LAMP001",
    price: 35.0,
    quantity: 80,
    weight: 0.8,
    dimension: { length: 20, breadth: 20, height: 40 },
    shelfLifeDays: 1095,
    isActive: true,
    thresholdLimit: 8,
    supplierIds: [],
  },
];

async function addProducts() {
  await connectDb();
  try {
    const result = await Product.insertMany(products, { ordered: false });
    console.log("Products added:", result.map(p => p.sku));
  } catch (err) {
    console.error("Error adding products:", err);
  } finally {
    process.exit();
  }
}

addProducts();
