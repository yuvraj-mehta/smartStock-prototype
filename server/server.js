import app from "./app.js";
import { conf, validateRequiredConfig } from "./config/config.js";
import connectDb from "./database/db.js";
import { startScheduledJobs } from "./utils/scheduler.js";

const startServer = async () => {
  try {
    validateRequiredConfig();
    await connectDb();

    // Start scheduled jobs only after the database connection is ready.
    startScheduledJobs();

    app.listen(conf.port, () => {
      console.log(`Server is running on port ${conf.port} and connected to database ${conf.dbName}`)
    })
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
