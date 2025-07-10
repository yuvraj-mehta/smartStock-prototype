// Script to update all items in delivered packages to status 'delivered'
import mongoose from 'mongoose';
import { Package } from '../models/package.model.js';
import { Item } from '../models/item.model.js';

import { conf } from '../config/config.js';

const MONGO_URI = conf.mongoUri || process.env.MONGO_URI || 'mongodb://localhost:27017/smartstock';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const deliveredPackages = await Package.find({ packageStatus: 'delivered' });
  let totalUpdated = 0;

  for (const pkg of deliveredPackages) {
    if (Array.isArray(pkg.allocatedItems)) {
      for (const alloc of pkg.allocatedItems) {
        if (Array.isArray(alloc.itemIds) && alloc.itemIds.length > 0) {
          const res = await Item.updateMany(
            { _id: { $in: alloc.itemIds }, status: { $ne: 'delivered' } },
            {
              $set: { status: 'delivered' },
              $push: {
                history: {
                  action: 'delivered',
                  location: 'Customer',
                  notes: `Delivered via package ${pkg.packageId}`,
                  date: new Date()
                }
              }
            }
          );
          totalUpdated += res.modifiedCount || 0;
        }
      }
    }
  }

  console.log(`Updated ${totalUpdated} items to status 'delivered'.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
