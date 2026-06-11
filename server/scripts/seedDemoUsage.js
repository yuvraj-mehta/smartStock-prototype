import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import {
  AIInsight,
  Batch,
  DemandForecast,
  ExternalUser,
  Inventory,
  Item,
  Order,
  Package,
  PaymentReceived,
  Product,
  Return,
  SalesHistory,
  Transport,
  User,
} from "../models/index.js";
import {
  recordConfirmedSaleReceivableEvent,
  recordCustomerPaymentEvent,
} from "../services/finance/index.js";
import { seedProducts } from "./seedProducts.js";
import { isDirectRun, runScript } from "./lib/seedUtils.js";

const CURRENCY = "INR";
const DEMO_DATE = new Date("2026-06-01T09:00:00.000Z");
const DEV_ADMIN_EMAIL = "admin@smartstock.local";
const DEV_TRANSPORTER_EMAIL = "transporter@smartstock.local";
const DEV_TRANSPORTER_PASSWORD = "seed-transporter123";
const UNSAFE_TRANSPORTER_PASSWORDS = new Set([
  DEV_TRANSPORTER_PASSWORD,
  "transporter",
  "password",
  "password123",
  "changeme",
  "smartstock",
]);

const isTruthy = (value) => ["1", "true", "yes", "y"].includes(String(value).toLowerCase());
const cleanEnv = (key, fallback = "") => process.env[key]?.trim() || fallback;
const hasEnvValue = (key) => Object.prototype.hasOwnProperty.call(process.env, key);
const normalizePassword = (value) => String(value ?? "").trim();

const daysAfter = (days, hour = 9) => {
  const date = new Date(DEMO_DATE);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
};

const normalizeId = (value) => value?._id?.toString?.() || value?.toString?.();

export const getDemoTransporterSeedConfig = () => {
  const allowDevDefaultPassword = process.env.NODE_ENV === "development"
    && isTruthy(process.env.ALLOW_DEV_SEED_CREDENTIALS);
  const password = hasEnvValue("SEED_TRANSPORTER_PASSWORD")
    ? normalizePassword(process.env.SEED_TRANSPORTER_PASSWORD)
    : (allowDevDefaultPassword ? DEV_TRANSPORTER_PASSWORD : "");
  const usesDevDefaultPassword = allowDevDefaultPassword && !hasEnvValue("SEED_TRANSPORTER_PASSWORD");
  const passwordIsUnsafe = !usesDevDefaultPassword
    && (password.length < 12 || UNSAFE_TRANSPORTER_PASSWORDS.has(password.toLowerCase()));

  if (!password || passwordIsUnsafe) {
    throw new Error(
      "Refusing to seed a transporter with an unsafe password. "
      + "Set SEED_TRANSPORTER_PASSWORD to a unique value with at least 12 characters. "
      + "For local development defaults, set NODE_ENV=development and ALLOW_DEV_SEED_CREDENTIALS=1."
    );
  }

  if (allowDevDefaultPassword && !process.env.SEED_TRANSPORTER_PASSWORD) {
    console.warn("Using development transporter password. Set SEED_TRANSPORTER_PASSWORD to override it.");
  }

  return {
    email: cleanEnv("SEED_TRANSPORTER_EMAIL", DEV_TRANSPORTER_EMAIL).toLowerCase(),
    password,
    fullName: cleanEnv("SEED_TRANSPORTER_NAME", "Aarav Logistics Lead"),
    companyName: cleanEnv("SEED_TRANSPORTER_COMPANY", "RapidRider Logistics"),
    phone: cleanEnv("SEED_TRANSPORTER_PHONE", "2222222222"),
    address: cleanEnv("SEED_TRANSPORTER_ADDRESS", "42 Dispatch Park, Mumbai"),
    contactPerson: cleanEnv("SEED_TRANSPORTER_CONTACT", "Aarav Mehta"),
  };
};

export const getDemoTransporterLogMessage = (transporter = {}) => {
  const email = transporter.email || cleanEnv("SEED_TRANSPORTER_EMAIL", DEV_TRANSPORTER_EMAIL).toLowerCase();
  return `Demo transporter: ${email} (password not printed)`;
};

const withFinanceTransaction = async (callback) => {
  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

const createStatusHistory = (statuses, actorId, startDay) => statuses.map((status, index) => ({
  status,
  timestamp: daysAfter(startDay + index, 10 + index),
  notes: `Demo workflow moved to ${status.replaceAll("_", " ")}.`,
  updatedBy: actorId,
}));

const totalForItems = (allocations, productsById) => allocations.reduce((sum, allocation) => {
  const product = productsById.get(normalizeId(allocation.productId));
  return sum + ((Number(product?.price) || 0) * allocation.quantity);
}, 0);

const cogsForItemIds = async (itemIds) => {
  const items = await Item.find({ _id: { $in: itemIds } });
  return items.reduce((sum, item) => sum + (Number(item.purchasePrice) || 0), 0);
};

const createTransporter = async (warehouseId) => {
  const config = getDemoTransporterSeedConfig();
  const password = await bcrypt.hash(config.password, 10);
  return ExternalUser.findOneAndUpdate(
    { email: config.email },
    {
      $set: {
        fullName: config.fullName,
        companyName: config.companyName,
        password,
        phone: config.phone,
        address: config.address,
        contactPerson: config.contactPerson,
        rating: 5,
        role: "transporter",
        status: "active",
        isVerified: true,
        warehouseId,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        email: config.email,
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
};

const allocateProductItems = async ({ product, quantity, status, warehouse, orderNumber }) => {
  const items = await Item.find({
    productId: product._id,
    status: "in_stock",
    currentWarehouseId: warehouse._id,
  }).sort({ serialNumber: 1 }).limit(quantity);

  if (items.length < quantity) {
    throw new Error(`Not enough seed stock for ${product.productName}. Needed ${quantity}, found ${items.length}.`);
  }

  const itemIds = items.map((item) => item._id);
  const batchId = items[0].batchId;
  const itemUpdate = {
    $set: { status },
    $push: {
      history: {
        action: status === "packed" ? "packed" : status,
        date: new Date(),
        location: warehouse.warehouseName,
        notes: `Demo ${status.replaceAll("_", " ")} for order ${orderNumber}`,
      },
    },
  };

  if (status === "delivered") {
    itemUpdate.$unset = { currentWarehouseId: "" };
  } else {
    itemUpdate.$set.currentWarehouseId = warehouse._id;
  }

  await Item.updateMany({ _id: { $in: itemIds } }, itemUpdate);

  return {
    productId: product._id,
    batchId,
    quantity,
    itemIds,
  };
};

const createDemoOrder = async ({
  admin,
  warehouse,
  transporter,
  productsBySku,
  productsById,
  orderNumber,
  platformOrderId,
  status,
  itemSpecs,
  startDay,
  packageStatus,
  transportStatus,
  returnStatus,
  payment,
}) => {
  const orderItems = itemSpecs.map((spec) => ({
    productId: productsBySku.get(spec.sku)._id,
    quantity: spec.quantity,
  }));

  const order = await Order.create({
    orderNumber,
    platformOrderId,
    items: orderItems,
    orderStatus: status,
    notes: "Demo order seeded to show operational workflow history.",
    createdBy: admin._id,
    statusHistory: createStatusHistory(
      ["pending", "processing", "packaged", "dispatched", "delivered", "sale_confirmed", "returned"]
        .slice(0, ["pending", "processing", "packaged", "dispatched", "delivered", "sale_confirmed", "returned"].indexOf(status) + 1),
      admin._id,
      startDay
    ),
    createdAt: daysAfter(startDay),
    updatedAt: daysAfter(startDay + 2),
  });

  let packageDoc = null;
  let transport = null;
  let reverseTransport = null;
  let returnDoc = null;
  let allocations = [];

  if (packageStatus) {
    const itemStatusByPackageStatus = {
      created: "allocated",
      ready_for_dispatch: "packed",
      dispatched: "dispatched",
      in_transit: "dispatched",
      delivered: "delivered",
      returned: "damaged",
    };

    allocations = [];
    for (const spec of itemSpecs) {
      allocations.push(await allocateProductItems({
        product: productsBySku.get(spec.sku),
        quantity: spec.quantity,
        status: itemStatusByPackageStatus[packageStatus] || "packed",
        warehouse,
        orderNumber,
      }));
    }

    packageDoc = await Package.create({
      packageId: `PKG-DEMO-${orderNumber.replace("ORD-DEMO-", "")}`,
      orderId: order._id,
      allocatedItems: allocations,
      packageStatus,
      totalWeight: itemSpecs.reduce((sum, spec) => sum + ((Number(productsBySku.get(spec.sku).weight) || 0) * spec.quantity), 0),
      totalVolume: itemSpecs.reduce((sum, spec) => {
        const product = productsBySku.get(spec.sku);
        const dimension = product.dimension || {};
        return sum + ((Number(dimension.length) || 1) * (Number(dimension.breadth) || 1) * (Number(dimension.height) || 1) * spec.quantity);
      }, 0),
      totalValue: totalForItems(allocations, productsById),
      packedBy: admin._id,
      packedAt: daysAfter(startDay + 1, 13),
      notes: "Demo package generated from allocated seed stock.",
      createdAt: daysAfter(startDay + 1),
      updatedAt: daysAfter(startDay + 2),
    });
  }

  if (packageDoc && transportStatus) {
    transport = await Transport.create({
      trackingNumber: `TRK-DEMO-${orderNumber.replace("ORD-DEMO-", "")}`,
      packageId: packageDoc._id,
      transportType: "forward",
      transporterId: transporter._id,
      status: transportStatus,
      dispatchedAt: daysAfter(startDay + 2, 11),
      deliveredAt: transportStatus === "delivered" ? daysAfter(startDay + 4, 17) : undefined,
      assignedBy: admin._id,
      notes: "Demo forward delivery leg.",
      statusHistory: createStatusHistory(
        ["dispatched", "in_transit", "delivered"].slice(0, ["dispatched", "in_transit", "delivered"].indexOf(transportStatus) + 1),
        admin._id,
        startDay + 2
      ),
      createdAt: daysAfter(startDay + 2),
      updatedAt: daysAfter(startDay + 3),
    });
  }

  if (packageDoc && returnStatus) {
    const returnedAllocation = allocations[0];
    const returnedItemIds = returnedAllocation.itemIds.slice(0, 1);
    await Item.updateMany(
      { _id: { $in: returnedItemIds } },
      {
        $set: { status: "damaged", currentWarehouseId: warehouse._id },
        $push: {
          history: {
            action: "damaged",
            date: daysAfter(startDay + 7, 15),
            location: warehouse.warehouseName,
            notes: `Demo damaged return for order ${orderNumber}`,
          },
        },
      },
    );

    reverseTransport = await Transport.create({
      trackingNumber: `RTRN-DEMO-${orderNumber.replace("ORD-DEMO-", "")}`,
      packageId: packageDoc._id,
      transportType: "reverse",
      transporterId: transporter._id,
      status: "delivered",
      dispatchedAt: daysAfter(startDay + 5, 9),
      deliveredAt: daysAfter(startDay + 6, 14),
      assignedBy: admin._id,
      notes: "Demo reverse pickup for customer return.",
      statusHistory: createStatusHistory(["dispatched", "in_transit", "delivered"], admin._id, startDay + 5),
      createdAt: daysAfter(startDay + 5),
      updatedAt: daysAfter(startDay + 6),
    });

    returnDoc = await Return.create({
      returnNumber: `RET-DEMO-${orderNumber.replace("ORD-DEMO-", "")}`,
      packageId: packageDoc._id,
      orderId: order._id,
      returnedItems: [{
        productId: returnedAllocation.productId,
        batchId: returnedAllocation.batchId,
        quantity: returnedItemIds.length,
        disposition: "damaged",
        itemIds: returnedItemIds,
      }],
      returnReason: "damaged",
      returnStatus,
      returnDate: daysAfter(startDay + 4, 12),
      receivedDate: daysAfter(startDay + 6, 15),
      processedDate: returnStatus === "processed" ? daysAfter(startDay + 7, 15) : undefined,
      transportId: reverseTransport._id,
      warehouseId: warehouse._id,
      processedBy: admin._id,
      notes: "Demo return processed after reverse transport receipt.",
      createdAt: daysAfter(startDay + 4),
      updatedAt: daysAfter(startDay + 7),
    });

    packageDoc.packageStatus = "returned";
    await packageDoc.save();
  }

  if (status === "sale_confirmed" && packageDoc) {
    const salesHistory = await SalesHistory.create({
      packageId: packageDoc._id,
      orderId: order._id,
      products: allocations.map((allocation) => ({
        productId: allocation.productId,
        batchId: allocation.batchId,
        quantity: allocation.quantity,
        itemIds: allocation.itemIds,
      })),
      warehouseId: warehouse._id,
      saleConfirmationDate: daysAfter(startDay + 5, 12),
      deliveryDate: daysAfter(startDay + 4, 17),
      notes: "Demo sale confirmation created from delivered package.",
    });

    await withFinanceTransaction(async (session) => recordConfirmedSaleReceivableEvent({
      amount: packageDoc.totalValue,
      orderId: order._id,
      packageId: packageDoc._id,
      packageNumber: packageDoc.packageId,
      salesHistoryId: salesHistory._id,
      allocatedItems: packageDoc.allocatedItems,
      cogsAmount: await cogsForItemIds(allocations.flatMap((allocation) => allocation.itemIds)),
      cogsItemIds: allocations.flatMap((allocation) => allocation.itemIds),
      warehouseId: warehouse._id,
      currency: CURRENCY,
      occurredAt: daysAfter(startDay + 5, 12),
      deliveryDate: daysAfter(startDay + 4, 17),
      actorId: admin._id,
      session,
    }));
  }

  if (payment) {
    const paymentDoc = await PaymentReceived.create({
      orderId: order._id,
      amount: payment.amount || packageDoc?.totalValue || totalForItems(orderItems, productsById),
      date: daysAfter(startDay + payment.dayOffset, 16),
      method: payment.method,
      status: payment.status,
      createdAt: daysAfter(startDay + payment.dayOffset, 16),
      updatedAt: daysAfter(startDay + payment.dayOffset, 16),
    });

    if (payment.status === "completed") {
      await withFinanceTransaction((session) => recordCustomerPaymentEvent({
        amount: paymentDoc.amount,
        orderId: order._id,
        paymentReceivedId: paymentDoc._id,
        warehouseId: warehouse._id,
        currency: CURRENCY,
        occurredAt: paymentDoc.date,
        actorId: admin._id,
        session,
      }));
    }
  }

  return {
    order,
    packageDoc,
    transport,
    reverseTransport,
    returnDoc,
  };
};

const syncInventoryQuantities = async () => {
  const batches = await Batch.find({});

  for (const batch of batches) {
    const inStockItems = await Item.find({
      batchId: batch._id,
      currentWarehouseId: batch.warehouseId,
      status: "in_stock",
    });

    await Inventory.findOneAndUpdate(
      { batchId: batch._id, warehouseId: batch.warehouseId },
      {
        $set: {
          quantity: inStockItems.length,
          inventoryValue: inStockItems.reduce((sum, item) => sum + (Number(item.purchasePrice) || 0), 0),
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
  }

  const products = await Product.find({});
  for (const product of products) {
    const quantity = await Item.countDocuments({ productId: product._id, status: "in_stock" });
    await Product.updateOne(
      { _id: product._id },
      {
        $set: {
          quantity,
          restockRecommended: quantity <= (Number(product.thresholdLimit) || 0),
        },
      },
      { runValidators: true }
    );
  }
};

const seedAIRecords = async ({ admin, warehouse, productsBySku }) => {
  const iphone = productsBySku.get("IPH15P-001");
  const chair = productsBySku.get("EOC-001");

  await DemandForecast.create([
    {
      productId: iphone._id,
      warehouseId: warehouse._id,
      forecastPeriod: {
        startDate: daysAfter(1),
        endDate: daysAfter(30),
        periodType: "monthly",
      },
      aiPrediction: {
        forecastQuantity: 18,
        confidenceLevel: 82,
        keyFactors: [
          { factor: "Recent order velocity", impact: "high", description: "Smartphones moved fastest in demo sales." },
          { factor: "Low remaining stock", impact: "medium", description: "Fulfilled orders reduced available stock." },
        ],
      },
      historicalData: {
        salesVelocity: { avgDailySales: 0.8, trend: "increasing" },
        seasonalFactor: 1.12,
        marketConditions: { demand: "high", competition: "medium", priceElasticity: 0.7 },
      },
      recommendations: {
        optimalStockLevel: 30,
        reorderPoint: 8,
        safetyStock: 5,
        maxStockLevel: 45,
        orderQuantity: 20,
      },
      riskAssessment: {
        stockoutRisk: "medium",
        overStockRisk: "low",
        marketRisk: "medium",
        mitigation: ["Raise reorder point for phone SKUs", "Review supplier lead time before campaign season"],
      },
      generatedBy: admin._id,
      status: "active",
    },
    {
      productId: chair._id,
      warehouseId: warehouse._id,
      forecastPeriod: {
        startDate: daysAfter(1),
        endDate: daysAfter(30),
        periodType: "monthly",
      },
      aiPrediction: {
        forecastQuantity: 7,
        confidenceLevel: 74,
        keyFactors: [
          { factor: "Stable office demand", impact: "medium", description: "Furniture orders are steady but slower than electronics." },
        ],
      },
      historicalData: {
        salesVelocity: { avgDailySales: 0.25, trend: "stable" },
        seasonalFactor: 1.0,
        marketConditions: { demand: "medium", competition: "low", priceElasticity: 0.4 },
      },
      recommendations: {
        optimalStockLevel: 18,
        reorderPoint: 6,
        safetyStock: 3,
        maxStockLevel: 28,
        orderQuantity: 10,
      },
      riskAssessment: {
        stockoutRisk: "low",
        overStockRisk: "medium",
        mitigation: ["Avoid bulk reorder until current chairs move below threshold"],
      },
      generatedBy: admin._id,
      status: "active",
    },
  ]);

  await AIInsight.create([
    {
      insightType: "stock_optimization",
      title: "Electronics reorder window approaching",
      description: "Phone and laptop stock moved through multiple delivery stages. Reorder before confirmed sales consume remaining fast-moving units.",
      severity: "high",
      category: "inventory",
      scope: "category",
      targetData: { warehouseId: warehouse._id, productCategory: "electronics" },
      aiAnalysis: {
        response: {
          summary: "Electronics demand is stronger than furniture and apparel in the demo period.",
          recommendation: "Open Add Supply for iPhone and MacBook SKUs.",
        },
        confidence: 84,
        processingTime: 620,
      },
      dataSource: {
        inventorySnapshot: { recordCount: 5, snapshotDate: new Date() },
        externalFactors: ["Demo order velocity", "Low stock threshold proximity"],
      },
      actionItems: [{
        action: "Create replenishment order for electronics supplier.",
        priority: "high",
        estimatedImpact: "Avoid stockout on top-value SKUs",
        timeline: "This week",
        assignedTo: admin._id,
        status: "pending",
        dueDate: daysAfter(7),
      }],
      metrics: { revenueImpact: 250000, riskReduction: 30 },
      validity: { validUntil: daysAfter(14), refreshFrequency: "weekly", autoRefresh: false },
      generatedBy: admin._id,
      status: "active",
    },
    {
      insightType: "risk_assessment",
      title: "Returned item generated damaged-stock exposure",
      description: "One processed return was marked damaged and is now visible in damaged inventory value.",
      severity: "medium",
      category: "operations",
      scope: "warehouse",
      targetData: { warehouseId: warehouse._id },
      aiAnalysis: {
        response: {
          summary: "Reverse logistics is active and should be reviewed for root cause.",
          recommendation: "Inspect packaging notes for returned electronics orders.",
        },
        confidence: 76,
        processingTime: 540,
      },
      dataSource: {
        inventorySnapshot: { recordCount: 1, snapshotDate: new Date() },
        externalFactors: ["Processed return", "Damaged disposition"],
      },
      actionItems: [{
        action: "Review return reason and packaging checklist.",
        priority: "medium",
        estimatedImpact: "Reduce repeated damage returns",
        timeline: "Next 3 days",
        assignedTo: admin._id,
        status: "pending",
        dueDate: daysAfter(3),
      }],
      metrics: { costReduction: 15000, riskReduction: 18 },
      validity: { validUntil: daysAfter(10), refreshFrequency: "weekly", autoRefresh: false },
      generatedBy: admin._id,
      status: "active",
    },
  ]);
};

export const seedDemoUsage = async () => {
  await seedProducts();

  const adminEmail = cleanEnv("ADMIN_EMAIL", DEV_ADMIN_EMAIL).toLowerCase();
  const admin = await User.findOne({ email: adminEmail }).populate("assignedWarehouseId");
  if (!admin?.assignedWarehouseId) {
    throw new Error("Seed admin or warehouse missing.");
  }

  const warehouse = admin.assignedWarehouseId;
  const transporter = await createTransporter(warehouse._id);
  const products = await Product.find({});
  const productsBySku = new Map(products.map((product) => [product.sku, product]));
  const productsById = new Map(products.map((product) => [normalizeId(product._id), product]));

  const orderPlans = [
    {
      orderNumber: "ORD-DEMO-1001",
      platformOrderId: "MKT-DEMO-1001",
      status: "pending",
      itemSpecs: [{ sku: "CUJ-001", quantity: 2 }],
      startDay: -10,
    },
    {
      orderNumber: "ORD-DEMO-1002",
      platformOrderId: "MKT-DEMO-1002",
      status: "processing",
      itemSpecs: [{ sku: "IPH15P-001", quantity: 1 }, { sku: "SGS24-001", quantity: 1 }],
      startDay: -9,
    },
    {
      orderNumber: "ORD-DEMO-1003",
      platformOrderId: "MKT-DEMO-1003",
      status: "packaged",
      itemSpecs: [{ sku: "EOC-001", quantity: 2 }],
      startDay: -8,
      packageStatus: "ready_for_dispatch",
    },
    {
      orderNumber: "ORD-DEMO-1004",
      platformOrderId: "MKT-DEMO-1004",
      status: "dispatched",
      itemSpecs: [{ sku: "MBP14-001", quantity: 1 }],
      startDay: -7,
      packageStatus: "dispatched",
      transportStatus: "in_transit",
    },
    {
      orderNumber: "ORD-DEMO-1005",
      platformOrderId: "MKT-DEMO-1005",
      status: "delivered",
      itemSpecs: [{ sku: "SGS24-001", quantity: 2 }],
      startDay: -6,
      packageStatus: "delivered",
      transportStatus: "delivered",
      payment: { status: "pending", method: "upi", dayOffset: 5 },
    },
    {
      orderNumber: "ORD-DEMO-1006",
      platformOrderId: "MKT-DEMO-1006",
      status: "sale_confirmed",
      itemSpecs: [{ sku: "IPH15P-001", quantity: 1 }, { sku: "MBP14-001", quantity: 1 }],
      startDay: -5,
      packageStatus: "delivered",
      transportStatus: "delivered",
      payment: { status: "completed", method: "bank", dayOffset: 6 },
    },
    {
      orderNumber: "ORD-DEMO-1007",
      platformOrderId: "MKT-DEMO-1007",
      status: "returned",
      itemSpecs: [{ sku: "IPH15P-001", quantity: 1 }],
      startDay: -4,
      packageStatus: "returned",
      transportStatus: "delivered",
      returnStatus: "processed",
    },
  ];

  const created = [];
  for (const plan of orderPlans) {
    created.push(await createDemoOrder({
      ...plan,
      admin,
      warehouse,
      transporter,
      productsBySku,
      productsById,
    }));
  }

  await syncInventoryQuantities();
  await seedAIRecords({ admin, warehouse, productsBySku });

  const summary = {
    orders: created.length,
    packages: created.filter((entry) => entry.packageDoc).length,
    transports: created.filter((entry) => entry.transport).length + created.filter((entry) => entry.reverseTransport).length,
    returns: created.filter((entry) => entry.returnDoc).length,
    payments: await PaymentReceived.countDocuments({}),
    forecasts: await DemandForecast.countDocuments({}),
    insights: await AIInsight.countDocuments({}),
  };

  console.table([summary]);
  console.log("Seeded realistic demo usage data.");
  console.log(getDemoTransporterLogMessage(transporter));
  return summary;
};

if (isDirectRun(import.meta.url)) {
  runScript(seedDemoUsage, "seed-demo-usage");
}
