import { seedAdmin } from "./scripts/seedAdmin.js";
import { isDirectRun, runScript } from "./scripts/lib/seedUtils.js";

if (isDirectRun(import.meta.url)) {
  runScript(seedAdmin, "seed-admin");
}

export { seedAdmin };
