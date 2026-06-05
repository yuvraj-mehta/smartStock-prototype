import mongoose from "mongoose";
import { pathToFileURL } from "node:url";
import { conf } from "../../config/config.js";

export const isDirectRun = (importMetaUrl) => {
  const entryPath = process.argv[1];
  return Boolean(entryPath && pathToFileURL(entryPath).href === importMetaUrl);
};

export const connectForScript = async (scriptName = "script") => {
  if (!conf.mongoUri) {
    throw new Error("Missing required configuration: MONGO_URI");
  }

  if (mongoose.connection.readyState === 1) {
    return false;
  }

  if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise();
    return false;
  }

  await mongoose.connect(conf.mongoUri, { dbName: conf.dbName });
  console.log(`[${scriptName}] Connected to MongoDB database "${conf.dbName}".`);
  return true;
};

export const disconnectForScript = async (openedConnection, scriptName = "script") => {
  if (!openedConnection || mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  console.log(`[${scriptName}] Disconnected from MongoDB.`);
};

export const runScript = async (main, scriptName = "script") => {
  let openedConnection = false;

  try {
    openedConnection = await connectForScript(scriptName);
    await main();
  } catch (error) {
    console.error(`[${scriptName}] Failed:`, error);
    process.exitCode = 1;
  } finally {
    await disconnectForScript(openedConnection, scriptName);
  }
};
