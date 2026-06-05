import bcrypt from "bcryptjs";
import {
  Batch,
  ExternalUser,
  Inventory,
  Item,
  Product,
} from "../models/index.js";
import { seedAdmin } from "./seedAdmin.js";
import { isDirectRun, runScript } from "./lib/seedUtils.js";

const currency = "INR";
const seedDate = new Date("2026-01-01T00:00:00.000Z");
const DEV_SUPPLIER_PASSWORD = "seed-supplier123";
const UNSAFE_SUPPLIER_PASSWORDS = new Set([
  DEV_SUPPLIER_PASSWORD,
  "supplier",
  "password",
  "password123",
  "changeme",
  "smartstock",
]);

export const productSeeds = [
  {
    productName: "iPhone 15 Pro",
    productImage: "https://placehold.co/600x400?text=iPhone+15+Pro",
    unit: "pieces",
    manufacturer: "Apple",
    productCategory: "electronics",
    sku: "IPH15P-001",
    price: 99999,
    quantity: 12,
    weight: 0.19,
    dimension: { length: 14.7, breadth: 7.1, height: 0.8 },
    thresholdLimit: 4,
    shelfLifeDays: 1825,
    unitCost: 76000,
  },
  {
    productName: "Samsung Galaxy S24",
    productImage: "https://placehold.co/600x400?text=Samsung+Galaxy+S24",
    unit: "pieces",
    manufacturer: "Samsung",
    productCategory: "electronics",
    sku: "SGS24-001",
    price: 74999,
    quantity: 10,
    weight: 0.17,
    dimension: { length: 14.7, breadth: 7.1, height: 0.8 },
    thresholdLimit: 4,
    shelfLifeDays: 1825,
    unitCost: 59000,
  },
  {
    productName: "MacBook Pro 14",
    productImage: "https://placehold.co/600x400?text=MacBook+Pro+14",
    unit: "pieces",
    manufacturer: "Apple",
    productCategory: "electronics",
    sku: "MBP14-001",
    price: 199900,
    quantity: 8,
    weight: 1.55,
    dimension: { length: 31.3, breadth: 22.1, height: 1.6 },
    thresholdLimit: 3,
    shelfLifeDays: 1825,
    unitCost: 158000,
  },
  {
    productName: "Ergonomic Office Chair",
    productImage: "https://placehold.co/600x400?text=Office+Chair",
    unit: "pieces",
    manufacturer: "SmartStock Furnishings",
    productCategory: "furniture",
    sku: "EOC-001",
    price: 12999,
    quantity: 15,
    weight: 18,
    dimension: { length: 70, breadth: 65, height: 115 },
    thresholdLimit: 5,
    shelfLifeDays: 3650,
    unitCost: 8200,
  },
  {
    productName: "Cotton Utility Jacket",
    productImage: "https://placehold.co/600x400?text=Utility+Jacket",
    unit: "pieces",
    manufacturer: "Northline Apparel",
    productCategory: "apparel",
    sku: "CUJ-001",
    price: 3499,
    quantity: 20,
    weight: 0.8,
    dimension: { length: 45, breadth: 35, height: 5 },
    thresholdLimit: 6,
    shelfLifeDays: 1095,
    unitCost: 1900,
  },
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isTruthy = (value) => ["1", "true", "yes", "y"].includes(String(value).toLowerCase());
const hasEnvValue = (key) => Object.prototype.hasOwnProperty.call(process.env, key);
const normalizePassword = (value) => String(value ?? "").trim();

const addDays = (date, days) => {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

export const getSeedSupplierConfig = () => {
  const allowDevDefaultPassword = process.env.NODE_ENV === "development"
    && isTruthy(process.env.ALLOW_DEV_SEED_CREDENTIALS);
  const password = hasEnvValue("SEED_SUPPLIER_PASSWORD")
    ? normalizePassword(process.env.SEED_SUPPLIER_PASSWORD)
    : (allowDevDefaultPassword ? DEV_SUPPLIER_PASSWORD : "");
  const usesDevDefaultPassword = allowDevDefaultPassword && !hasEnvValue("SEED_SUPPLIER_PASSWORD");
  const passwordIsUnsafe = !usesDevDefaultPassword
    && (password.length < 12 || UNSAFE_SUPPLIER_PASSWORDS.has(password.toLowerCase()));

  if (!password || passwordIsUnsafe) {
    throw new Error(
      "Refusing to seed a supplier with an unsafe password. "
      + "Set SEED_SUPPLIER_PASSWORD to a unique value with at least 12 characters. "
      + "For local development defaults, set NODE_ENV=development and ALLOW_DEV_SEED_CREDENTIALS=1."
    );
  }

  if (allowDevDefaultPassword && !process.env.SEED_SUPPLIER_PASSWORD) {
    console.warn("Using development supplier password. Set SEED_SUPPLIER_PASSWORD to override it.");
  }

  return {
    fullName: process.env.SEED_SUPPLIER_NAME?.trim() || "SmartStock Seed Supplier",
    companyName: process.env.SEED_SUPPLIER_COMPANY?.trim() || "SmartStock Seed Supplies",
    email: (process.env.SEED_SUPPLIER_EMAIL?.trim() || "supplier@smartstock.local").toLowerCase(),
    password,
    phone: process.env.SEED_SUPPLIER_PHONE?.trim() || "1111111111",
    address: process.env.SEED_SUPPLIER_ADDRESS?.trim() || "Seed supplier address",
    contactPerson: process.env.SEED_SUPPLIER_CONTACT?.trim() || "Seed Contact",
  };
};

const seedSupplier = async (warehouseId) => {
  const config = getSeedSupplierConfig();
  const passwordHash = await bcrypt.hash(config.password, 10);

  return ExternalUser.findOneAndUpdate(
    { email: config.email },
    {
      $set: {
        fullName: config.fullName,
        companyName: config.companyName,
        password: passwordHash,
        phone: config.phone,
        address: config.address,
        contactPerson: config.contactPerson,
        rating: 5,
        role: "supplier",
        status: "active",
        isVerified: true,
        warehouseId,
        updatedAt: new Date(),
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
};

const upsertSeedItems = async ({ batch, product, seed, warehouse }) => {
  const serialNumbers = Array.from(
    { length: seed.quantity },
    (_, index) => `${seed.sku}-SEED-${String(index + 1).padStart(3, "0")}`
  );

  await Item.deleteMany({
    $and: [
      { serialNumber: { $regex: `^${escapeRegExp(seed.sku)}-SEED-` } },
      { serialNumber: { $nin: serialNumbers } },
      { status: "in_stock" },
    ],
  });

  for (const serialNumber of serialNumbers) {
    const existingItem = await Item.findOne({ serialNumber });

    if (!existingItem) {
      await Item.create({
        batchId: batch._id,
        productId: product._id,
        serialNumber,
        currentWarehouseId: warehouse._id,
        status: "in_stock",
        history: [
          {
            action: "added",
            location: warehouse.warehouseName,
            notes: "Seed inventory item",
            date: seedDate,
          },
        ],
        purchasePrice: seed.unitCost,
      });
      continue;
    }

    const update = {
      batchId: batch._id,
      productId: product._id,
      purchasePrice: seed.unitCost,
    };

    if (existingItem.status === "in_stock") {
      update.currentWarehouseId = warehouse._id;
    }

    await Item.updateOne({ _id: existingItem._id }, { $set: update }, { runValidators: true });
  }
};

const syncSeedInventory = async ({ batch, product, seed, warehouse }) => {
  const currentWarehouseStockQuery = {
    batchId: batch._id,
    currentWarehouseId: warehouse._id,
    status: "in_stock",
  };

  const [availableQuantity, inventoryValue] = await Promise.all([
    Item.countDocuments(currentWarehouseStockQuery),
    Item.aggregate([
      { $match: currentWarehouseStockQuery },
      { $group: { _id: null, total: { $sum: "$purchasePrice" } } },
    ]),
  ]);

  await Inventory.findOneAndUpdate(
    { batchId: batch._id, warehouseId: warehouse._id },
    {
      $set: {
        quantity: availableQuantity,
        inventoryValue: inventoryValue[0]?.total || seed.unitCost * availableQuantity,
      },
      $setOnInsert: {
        batchId: batch._id,
        warehouseId: warehouse._id,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  await Inventory.deleteMany({
    batchId: batch._id,
    warehouseId: { $ne: warehouse._id },
  });

  await Product.updateOne(
    { _id: product._id },
    {
      $set: {
        quantity: availableQuantity,
        restockRecommended: availableQuantity <= seed.thresholdLimit,
      },
    }
  );

  return availableQuantity;
};

export const seedProducts = async () => {
  const { warehouse } = await seedAdmin();
  const supplier = await seedSupplier(warehouse._id);
  const results = [];

  for (const seed of productSeeds) {
    const product = await Product.findOneAndUpdate(
      { sku: seed.sku },
      {
        $set: {
          productName: seed.productName,
          productImage: seed.productImage,
          unit: seed.unit,
          manufacturer: seed.manufacturer,
          productCategory: seed.productCategory,
          price: seed.price,
          weight: seed.weight,
          dimension: seed.dimension,
          thresholdLimit: seed.thresholdLimit,
          shelfLifeDays: seed.shelfLifeDays,
          isActive: true,
          isDeleted: false,
          supplierIds: [supplier._id],
        },
        $setOnInsert: {
          sku: seed.sku,
          quantity: seed.quantity,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const batch = await Batch.findOneAndUpdate(
      { batchNumber: `SEED-${seed.sku}-001` },
      {
        $set: {
          productId: product._id,
          warehouseId: warehouse._id,
          supplierId: supplier._id,
          quantity: seed.quantity,
          mfgDate: seedDate,
          expDate: addDays(seedDate, seed.shelfLifeDays),
          condition: "new",
          status: "active",
          unitCost: seed.unitCost,
          totalCost: seed.unitCost * seed.quantity,
          currency,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    await upsertSeedItems({ batch, product, seed, warehouse });
    const availableQuantity = await syncSeedInventory({ batch, product, seed, warehouse });

    results.push({
      sku: seed.sku,
      productName: seed.productName,
      availableQuantity,
    });
  }

  console.table(results);
  console.log(`Seeded ${results.length} products for warehouse "${warehouse.warehouseName}".`);
  return results;
};

if (isDirectRun(import.meta.url)) {
  runScript(seedProducts, "seed-products");
}
