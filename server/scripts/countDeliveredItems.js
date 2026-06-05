import { Item, Package } from "../models/index.js";
import { isDirectRun, runScript } from "./lib/seedUtils.js";

export const countDeliveredItems = async () => {
  const deliveredPackages = await Package.find({ packageStatus: "delivered" }).select("allocatedItems");
  let count = 0;

  for (const pkg of deliveredPackages) {
    if (!Array.isArray(pkg.allocatedItems)) {
      continue;
    }

    for (const allocation of pkg.allocatedItems) {
      if (!Array.isArray(allocation.itemIds) || allocation.itemIds.length === 0) {
        continue;
      }

      count += await Item.countDocuments({
        _id: { $in: allocation.itemIds },
        status: "delivered",
      });
    }
  }

  console.log(`Delivered items with status "delivered": ${count}`);
  return count;
};

if (isDirectRun(import.meta.url)) {
  runScript(countDeliveredItems, "count-delivered-items");
}
