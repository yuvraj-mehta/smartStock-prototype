import express from 'express';
import cors from 'cors';
import { corsConfig } from './config/config.js';
import salesOrderRouter from './routes/salesOrder.route.js';
import salesInvoiceRouter from './routes/salesInvoice.route.js';
import paymentReceivedRouter from './routes/paymentReceived.route.js';
import { notFound, errorHandler } from './middlewares/index.js';
import userRouter from './routes/user.route.js';
import productRouter from './routes/product.route.js';
import inventoryRouter from './routes/inventory.route.js';
import authRouter from './routes/auth.route.js';
import itemRouter from './routes/item.route.js';
import orderRouter from './routes/order.route.js';
import packageRouter from './routes/package.route.js';
import transportRouter from './routes/transport.route.js';

const app = express();

// Sales/revenue routes
app.use('/api/v1/sales-order', salesOrderRouter);
app.use('/api/v1/sales-invoice', salesInvoiceRouter);
app.use('/api/v1/payment-received', paymentReceivedRouter);
import healthRouter from './routes/health.route.js';
import salesRouter from './routes/sales.route.js';
import returnRouter from './routes/return.route.js';
import purchaseOrderRouter from './routes/purchaseOrder.route.js';
import invoiceRouter from './routes/invoice.route.js';
import paymentRouter from './routes/payment.route.js';
import financialReportRouter from './routes/financialReport.route.js';

app.use(cors(corsConfig));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/item', itemRouter);
app.use('/api/v1/order', orderRouter);
app.use('/api/v1/package', packageRouter);
app.use('/api/v1/sales', salesRouter);
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/return', returnRouter);
app.use('/api/v1/product', productRouter);
app.use('/api/v1/transport', transportRouter);
app.use('/api/v1/inventory', inventoryRouter);

// Financial tracking routes
app.use('/api/v1/purchase-order', purchaseOrderRouter);
app.use('/api/v1/invoice', invoiceRouter);
app.use('/api/v1/payment', paymentRouter);

// Financial reporting route
app.use('/api/v1/financial-report', financialReportRouter);

// 404 handler for undefined routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;