import cron from 'node-cron';
import { Package, Transport, SalesHistory, Order } from "../models/index.js";

// Auto-confirm sales after 10 days of delivery
const autoConfirmSales = async () => {
  try {
    console.log('Running auto-confirm sales job...');

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    // Find all packages delivered more than 10 days ago that haven't been confirmed
    const packages = await Package.find({
      packageStatus: 'delivered',
      updatedAt: { $lt: tenDaysAgo }
    }).populate('orderId');

    let confirmedCount = 0;

    for (const packageDoc of packages) {
      // Skip if order is already confirmed or returned
      if (packageDoc.orderId.orderStatus === 'sale_confirmed' ||
        packageDoc.orderId.orderStatus === 'returned') {
        continue;
      }

      const transport = await Transport.findOne({ packageId: packageDoc._id });
      if (!transport || !transport.deliveredAt) continue;

      const deliveryDate = new Date(transport.deliveredAt);
      const daysSinceDelivery = Math.floor((new Date() - deliveryDate) / (1000 * 60 * 60 * 24));

      if (daysSinceDelivery >= 10) {
        // Create sales history record
        await SalesHistory.create({
          packageId: packageDoc._id,
          orderId: packageDoc.orderId._id,
          products: packageDoc.allocatedItems,
          warehouseId: packageDoc.allocatedItems[0]?.warehouseId, // Use first item's warehouse
          saleConfirmationDate: new Date(),
          deliveryDate: transport.deliveredAt,
          notes: 'Auto-confirmed after 10 days'
        });

        // Update order status
        packageDoc.orderId.orderStatus = 'sale_confirmed';
        await packageDoc.orderId.save();

        confirmedCount++;
      }
    }

    console.log(`Auto-confirmed ${confirmedCount} sales`);
  } catch (error) {
    console.error('Error in auto-confirm sales job:', error);
  }
};

// Schedule the job to run daily at 2 AM
export const startScheduledJobs = () => {
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', autoConfirmSales, {
    scheduled: true,
    timezone: "America/New_York"
  });

  console.log('Scheduled jobs started');
};

export { autoConfirmSales };
