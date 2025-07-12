import express from 'express';
import {
  generateDemandForecast,
  generateStockOptimization,
  getSeasonalDemandPrediction,
  getAIInsights,
  updateInsightFeedback,
  getIntelligentInventoryInsights,
  getAIDemandPrediction,
  getSeasonalTrendsAnalysis,
  getAIInventoryDashboard,
  analyzeJSONInventoryData
} from '../controllers/ai.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { body, query, param } from 'express-validator';
import handleValidationErrors from '../middlewares/validationErrors.middleware.js';

const router = express.Router();

// Demand forecast routes
router.post('/forecast/demand',
  isAuthenticated,
  [
    body('productId').isMongoId().withMessage('Valid product ID is required'),
    body('periodType').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly']).withMessage('Invalid period type'),
    body('daysBack').optional().isInt({ min: 7, max: 365 }).withMessage('Days back must be between 7 and 365')
  ],
  handleValidationErrors,
  generateDemandForecast
);

// Stock optimization routes
router.post('/optimize/stock',
  isAuthenticated,
  [
    body('warehouseId').optional().isMongoId().withMessage('Valid warehouse ID required'),
    body('productIds').optional().isArray().withMessage('Product IDs must be an array'),
    body('productIds.*').optional().isMongoId().withMessage('Each product ID must be valid')
  ],
   handleValidationErrors,
  generateStockOptimization
);

// Seasonal demand prediction
router.get('/predict/seasonal',
  isAuthenticated,
  [
    query('productCategory').optional().isIn(['electronics', 'apparel', 'decor', 'furniture']).withMessage('Invalid product category'),
    query('months').optional().isInt({ min: 1, max: 24 }).withMessage('Months must be between 1 and 24')
  ],
   handleValidationErrors,
  getSeasonalDemandPrediction
);

// Intelligent inventory insights with AI
router.get('/insights/intelligent',
  isAuthenticated,
  [
    query('warehouseId').optional().isMongoId().withMessage('Valid warehouse ID required')
  ],
   handleValidationErrors,
  getIntelligentInventoryInsights
);

// AI-powered demand prediction for specific product
router.get('/predict/demand/:productId',
  isAuthenticated,
  [
    param('productId').isMongoId().withMessage('Valid product ID is required'),
    query('forecastDays').optional().isInt({ min: 7, max: 365 }).withMessage('Forecast days must be between 7 and 365')
  ],
   handleValidationErrors,
  getAIDemandPrediction
);

// Seasonal trends analysis with AI
router.get('/analysis/seasonal',
  isAuthenticated,
  [
    query('productCategory').isString().withMessage('Product category is required')
  ],
   handleValidationErrors,
  getSeasonalTrendsAnalysis
);

// AI inventory dashboard
router.get('/dashboard',
  isAuthenticated,
  [
    query('warehouseId').optional().isMongoId().withMessage('Valid warehouse ID required')
  ],
   handleValidationErrors,
  getAIInventoryDashboard
);

// AI insights routes
router.get('/insights',
  isAuthenticated,
  [
    query('type').optional().isIn(['demand_forecast', 'stock_optimization', 'seasonal_analysis', 'risk_assessment', 'market_trend']).withMessage('Invalid insight type'),
    query('severity').optional().isIn(['critical', 'high', 'medium', 'low', 'info']).withMessage('Invalid severity level'),
    query('status').optional().isIn(['active', 'archived', 'dismissed', 'expired']).withMessage('Invalid status'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1')
  ],
   handleValidationErrors,
  getAIInsights
);

// Update insight feedback
router.patch('/insights/:insightId/feedback',
  isAuthenticated,
  [
    param('insightId').isMongoId().withMessage('Valid insight ID is required'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comments').optional().isString().withMessage('Comments must be a string'),
    body('implementationStatus').optional().isIn(['not_implemented', 'partially_implemented', 'fully_implemented']).withMessage('Invalid implementation status')
  ],
   handleValidationErrors,
  updateInsightFeedback
);

// JSON Data Analysis route
router.post('/analyze/json-data',
  isAuthenticated,
  [
    body('inventoryData').isObject().withMessage('Inventory data object is required'),
    body('inventoryData.products').isArray().withMessage('Products array is required'),
    body('analysisType').optional().isIn(['comprehensive', 'demand_focus', 'risk_focus', 'optimization_focus']).withMessage('Invalid analysis type')
  ],
  handleValidationErrors,
  analyzeJSONInventoryData
);

export default router;
