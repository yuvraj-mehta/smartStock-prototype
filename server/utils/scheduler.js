import cron from 'node-cron';
import mongoose from 'mongoose';
import { Batch, Package, Transport, SalesHistory, Return } from "../models/index.js";
import { recordConfirmedSaleReceivableEvent } from "../services/finance/index.js";

let scheduledTasks = [];

const normalizeId = (id) => (id?._id || id)?.toString();

const allocationKey = (item) => `${normalizeId(item.productId)}:${normalizeId(item.batchId)}`;

const addQuantity = (quantities, key, quantity) => {
  if (quantity <= 0) return;
  quantities.set(key, (quantities.get(key) || 0) + quantity);
};

const getAllocationItemIds = (item) => (
  Array.isArray(item?.itemIds) ? item.itemIds.map(normalizeId).filter(Boolean) : []
);

const getAllocationQuantity = (item) => {
  const itemIds = getAllocationItemIds(item);
  return itemIds.length || Number(item?.quantity) || 0;
};

const createReturnAllocationState = () => ({
  returnedItemIds: new Set(),
  itemlessQuantitiesByAllocation: new Map(),
  totalQuantitiesByAllocation: new Map(),
});

const recordReturnedItemInState = (state, returnedItem) => {
  const key = allocationKey(returnedItem);
  const itemIds = getAllocationItemIds(returnedItem);
  const quantity = Number(returnedItem.quantity) || itemIds.length;

  addQuantity(state.totalQuantitiesByAllocation, key, quantity);

  if (itemIds.length > 0) {
    itemIds.forEach((itemId) => state.returnedItemIds.add(itemId));
  } else {
    addQuantity(state.itemlessQuantitiesByAllocation, key, quantity);
  }
};

const buildReturnAllocationState = (returnRecords = []) => {
  const state = createReturnAllocationState();

  for (const returnRecord of returnRecords) {
    for (const returnedItem of returnRecord?.returnedItems || []) {
      recordReturnedItemInState(state, returnedItem);
    }
  }

  return state;
};

const getSaleableItemIds = (allocation, returnState) => {
  const itemIds = Array.isArray(allocation?.itemIds) ? allocation.itemIds : [];
  if (itemIds.length === 0) return [];

  const key = allocationKey(allocation);
  const availableAfterExplicitReturns = itemIds.filter(
    (itemId) => !returnState.returnedItemIds.has(normalizeId(itemId))
  );
  const reservedItemlessQuantity = returnState.itemlessQuantitiesByAllocation.get(key) || 0;
  const reservedItemIds = new Set(
    availableAfterExplicitReturns.slice(0, reservedItemlessQuantity).map(normalizeId)
  );

  return availableAfterExplicitReturns.filter((itemId) => !reservedItemIds.has(normalizeId(itemId)));
};

const getSaleablePackageItems = (packageDoc, returnRecords = []) => {
  const returnState = buildReturnAllocationState(returnRecords);

  return (packageDoc.allocatedItems || [])
    .map((allocation) => {
      const itemIds = getSaleableItemIds(allocation, returnState);

      if (itemIds.length > 0 || getAllocationItemIds(allocation).length > 0) {
        return {
          productId: allocation.productId,
          batchId: allocation.batchId,
          quantity: itemIds.length,
          itemIds,
        };
      }

      const returnedQuantity = returnState.totalQuantitiesByAllocation.get(allocationKey(allocation)) || 0;
      const quantity = Math.max(0, (Number(allocation.quantity) || 0) - returnedQuantity);
      return {
        productId: allocation.productId,
        batchId: allocation.batchId,
        quantity,
      };
    })
    .filter((allocation) => allocation.quantity > 0);
};

const getPopulatedProductPrice = (product) => (
  product && typeof product === 'object' && !product._bsontype && typeof product.price === 'number'
    ? product.price
    : undefined
);

const roundCurrency = (amount) => Math.round((Number(amount) || 0) * 100) / 100;

const calculateNetSaleAmount = (packageDoc, saleableItems) => {
  const totalValue = Number(packageDoc.totalValue) || 0;
  const totalQuantity = (packageDoc.allocatedItems || []).reduce(
    (sum, allocation) => sum + getAllocationQuantity(allocation),
    0
  );
  const saleableQuantity = saleableItems.reduce((sum, allocation) => sum + getAllocationQuantity(allocation), 0);

  if (saleableQuantity <= 0) return 0;
  if (saleableQuantity === totalQuantity) return totalValue;

  let amountFromPrices = 0;
  let hasAllPrices = true;

  for (const allocation of saleableItems) {
    const unitPrice = getPopulatedProductPrice(allocation.productId);
    if (unitPrice === undefined) {
      hasAllPrices = false;
      break;
    }
    amountFromPrices += unitPrice * getAllocationQuantity(allocation);
  }

  if (hasAllPrices) return roundCurrency(amountFromPrices);
  if (totalQuantity <= 0) return 0;

  return roundCurrency(totalValue * (saleableQuantity / totalQuantity));
};

const getPackageWarehouseId = async (packageDoc, session) => {
  const batchIds = [
    ...new Set(
      (packageDoc.allocatedItems || [])
        .map((item) => normalizeId(item.batchId))
        .filter(Boolean)
    ),
  ];

  if (batchIds.length === 0) return null;

  const query = Batch.findOne({ _id: { $in: batchIds } }).select('warehouseId');
  const batch = session ? await query.session(session) : await query;
  return batch?.warehouseId || null;
};

// Auto-confirm sales after 10 days of delivery
const autoConfirmSales = async () => {
  try {
    console.log('Running auto-confirm sales job...');

    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

    // Find all packages delivered more than 10 days ago that haven't been confirmed
    const packages = await Package.find({
      packageStatus: 'delivered',
    }).populate('orderId');

    let confirmedCount = 0;

    for (const packageDoc of packages) {
      const session = await mongoose.startSession();
      let confirmedPackage = false;

      try {
        await session.withTransaction(async () => {
          const scopedPackage = await Package.findById(packageDoc._id)
            .populate('orderId')
            .populate('allocatedItems.productId', 'price')
            .session(session);
          if (!scopedPackage?.orderId) return;

          // Skip if order is already confirmed or returned
          if (scopedPackage.orderId.orderStatus === 'sale_confirmed' ||
            scopedPackage.orderId.orderStatus === 'returned') {
            return;
          }

          const transport = await Transport.findOne({ packageId: scopedPackage._id }).session(session);
          if (!transport || !transport.deliveredAt) return;

          const deliveryDate = new Date(transport.deliveredAt);
          const daysSinceDelivery = Math.floor((new Date() - deliveryDate) / (1000 * 60 * 60 * 24));

          if (daysSinceDelivery < 10) return;

          const warehouseId = await getPackageWarehouseId(scopedPackage, session);
          if (!warehouseId) return;

          const returnRecords = await Return.find({ packageId: scopedPackage._id }).session(session);
          const saleableAllocatedItems = getSaleablePackageItems(scopedPackage, returnRecords);
          const netSaleAmount = calculateNetSaleAmount(scopedPackage, saleableAllocatedItems);

          if (saleableAllocatedItems.length === 0 || netSaleAmount <= 0) return;

          const saleConfirmationDate = new Date();
          const [salesHistory] = await SalesHistory.create([{
            packageId: scopedPackage._id,
            orderId: scopedPackage.orderId._id,
            products: saleableAllocatedItems,
            warehouseId,
            saleConfirmationDate,
            deliveryDate: transport.deliveredAt,
            notes: 'Auto-confirmed after 10 days'
          }], { session });

          await recordConfirmedSaleReceivableEvent({
            amount: netSaleAmount,
            orderId: scopedPackage.orderId._id,
            packageId: scopedPackage._id,
            packageNumber: scopedPackage.packageId,
            salesHistoryId: salesHistory._id,
            allocatedItems: saleableAllocatedItems,
            warehouseId,
            occurredAt: saleConfirmationDate,
            deliveryDate: transport.deliveredAt,
            session,
          });

          // Update order status
          scopedPackage.orderId.orderStatus = 'sale_confirmed';
          await scopedPackage.orderId.save({ session });

          confirmedPackage = true;
        });

        if (confirmedPackage) {
          confirmedCount++;
        }
      } catch (error) {
        console.error('Error auto-confirming package sale:', error);
      } finally {
        await session.endSession();
      }
    }

    console.log(`Auto-confirmed ${confirmedCount} sales`);
  } catch (error) {
    console.error('Error in auto-confirm sales job:', error);
  }
};

// Schedule the job to run daily at 2 AM
export const startScheduledJobs = () => {
  if (scheduledTasks.length > 0) {
    console.log('Scheduled jobs already started');
    return scheduledTasks;
  }

  // Run daily at 2:00 AM
  const autoConfirmSalesTask = cron.schedule('0 2 * * *', autoConfirmSales, {
    scheduled: true,
    timezone: "America/New_York"
  });

  scheduledTasks = [autoConfirmSalesTask];
  console.log('Scheduled jobs started');
  return scheduledTasks;
};

export const stopScheduledJobs = () => {
  for (const task of scheduledTasks) {
    task?.stop?.();
    task?.destroy?.();
  }

  scheduledTasks = [];
};

export { autoConfirmSales };
