import bcrypt from "bcryptjs";
import { User, Warehouse } from "../models/index.js";
import { isDirectRun, runScript } from "./lib/seedUtils.js";

const DEV_ADMIN_EMAIL = "admin@smartstock.local";
const DEV_ADMIN_PASSWORD = "admin123";
const DEFAULT_WAREHOUSE_NAME = "Admin Warehouse";
const DEFAULT_WAREHOUSE_ADDRESS = {
  street: "123 Admin St",
  city: "Admin City",
  state: "Admin State",
  zipcode: "00000",
  country: "Adminland",
};
const UNSAFE_PASSWORDS = new Set([
  DEV_ADMIN_PASSWORD,
  "admin",
  "password",
  "password123",
  "changeme",
  "smartstock",
]);

const cleanEnv = (key, fallback = "") => process.env[key]?.trim() || fallback;

export const getAdminSeedConfig = () => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const isDevelopment = nodeEnv === "development";
  const password = process.env.ADMIN_PASSWORD || (isDevelopment ? DEV_ADMIN_PASSWORD : "");
  const passwordIsUnsafe = password.length < 12 || UNSAFE_PASSWORDS.has(password.toLowerCase());

  if (!isDevelopment && (!password || passwordIsUnsafe)) {
    throw new Error(
      "Refusing to seed an admin with an unsafe password outside development. "
      + "Set ADMIN_PASSWORD to a unique value with at least 12 characters."
    );
  }

  if (isDevelopment && !process.env.ADMIN_PASSWORD) {
    console.warn(`Using development admin password "${DEV_ADMIN_PASSWORD}". Set ADMIN_PASSWORD to override it.`);
  }

  return {
    email: cleanEnv("ADMIN_EMAIL", DEV_ADMIN_EMAIL).toLowerCase(),
    password,
    fullName: cleanEnv("ADMIN_FULL_NAME", "Admin User"),
    phone: cleanEnv("ADMIN_PHONE", "0000000000"),
    warehouse: {
      warehouseName: cleanEnv("ADMIN_WAREHOUSE_NAME", DEFAULT_WAREHOUSE_NAME),
      capacity: Number.parseInt(cleanEnv("ADMIN_WAREHOUSE_CAPACITY", "10000"), 10),
      unit: cleanEnv("ADMIN_WAREHOUSE_UNIT", "pcs"),
      address: {
        street: cleanEnv("ADMIN_WAREHOUSE_STREET", DEFAULT_WAREHOUSE_ADDRESS.street),
        city: cleanEnv("ADMIN_WAREHOUSE_CITY", DEFAULT_WAREHOUSE_ADDRESS.city),
        state: cleanEnv("ADMIN_WAREHOUSE_STATE", DEFAULT_WAREHOUSE_ADDRESS.state),
        zipcode: cleanEnv("ADMIN_WAREHOUSE_ZIPCODE", DEFAULT_WAREHOUSE_ADDRESS.zipcode),
        country: cleanEnv("ADMIN_WAREHOUSE_COUNTRY", DEFAULT_WAREHOUSE_ADDRESS.country),
      },
    },
  };
};

export const seedAdmin = async () => {
  const config = getAdminSeedConfig();
  const passwordHash = await bcrypt.hash(config.password, 10);

  const adminUser = await User.findOneAndUpdate(
    { email: config.email },
    {
      $set: {
        fullName: config.fullName,
        password: passwordHash,
        phone: config.phone,
        role: "admin",
        wagePerHour: 0,
        status: "active",
        isVerified: true,
      },
      $setOnInsert: {
        hoursThisMonth: 0,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  const warehouse = await Warehouse.findOneAndUpdate(
    { adminId: adminUser._id, warehouseName: config.warehouse.warehouseName },
    {
      $set: {
        capacity: config.warehouse.capacity,
        unit: config.warehouse.unit,
        address: config.warehouse.address,
        status: "active",
        updatedAt: new Date(),
      },
      $setOnInsert: {
        adminId: adminUser._id,
        warehouseName: config.warehouse.warehouseName,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  if (adminUser.assignedWarehouseId?.toString() !== warehouse._id.toString()) {
    adminUser.assignedWarehouseId = warehouse._id;
    await adminUser.save();
  }

  console.log(`Seeded admin ${adminUser.email} with warehouse "${warehouse.warehouseName}".`);
  return { adminUser, warehouse };
};

if (isDirectRun(import.meta.url)) {
  runScript(seedAdmin, "seed-admin");
}
