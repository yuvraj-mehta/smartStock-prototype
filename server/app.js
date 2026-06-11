import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { conf, corsConfig } from './config/config.js';
import healthRouter from './routes/health.route.js';
import salesOrderRouter from './routes/salesOrder.route.js';
import salesInvoiceRouter from './routes/salesInvoice.route.js';
import paymentReceivedRouter from './routes/paymentReceived.route.js';
import salesRouter from './routes/sales.route.js';
import returnRouter from './routes/return.route.js';
import aiRouter from './routes/ai.route.js';
import purchaseOrderRouter from './routes/purchaseOrder.route.js';
import invoiceRouter from './routes/invoice.route.js';
import paymentRouter from './routes/payment.route.js';
import financialReportRouter from './routes/financialReport.route.js';
import { notFound, errorHandler } from './middlewares/index.js';
import userRouter from './routes/user.route.js';
import externalUserRouter from './routes/externalUser.route.js';
import productRouter from './routes/product.route.js';
import inventoryRouter from './routes/inventory.route.js';
import authRouter from './routes/auth.route.js';
import itemRouter from './routes/item.route.js';
import orderRouter from './routes/order.route.js';
import packageRouter from './routes/package.route.js';
import transportRouter from './routes/transport.route.js';
import fulfillmentOrderRouter from './routes/fulfillmentOrder.route.js';
import inventoryAnalyticsRouter from './routes/inventoryAnalytics.route.js';
import { aiRateLimiter, authRateLimiter, globalRateLimiter } from './middlewares/rateLimit.middleware.js';

const app = express();

if (conf.trustProxy !== false) {
  app.set('trust proxy', conf.trustProxy);
}
app.disable('x-powered-by');
app.use(helmet());
app.use(cors(corsConfig));
app.use(globalRateLimiter);
app.use(express.json({ limit: conf.jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: conf.urlEncodedBodyLimit }));
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request body too large',
    });
  }

  return next(err);
});

// Health check endpoint for Render/uptime checks
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'SmartStock API is running' });
});

// Define routes
app.use('/api/v1/auth', authRateLimiter, authRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/external-user', externalUserRouter);
app.use('/api/v1/item', itemRouter);
app.use('/api/v1/order', orderRouter);
app.use('/api/v1/package', packageRouter);
app.use('/api/v1/fulfillment-order', fulfillmentOrderRouter);
app.use('/api/v1/sales', salesRouter);
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/return', returnRouter);
app.use('/api/v1/product', productRouter);
app.use('/api/v1/transport', transportRouter);
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v1/ai', aiRateLimiter, aiRouter);
app.use('/api/v1/inventory-analytics', inventoryAnalyticsRouter);

// Sales/revenue routes
app.use('/api/v1/sales-order', salesOrderRouter);
app.use('/api/v1/sales-invoice', salesInvoiceRouter);
app.use('/api/v1/payment-received', paymentReceivedRouter);

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
