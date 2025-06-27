import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";
import { conf } from "../config/config.js"; // Make sure conf.mongoUri & conf.dbName are defined

const createAdmin = async () => {
  try {
    await mongoose.connect(conf.mongoUri, {
      dbName: conf.dbName,
    });

    console.log("✅ Database connected successfully");

    const existingAdmin = await User.findOne({ email: "admin@example.com" });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists with this email.");
      return process.exit(0);
    }

    const hashedPassword = await bcrypt.hash("Admin@123", 10);

    const adminUser = new User({
      fullName: "Super Admin",
      email: "admin@example.com",
      password: hashedPassword,
      role: "admin",
      status: "active",
      emailVerified: true,
      createdAt: new Date(),
    });

    await adminUser.save();
    console.log("🎉 Admin user created successfully:", adminUser.email);
  } catch (err) {
    console.error("❌ Error creating admin:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createAdmin();
