import mongoose from "mongoose";
import { conf } from "../config/config.js";

const connectDb = async () => {
  try {
    if (!conf.mongoUri) {
      throw new Error("MONGO_URI is not defined in the configuration.");
    }
    await mongoose.connect(conf.mongoUri, {
      dbName: conf.dbName,
    })

    console.log("Database connected successfully");
    
  } catch (error) {
    console.error("Database connection failed:", error);
  }
}

export default connectDb;