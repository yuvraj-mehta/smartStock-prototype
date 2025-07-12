import mongoose from 'mongoose';

const aiInsightSchema = new mongoose.Schema({
  insightType: {
    type: String,
    enum: ['demand_forecast', 'stock_optimization', 'seasonal_analysis', 'risk_assessment', 'market_trend'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  severity: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low', 'info'],
    default: 'medium',
  },
  category: {
    type: String,
    enum: ['inventory', 'sales', 'finance', 'operations', 'market'],
    required: true,
  },
  scope: {
    type: String,
    enum: ['global', 'warehouse', 'product', 'category'],
    required: true,
  },
  targetData: {
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
    },
    productCategory: String,
  },
  aiAnalysis: {
    model: {
      type: String,
      default: 'gpt-3.5-turbo',
    },
    prompt: String,
    response: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    processingTime: Number, // milliseconds
  },
  dataSource: {
    salesHistory: {
      recordCount: Number,
      dateRange: {
        start: Date,
        end: Date,
      },
    },
    inventorySnapshot: {
      recordCount: Number,
      snapshotDate: Date,
    },
    externalFactors: [String],
  },
  actionItems: [{
    action: {
      type: String,
      required: true,
    },
    priority: {
      type: String,
      enum: ['urgent', 'high', 'medium', 'low'],
      default: 'medium',
    },
    estimatedImpact: String,
    timeline: String,
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'dismissed'],
      default: 'pending',
    },
    dueDate: Date,
  }],
  metrics: {
    potentialSavings: Number,
    revenueImpact: Number,
    costReduction: Number,
    efficiencyGain: Number, // percentage
    riskReduction: Number, // percentage
  },
  validity: {
    validUntil: {
      type: Date,
      required: true,
    },
    refreshFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly'],
      default: 'weekly',
    },
    autoRefresh: {
      type: Boolean,
      default: true,
    },
  },
  feedback: {
    userRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    userComments: String,
    implementationStatus: {
      type: String,
      enum: ['not_implemented', 'partially_implemented', 'fully_implemented'],
      default: 'not_implemented',
    },
    actualOutcome: String,
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  viewedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    viewedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  status: {
    type: String,
    enum: ['active', 'archived', 'dismissed', 'expired'],
    default: 'active',
  },
}, { timestamps: true });

// Indexes for performance
aiInsightSchema.index({ insightType: 1, status: 1 });
aiInsightSchema.index({ 'targetData.warehouseId': 1, createdAt: -1 });
aiInsightSchema.index({ 'targetData.productId': 1, severity: 1 });
aiInsightSchema.index({ category: 1, 'validity.validUntil': 1 });
aiInsightSchema.index({ 'actionItems.status': 1, 'actionItems.priority': 1 });

export const AIInsight = mongoose.model('AIInsight', aiInsightSchema);
