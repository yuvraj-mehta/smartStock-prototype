import mongoose from 'mongoose';

const demandForecastSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  warehouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true,
  },
  forecastPeriod: {
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    periodType: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly'],
      default: 'monthly',
    },
  },
  aiPrediction: {
    forecastQuantity: {
      type: Number,
      required: true,
    },
    confidenceLevel: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    predictionModel: {
      type: String,
      default: 'gpt-3.5-turbo',
    },
    keyFactors: [{
      factor: String,
      impact: {
        type: String,
        enum: ['high', 'medium', 'low'],
      },
      description: String,
    }],
  },
  historicalData: {
    salesVelocity: {
      avgDailySales: Number,
      trend: {
        type: String,
        enum: ['increasing', 'decreasing', 'stable'],
      },
    },
    seasonalFactor: {
      type: Number,
      default: 1.0,
    },
    marketConditions: {
      demand: {
        type: String,
        enum: ['high', 'medium', 'low'],
      },
      competition: {
        type: String,
        enum: ['high', 'medium', 'low'],
      },
      priceElasticity: Number,
    },
  },
  recommendations: {
    optimalStockLevel: {
      type: Number,
      required: true,
    },
    reorderPoint: {
      type: Number,
      required: true,
    },
    safetyStock: {
      type: Number,
      required: true,
    },
    maxStockLevel: Number,
    orderQuantity: Number,
  },
  riskAssessment: {
    stockoutRisk: {
      type: String,
      enum: ['high', 'medium', 'low'],
      required: true,
    },
    overStockRisk: {
      type: String,
      enum: ['high', 'medium', 'low'],
      required: true,
    },
    expiryRisk: {
      type: String,
      enum: ['high', 'medium', 'low'],
    },
    marketRisk: {
      type: String,
      enum: ['high', 'medium', 'low'],
    },
    mitigation: [String],
  },
  accuracy: {
    actualSales: Number,
    predictionAccuracy: Number, // percentage
    errorRate: Number,
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'outdated', 'archived'],
    default: 'active',
  },
}, { timestamps: true });

// Indexes for better query performance
demandForecastSchema.index({ productId: 1, warehouseId: 1 });
demandForecastSchema.index({ 'forecastPeriod.startDate': 1, 'forecastPeriod.endDate': 1 });
demandForecastSchema.index({ status: 1, createdAt: -1 });

export const DemandForecast = mongoose.model('DemandForecast', demandForecastSchema);
