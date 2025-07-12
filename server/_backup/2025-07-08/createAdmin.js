// Script to create an admin user for SmartStock
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDb from "./database/db.js";
import { User } from "./models/user.model.js";
import { Warehouse } from "./models/warehouse.model.js";

async function createAdmin() {
  await connectDb();
  try {
    // Check if an admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("Admin user already exists:", existingAdmin.email);
      return;
    }

    // Hash the admin password
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // Create the admin user
    const adminUser = new User({
      fullName: "Admin User",
      email: "admin@smartstock.com",
      password: hashedPassword,
      role: "admin",
      phone: "0000000000",
      wagePerHour: 0,
      status: "active",
      isVerified: true
    });
    await adminUser.save();

    // Create a default warehouse for admin assignment
    let warehouse = await Warehouse.findOne({ warehouseName: "Admin Warehouse" });
    if (!warehouse) {
      warehouse = await Warehouse.create({
        warehouseName: "Admin Warehouse",
        capacity: 10000,
        unit: "pcs",
        adminId: adminUser._id,
        address: {
          street: "123 Admin St",
          city: "Admin City",
          state: "Admin State",
          zipcode: "00000",
          country: "Adminland"
        },
        status: "active"
      });
      console.log("Created default admin warehouse.");
    }

    // Assign warehouse to admin user
    adminUser.assignedWarehouseId = warehouse._id;
    await adminUser.save();
    console.log("Admin user created successfully:", adminUser.email);
  } catch (err) {
    console.error("Error creating admin user:", err);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

createAdmin();
