import mongoose from "mongoose";
import { conf } from "../config/config.js";
import { User, Warehouse, Product, ExternalUser } from "../models/index.js";
import bcrypt from "bcrypt";

const seedDatabase = async () => {
  try {
    // Connect to database
    await mongoose.connect(conf.mongoUri);
    console.log("Connected to database for seeding");

    // Clear existing data
    await User.deleteMany({});
    await Warehouse.deleteMany({});
    await Product.deleteMany({});
    await ExternalUser.deleteMany({});

    // Create warehouse
    const warehouse = await Warehouse.create({
      warehouseName: "Main Warehouse",
      capacity: 10000,
      unit: "pcs",
      address: {
        street: "123 Main St",
        city: "New York",
        state: "NY",
        zipcode: "10001",
        country: "USA"
      },
      adminId: new mongoose.Types.ObjectId(), // Temp ID, will be updated
      status: "active"
    });

    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const admin = await User.create({
      fullName: "System Administrator",
      email: "admin@smartstock.com",
      password: hashedPassword,
      phone: "+1234567890",
      role: "admin",
      shift: "morning",
      wagePerHour: 25,
      status: "active",
      assignedWarehouseId: warehouse._id,
      isVerified: true
    });

    // Update warehouse admin
    warehouse.adminId = admin._id;
    await warehouse.save();

    // Create staff user
    const staff = await User.create({
      fullName: "Staff Member",
      email: "staff@smartstock.com",
      password: hashedPassword,
      phone: "+1234567891",
      role: "staff",
      shift: "morning",
      wagePerHour: 18,
      status: "active",
      assignedWarehouseId: warehouse._id,
      isVerified: true
    });

    // Create transporter
    const transporter = await ExternalUser.create({
      fullName: "Fast Delivery Co.",
      companyName: "Fast Delivery Co.",
      email: "transporter@fastdelivery.com",
      password: hashedPassword,
      phone: "+1234567892",
      role: "transporter",
      status: "active",
      isVerified: true
    });

    // Create supplier
    const supplier = await ExternalUser.create({
      fullName: "Tech Supplier Inc.",
      companyName: "Tech Supplier Inc.",
      email: "supplier@techsupplier.com",
      password: hashedPassword,
      phone: "+1234567893",
      role: "supplier",
      status: "active",
      isVerified: true
    });

    // Create sample products
    const products = [
      {
        productName: "Laptop",
        productImage: "https://example.com/laptop.jpg",
        unit: "pcs",
        manufacturer: "TechCorp",
        productCategory: "electronics",
        sku: "LAP001",
        price: 999.99,
        quantity: 0,
        weight: 2.5,
        dimension: { length: 35, breadth: 25, height: 2 },
        thresholdLimit: 10,
        shelfLifeDays: 1095,
        isActive: true,
        supplierIds: [supplier._id]
      },
      {
        productName: "Office Chair",
        productImage: "https://example.com/chair.jpg",
        unit: "pcs",
        manufacturer: "ComfortCorp",
        productCategory: "furniture",
        sku: "CHR001",
        price: 199.99,
        quantity: 0,
        weight: 15,
        dimension: { length: 65, breadth: 65, height: 110 },
        thresholdLimit: 5,
        shelfLifeDays: 1825,
        isActive: true,
        supplierIds: [supplier._id]
      }
    ];

    await Product.insertMany(products);

    console.log("Database seeded successfully!");
    console.log("Admin credentials: admin@smartstock.com / admin123");
    console.log("Staff credentials: staff@smartstock.com / admin123");

  } catch (error) {
    console.error("Error seeding database:", error);
  } finally {
    await mongoose.disconnect();
  }
};

seedDatabase();
