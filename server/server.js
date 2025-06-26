import app from "./app.js";
import { conf } from "./config/config.js";
import connectDb from "./database/db.js";

connectDb();

app.listen(conf.port, () => {
  console.log(`Server is running on port ${conf.port} and connected to database ${conf.dbName}`)
})

