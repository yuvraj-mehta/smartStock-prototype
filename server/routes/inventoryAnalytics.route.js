import express from 'express';
import { getAllProductsPredictionData } from '../controllers/inventoryAnalytics.controller.js';

const router = express.Router();

// GET /api/v1/inventory-analytics/all-products-prediction-data
router.get('/all-products-prediction-data', getAllProductsPredictionData);

export default router;
