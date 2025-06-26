import express from 'express';
import cors from 'cors';
import { corsConfig } from './config/config.js';
const app = express();
import { notFound, errorHandler } from './middlewares/index.js';
import user from './routes/user.route.js';
import product from './routes/product.route.js';
import inventory from './routes/inventory.route.js';
import auth from './routes/auth.route.js';
import alert from './routes/alert.route.js';
import location from './routes/location.route.js';
import assistant from './routes/assistant.route.js';
import forecast from './routes/forecast.route.js';

app.use(cors(corsConfig))
app.use(express.json());

// Define routes
app.use('/api/v1/users', user);
app.use('/api/v1/products', product);
app.use('/api/v1/inventory', inventory);
app.use('/api/v1/auth', auth);
app.use('/api/v1/alerts', alert);
app.use('/api/v1/locations', location);
app.use('/api/v1/assistant', assistant);
app.use('/api/v1/forecast', forecast);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
    }
  });
});


// 404 handler for undefined routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;