import { Router } from "express";
import mongoose from "mongoose";
import { conf, getConfigValidation } from "../config/config.js";

const router = Router();

const databaseStates = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

const getMemoryUsage = () => {
  const memoryUsage = process.memoryUsage();

  return {
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
  };
};

export const getReadinessDetails = () => {
  const config = getConfigValidation();
  const databaseReadyState = mongoose.connection.readyState;
  const databaseConnected = databaseReadyState === 1;

  return {
    ready: databaseConnected && config.required.valid,
    checks: {
      database: {
        status: databaseConnected ? "ready" : "not_ready",
        connected: databaseConnected,
        readyState: databaseReadyState,
        state: databaseStates[databaseReadyState] || "unknown",
        databaseName: mongoose.connection.name || conf.dbName || null,
        host: mongoose.connection.host || null,
      },
      config: {
        status: config.required.valid ? "ready" : "not_ready",
        required: config.required,
        optional: config.optional,
      },
    },
  };
};

router.get("/", (req, res) => {
  const readiness = getReadinessDetails();

  res.status(200).json({
    status: "healthy",
    service: "smartstock-api",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    readiness,
    memory: getMemoryUsage(),
  });
});

router.get("/ready", (req, res) => {
  const readiness = getReadinessDetails();

  res.status(readiness.ready ? 200 : 503).json({
    status: readiness.ready ? "ready" : "not_ready",
    service: "smartstock-api",
    timestamp: new Date().toISOString(),
    readiness,
  });
});

export default router;
