// Script to count how many items in delivered packages have status 'delivered'
import mongoose from 'mongoose';
import { Package } from '../models/package.model.js';
import { Item } from '../models/item.model.js';
import { conf } from '../config/config.js';

const MONGO_URI = conf.mongoUri || process.env.MONGO_URI || 'mongodb://localhost:27017/smartstock';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const deliveredPackages = await Package.find({ packageStatus: 'delivered' });
  let count = 0;

  for (const pkg of deliveredPackages) {
    if (Array.isArray(pkg.allocatedItems)) {
      for (const alloc of pkg.allocatedItems) {
        if (Array.isArray(alloc.itemIds) && alloc.itemIds.length > 0) {
          count += await Item.countDocuments({ _id: { $in: alloc.itemIds }, status: 'delivered' });
        }
      }
    }
  }

  console.log(`Delivered items with status 'delivered': ${count}`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
