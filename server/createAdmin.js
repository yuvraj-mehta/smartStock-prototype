// Script to create an admin user for SmartStock
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDb from "./database/db.js";
import { User } from "./models/user.model.js";
import { Location } from "./models/location.model.js";

async function createAdmin() {
  await connectDb();
  try {
    // Check if an admin already exists
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("Admin user already exists:", existingAdmin.email);
      return;
    }

    // Create a default location for admin assignment
    let location = await Location.findOne({ code: "ADMIN-WH" });
    if (!location) {
      location = await Location.create({
        name: "Admin Warehouse",
        code: "ADMIN-WH",
        type: "warehouse",
        address: {
          street: "123 Admin St",
          city: "Admin City",
          state: "Admin State",
          zipCode: "00000",
          country: "Adminland"
        },
        status: "active"
      });
      console.log("Created default admin location.");
    }

    // Hash the admin password
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // Create the admin user
    const adminUser = new User({
      fullName: "Admin User",
      email: "admin@smartstock.com",
      password: hashedPassword,
      role: "admin",
      assignedLocation: location._id,
      status: "active",
      isVerified: true
    });

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
