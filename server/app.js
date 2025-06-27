import express from 'express';
import cors from 'cors';
import { corsConfig } from './config/config.js';
const app = express();
import { notFound, errorHandler } from './middlewares/index.js';
import userRouter from './routes/user.route.js';
import productRouter from './routes/product.route.js';
import inventoryRouter from './routes/inventory.route.js';
import authRouter from './routes/auth.route.js';
import alertRouter from './routes/alert.route.js';
import locationRouter from './routes/location.route.js';
import assistantRouter from './routes/assistant.route.js';
import forecastRouter from './routes/forecast.route.js';
import healthRouter from './routes/health.route.js'

app.use(cors(corsConfig))
app.use(express.json());

// Define routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/alerts', alertRouter);
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/forecast', forecastRouter);
app.use('/api/v1/locations', locationRouter);
app.use('/api/v1/assistant', assistantRouter);
app.use('/api/v1/inventory', inventoryRouter);


// 404 handler for undefined routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;