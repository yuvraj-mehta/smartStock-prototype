// Script to clear all collections except users and external users
import mongoose from 'mongoose';
import { Item, Inventory, Batch, Order, SalesHistory, Return, SalesOrder, SalesInvoice, PaymentReceived, Product, PurchaseOrder, Package, Payment, PredictionData, AuditLog, Customer, FulfillmentOrder, IncomingSupply, Wage, Warehouse } from './models/index.js';
import { User } from './models/user.model.js';
import { ExternalUser } from './models/externalUsers.model.js';
import config from './config/config.js';

async function clearDatabase() {
  await mongoose.connect(config.mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });
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
    PredictionData.deleteMany({}),
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

clearDatabase().catch(err => {
  console.error('Error clearing database:', err);
  process.exit(1);
});
