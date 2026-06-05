import { Item, Package } from "../models/index.js";
import { isDirectRun, runScript } from "./lib/seedUtils.js";

export const fixDeliveredItems = async () => {
  const deliveredPackages = await Package.find({ packageStatus: "delivered" }).select("allocatedItems packageId");
  let totalUpdated = 0;

  for (const pkg of deliveredPackages) {
    if (!Array.isArray(pkg.allocatedItems)) {
      continue;
    }

    for (const allocation of pkg.allocatedItems) {
      if (!Array.isArray(allocation.itemIds) || allocation.itemIds.length === 0) {
        continue;
      }

      const result = await Item.updateMany(
        { _id: { $in: allocation.itemIds }, status: { $ne: "delivered" } },
        {
          $set: { status: "delivered" },
          $push: {
            history: {
              action: "delivered",
              location: "Customer",
              notes: `Delivered via package ${pkg.packageId}`,
              date: new Date(),
            },
          },
        },
        { runValidators: true }
      );

      totalUpdated += result.modifiedCount || 0;
    }
  }

  console.log(`Updated ${totalUpdated} items to status "delivered".`);
  return totalUpdated;
};

if (isDirectRun(import.meta.url)) {
  runScript(fixDeliveredItems, "fix-delivered-items");
}
