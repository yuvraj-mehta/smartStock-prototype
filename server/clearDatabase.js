// Script to clear all collections except users and external users
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { Item, Inventory, Batch, Order, SalesHistory, Return, SalesOrder, SalesInvoice, PaymentReceived, Product, PurchaseOrder, Package, Payment, AuditLog, Customer, FulfillmentOrder, IncomingSupply, Wage, Warehouse } from './models/index.js';
import { User } from './models/user.model.js';
import { ExternalUser } from './models/externalUsers.model.js';
import { conf } from './config/config.js';

export async function clearDatabase() {
  if (!conf.mongoUri) {
    throw new Error('MONGO_URI is required to clear the database.');
  }

  await mongoose.connect(conf.mongoUri, { dbName: conf.dbName });
  const promises = [
    Item.deleteMany({}),
    Inventory.deleteMany({}),
    Batch.deleteMany({}),
    Order.deleteMany({}),
    SalesHistory.deleteMany({}),
    Return.deleteMany({}),
    SalesOrder.deleteMany({}),
    SalesInvoice.deleteMany({}),
    PaymentReceived.deleteMany({}),
    Product.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    Package.deleteMany({}),
    Payment.deleteMany({}),
    AuditLog.deleteMany({}),
    Customer.deleteMany({}),
    FulfillmentOrder.deleteMany({}),
    IncomingSupply.deleteMany({}),
    Wage.deleteMany({}),
    Warehouse.deleteMany({})
    // Do NOT delete users or external users
  ];
  await Promise.all(promises);
  console.log('Database cleared except for users and external users.');
  await mongoose.disconnect();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  clearDatabase().catch(err => {
    console.error('Error clearing database:', err);
    process.exit(1);
  });
}
