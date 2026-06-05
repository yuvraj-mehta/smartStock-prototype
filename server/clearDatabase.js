import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import {
  AIInsight,
  AuditLog,
  Batch,
  Customer,
  DemandForecast,
  FinancialEvent,
  FulfillmentOrder,
  IncomingSupply,
  Inventory,
  InventoryMovement,
  Invoice,
  Item,
  JournalEntry,
  Order,
  Package,
  Payment,
  PaymentReceived,
  Product,
  PurchaseOrder,
  Return,
  SalesHistory,
  SalesInvoice,
  SalesOrder,
  Transport,
  Wage,
  Warehouse,
} from './models/index.js';
import { User } from './models/user.model.js';
import { ExternalUser } from './models/externalUsers.model.js';
import { conf } from './config/config.js';

const protectedDatabaseNames = new Set(['admin', 'config', 'local', 'prod', 'production']);

export const collectionsToClear = [
  ['items', Item],
  ['inventories', Inventory],
  ['inventorymovements', InventoryMovement],
  ['batches', Batch],
  ['orders', Order],
  ['saleshistories', SalesHistory],
  ['returns', Return],
  ['salesorders', SalesOrder],
  ['salesinvoices', SalesInvoice],
  ['paymentreceiveds', PaymentReceived],
  ['products', Product],
  ['purchaseorders', PurchaseOrder],
  ['packages', Package],
  ['transports', Transport],
  ['invoices', Invoice],
  ['payments', Payment],
  ['financialevents', FinancialEvent],
  ['journalentries', JournalEntry],
  ['auditlogs', AuditLog],
  ['customers', Customer],
  ['fulfillmentorders', FulfillmentOrder],
  ['incomingsupplies', IncomingSupply],
  ['demandforecasts', DemandForecast],
  ['aiinsights', AIInsight],
  ['wages', Wage],
];

export const preservedCollections = [
  ['users', User],
  ['externalusers', ExternalUser],
  ['warehouses', Warehouse],
];

const isTruthy = (value) => ['1', 'true', 'yes', 'y'].includes(String(value).toLowerCase());

const readArgValue = (args, name) => {
  const equalsPrefix = `${name}=`;
  const equalsMatch = args.find((arg) => arg.startsWith(equalsPrefix));
  if (equalsMatch) return equalsMatch.slice(equalsPrefix.length);

  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
};

export const parseClearDatabaseArgs = (args = []) => ({
  dryRun: !args.includes('--execute'),
  confirmDbName: readArgValue(args, '--confirm-db'),
  allowProtectedDatabase: args.includes('--allow-protected-db'),
});

export const getClearDatabasePlan = async () => {
  const targets = await Promise.all(
    collectionsToClear.map(async ([name, model]) => ({
      name,
      count: await model.countDocuments({}),
    })),
  );

  const preserved = await Promise.all(
    preservedCollections.map(async ([name, model]) => ({
      name,
      count: await model.countDocuments({}),
    })),
  );

  return { targets, preserved };
};

export async function clearDatabase(options = {}) {
  if (!conf.mongoUri) {
    throw new Error('MONGO_URI is required to clear the database.');
  }

  const databaseName = conf.dbName;
  const dryRun = options.dryRun ?? !isTruthy(process.env.CLEAR_DATABASE_EXECUTE);
  const confirmDbName = options.confirmDbName ?? process.env.CLEAR_DATABASE_CONFIRM_DB;
  const allowProtectedDatabase = options.allowProtectedDatabase ?? isTruthy(process.env.CLEAR_DATABASE_ALLOW_PROTECTED);

  if (!allowProtectedDatabase && protectedDatabaseNames.has(String(databaseName).toLowerCase())) {
    throw new Error(`Refusing to clear protected database "${databaseName}".`);
  }

  if (!dryRun && confirmDbName !== databaseName) {
    throw new Error(`Refusing to clear database "${databaseName}" without --confirm-db ${databaseName}.`);
  }

  await mongoose.connect(conf.mongoUri, { dbName: databaseName });

  try {
    const plan = await getClearDatabasePlan();

    if (dryRun) {
      return {
        dryRun: true,
        databaseName,
        ...plan,
        message: 'Dry run only. Re-run with --execute --confirm-db <database-name> to delete target collections.',
      };
    }

    const results = await Promise.all(
      collectionsToClear.map(async ([name, model]) => {
        const result = await model.deleteMany({});
        return {
          name,
          deletedCount: result.deletedCount ?? 0,
        };
      }),
    );

    return {
      dryRun: false,
      databaseName,
      targets: results,
      preserved: plan.preserved,
      message: 'Database cleared except for users, external users, and warehouses.',
    };
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  clearDatabase(parseClearDatabaseArgs(process.argv.slice(2))).then((summary) => {
    console.log(JSON.stringify(summary, null, 2));
  }).catch(err => {
    console.error('Error clearing database:', err);
    process.exit(1);
  });
}
