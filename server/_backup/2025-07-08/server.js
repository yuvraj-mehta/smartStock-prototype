import app from "./app.js";
import { conf } from "./config/config.js";
import connectDb from "./database/db.js";
import { startScheduledJobs } from "./utils/scheduler.js";

connectDb();

// Start scheduled jobs for auto-sales confirmation
startScheduledJobs();

app.listen(conf.port, () => {
  console.log(`Server is running on port ${conf.port} and connected to database ${conf.dbName}`)
})