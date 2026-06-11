import app from "./app.js";
import { conf, validateRequiredConfig } from "./config/config.js";
import connectDb from "./database/db.js";
import mongoose from "mongoose";
import { startScheduledJobs, stopScheduledJobs } from "./utils/scheduler.js";

const host = process.env.HOST || "0.0.0.0";
const shutdownTimeoutMs = 10000;
let httpServer;
let isShuttingDown = false;

const listen = () => new Promise((resolve, reject) => {
  httpServer = app.listen(conf.port, host, () => {
    resolve(httpServer);
  });

  httpServer.on("error", reject);
});

const closeHttpServer = () => new Promise((resolve, reject) => {
  if (!httpServer) {
    resolve();
    return;
  }

  httpServer.close((error) => {
    if (error) {
      reject(error);
      return;
    }

    resolve();
  });
});

const closeMongoConnection = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

const shutdown = async (signal) => {
  if (isShuttingDown) {
    console.log(`${signal} received while shutdown is already in progress`);
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received. Shutting down SmartStock API...`);

  const forceExitTimer = setTimeout(() => {
    console.error(`Graceful shutdown exceeded ${shutdownTimeoutMs}ms. Forcing exit.`);
    process.exit(1);
  }, shutdownTimeoutMs);
  forceExitTimer.unref();

  try {
    stopScheduledJobs();
    await closeHttpServer();
    await closeMongoConnection();
    clearTimeout(forceExitTimer);
    console.log("SmartStock API shutdown complete");
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExitTimer);
    console.error("SmartStock API shutdown failed:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

const startServer = async () => {
  try {
    validateRequiredConfig();
    await connectDb();

    // Start scheduled jobs only after the database connection is ready.
    startScheduledJobs();

    await listen();
    console.log(`Server is running on ${host}:${conf.port} and connected to database ${conf.dbName}`);
  } catch (error) {
    console.error("Server startup failed:", error.message);
    stopScheduledJobs();
    await closeMongoConnection();
    process.exit(1);
  }
};

startServer();
