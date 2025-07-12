import { DemandForecast, AIInsight, Product, SalesHistory } from '../models/index.js';
import OpenAIService from '../services/ai/openai.service.js';
import AnalyticsService from '../services/analytics.service.js';
import { catchAsyncErrors } from '../middlewares/index.js';

// Generate demand forecast for a specific product
export const generateDemandForecast = catchAsyncErrors(async (req, res) => {
  const { productId, periodType = 'monthly', daysBack = 90 } = req.body;
  const warehouseId = req.user.assignedWarehouseId;

  if (!productId) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  try {
    // Get product information
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get sales history and analytics
    const salesHistory = await AnalyticsService.getProductSalesHistory(productId, daysBack);
    const salesVelocity = await AnalyticsService.calculateSalesVelocity(productId);
    const seasonalFactors = await AnalyticsService.calculateSeasonalFactors(product.productCategory);

    // Prepare data for AI analysis
    const productData = {
      productName: product.productName,
      productCategory: product.productCategory,
      sku: product.sku,
      price: product.price,
      quantity: product.quantity
    };

    const seasonalData = {
      currentSeason: getCurrentSeason(),
      peakMonths: seasonalFactors
        .filter(factor => factor.seasonalFactor > 1.2)
        .map(factor => factor.monthName),
      trends: salesVelocity.trend
    };

    // Generate AI forecast
    const aiResponse = await OpenAIService.generateDemandForecast(
      productData,
      salesHistory,
      seasonalData
    );

    if (!aiResponse) {
      return res.status(500).json({ message: 'Failed to generate AI forecast' });
    }

    // Calculate forecast period
    const startDate = new Date();
    const endDate = new Date();
    const periodDays = periodType === 'monthly' ? 30 : periodType === 'weekly' ? 7 : 90;
    endDate.setDate(startDate.getDate() + periodDays);

    // Save forecast to database
    const demandForecast = new DemandForecast({
      productId,
      warehouseId,
      forecastPeriod: {
        startDate,
        endDate,
        periodType
      },
      aiPrediction: {
        forecastQuantity: aiResponse.forecast30Days?.quantity || 0,
        confidenceLevel: aiResponse.forecast30Days?.confidence || 50,
        predictionModel: 'gpt-3.5-turbo',
        keyFactors: aiResponse.keyFactors?.map(factor => ({
          factor,
          impact: 'medium',
          description: factor
        })) || []
      },
      historicalData: {
        salesVelocity: {
          avgDailySales: salesVelocity.avgDailySales,
          trend: salesVelocity.trend
        },
        seasonalFactor: getCurrentSeasonalFactor(seasonalFactors),
        marketConditions: {
          demand: 'medium',
          competition: 'medium'
        }
      },
      recommendations: {
        optimalStockLevel: aiResponse.optimalOrderQuantity || Math.ceil(salesVelocity.avgDailySales * 30),
        reorderPoint: aiResponse.reorderPoint || Math.ceil(salesVelocity.avgDailySales * 7),
        safetyStock: aiResponse.safetyStock || Math.ceil(salesVelocity.avgDailySales * 5),
        orderQuantity: aiResponse.optimalOrderQuantity || 0
      },
      riskAssessment: {
        stockoutRisk: AnalyticsService.calculateStockoutRisk(product.quantity, salesVelocity.avgDailySales),
        overStockRisk: 'low',
        marketRisk: 'medium',
        mitigation: aiResponse.recommendations || []
      },
      generatedBy: req.user._id
    });

    await demandForecast.save();

    // Create AI insight
    const insight = new AIInsight({
      insightType: 'demand_forecast',
      title: `Demand Forecast for ${product.productName}`,
      description: `AI-generated demand forecast shows ${aiResponse.forecast30Days?.quantity || 0} units expected in next ${periodDays} days`,
      severity: aiResponse.forecast30Days?.confidence > 80 ? 'high' : 'medium',
      category: 'inventory',
      scope: 'product',
      targetData: {
        warehouseId,
        productId
      },
      aiAnalysis: {
        model: 'gpt-3.5-turbo',
        response: aiResponse,
        confidence: aiResponse.forecast30Days?.confidence || 50
      },
      actionItems: aiResponse.recommendations?.map(rec => ({
        action: rec,
        priority: 'medium',
        timeline: '1-2 weeks'
      })) || [],
      validity: {
        validUntil: endDate,
        refreshFrequency: 'weekly'
      },
      generatedBy: req.user._id
    });

    await insight.save();

    res.status(201).json({
      success: true,
      message: 'Demand forecast generated successfully',
      data: {
        forecast: demandForecast,
        insight: insight,
        aiResponse
      }
    });

  } catch (error) {
    console.error('Error generating demand forecast:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate demand forecast',
      error: error.message
    });
  }
});

// Generate stock optimization recommendations
export const generateStockOptimization = catchAsyncErrors(async (req, res) => {
  const { warehouseId = req.user.assignedWarehouseId, productIds } = req.body;

  try {
    // Get inventory analytics
    const inventoryData = await AnalyticsService.getInventoryAnalytics(warehouseId);
    
    // Filter by specific products if provided
    const filteredData = productIds 
      ? inventoryData.filter(item => productIds.includes(item.productId.toString()))
      : inventoryData;

    // Get seasonal factors
    const seasonalFactors = {
      season: getCurrentSeason(),
      demandMultiplier: getCurrentSeasonalMultiplier(),
      events: getUpcomingEvents()
    };

    // Prepare data for AI analysis
    const optimizationData = filteredData.map(item => ({
      productName: item.productName,
      currentStock: item.currentStock,
      category: item.productCategory,
      avgDailySales: item.avgDailySales,
      leadTime: 7, // Default lead time
      turnoverRate: item.turnoverRate,
      stockoutRisk: item.stockoutRisk
    }));

    // Generate AI optimization
    const aiResponse = await OpenAIService.generateStockOptimization(
      optimizationData,
      filteredData,
      seasonalFactors
    );

    // Create insights for each product
    const insights = await Promise.all(
      filteredData.map(async (item) => {
        const insight = new AIInsight({
          insightType: 'stock_optimization',
          title: `Stock Optimization for ${item.productName}`,
          description: `Current stock: ${item.currentStock} units. Recommendation: ${item.reorderRecommendation.action}`,
          severity: item.stockoutRisk === 'high' ? 'critical' : item.stockoutRisk === 'medium' ? 'high' : 'medium',
          category: 'inventory',
          scope: 'product',
          targetData: {
            warehouseId,
            productId: item.productId
          },
          aiAnalysis: {
            model: 'gpt-3.5-turbo',
            response: aiResponse,
            confidence: 75
          },
          actionItems: [{
            action: `${item.reorderRecommendation.action}: ${item.reorderRecommendation.reason}`,
            priority: item.reorderRecommendation.urgency,
            estimatedImpact: `Prevent stockout, maintain service level`,
            timeline: item.reorderRecommendation.urgency === 'high' ? 'immediate' : '1-2 weeks'
          }],
          metrics: {
            potentialSavings: item.reorderRecommendation.suggestedQuantity * item.price * 0.1,
            efficiencyGain: 15
          },
          validity: {
            validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            refreshFrequency: 'weekly'
          },
          generatedBy: req.user._id
        });

        return await insight.save();
      })
    );

    res.status(200).json({
      success: true,
      message: 'Stock optimization completed',
      data: {
        optimizationResults: aiResponse,
        inventoryAnalytics: filteredData,
        insights,
        summary: {
          totalProducts: filteredData.length,
          criticalItems: filteredData.filter(item => item.stockoutRisk === 'high').length,
          reorderNeeded: filteredData.filter(item => item.reorderRecommendation.urgency === 'high').length
        }
      }
    });

  } catch (error) {
    console.error('Error generating stock optimization:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate stock optimization',
      error: error.message
    });
  }
});

// Get seasonal demand predictions
export const getSeasonalDemandPrediction = catchAsyncErrors(async (req, res) => {
  const { productCategory, months = 12 } = req.query;
  const warehouseId = req.user.assignedWarehouseId;

  try {
    // Get historical data for the category
    const seasonalFactors = await AnalyticsService.calculateSeasonalFactors(productCategory);
    const historicalData = await AnalyticsService.getSeasonalSalesData(productCategory, 2);

    const categoryData = { 
      category: productCategory, 
      seasonalFactors, 
      historicalData 
    };
    
    if (!categoryData) {
      return res.status(404).json({
        success: false,
        message: 'No historical data found for this category'
      });
    }

    // Get seasonal factors for detailed analysis
    const detailedSeasonalFactors = await AnalyticsService.calculateSeasonalFactors(productCategory);

    // Prepare historical data for AI
    const aiHistoricalData = detailedSeasonalFactors.map(factor => ({
      period: factor.monthName,
      volume: factor.avgQuantity,
      revenue: factor.avgQuantity * 100, // Estimated
      events: factor.month === 12 ? 'Holiday Season' : factor.month === 6 ? 'Summer Sale' : 'Regular'
    }));

    // Generate AI seasonal prediction
    const aiResponse = await OpenAIService.predictSeasonalDemand(
      productCategory,
      aiHistoricalData,
      getCurrentSeason()
    );

    // Create insight
    const insight = new AIInsight({
      insightType: 'seasonal_analysis',
      title: `Seasonal Demand Analysis for ${productCategory}`,
      description: `Seasonal demand pattern analysis for ${productCategory} category`,
      severity: 'medium',
      category: 'market',
      scope: 'category',
      targetData: {
        warehouseId,
        productCategory
      },
      aiAnalysis: {
        model: 'gpt-3.5-turbo',
        response: aiResponse,
        confidence: 70
      },
      validity: {
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months
        refreshFrequency: 'quarterly'
      },
      generatedBy: req.user._id
    });

    await insight.save();

    res.status(200).json({
      success: true,
      message: 'Seasonal demand prediction generated',
      data: {
        prediction: aiResponse,
        seasonalFactors,
        historicalData: categoryData,
        insight
      }
    });

  } catch (error) {
    console.error('Error generating seasonal prediction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate seasonal prediction',
      error: error.message
    });
  }
});

// Get all AI insights for dashboard
export const getAIInsights = catchAsyncErrors(async (req, res) => {
  const { 
    type, 
    severity, 
    status = 'active', 
    limit = 10, 
    page = 1 
  } = req.query;
  
  const warehouseId = req.user.assignedWarehouseId;

  try {
    const filter = {
      status,
      'targetData.warehouseId': warehouseId,
      'validity.validUntil': { $gte: new Date() }
    };

    if (type) filter.insightType = type;
    if (severity) filter.severity = severity;

    const insights = await AIInsight.find(filter)
      .populate('targetData.productId', 'productName sku productCategory')
      .populate('generatedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const totalCount = await AIInsight.countDocuments(filter);

    // Mark insights as viewed
    await AIInsight.updateMany(
      { _id: { $in: insights.map(insight => insight._id) } },
      { 
        $addToSet: { 
          viewedBy: { 
            userId: req.user._id, 
            viewedAt: new Date() 
          } 
        } 
      }
    );

    res.status(200).json({
      success: true,
      data: {
        insights,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasNext: page * limit < totalCount,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching AI insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI insights',
      error: error.message
    });
  }
});

// Update insight feedback
export const updateInsightFeedback = catchAsyncErrors(async (req, res) => {
  const { insightId } = req.params;
  const { rating, comments, implementationStatus } = req.body;

  try {
    const insight = await AIInsight.findById(insightId);
    if (!insight) {
      return res.status(404).json({ message: 'Insight not found' });
    }

    insight.feedback = {
      userRating: rating,
      userComments: comments,
      implementationStatus,
      ...insight.feedback
    };

    await insight.save();

    res.status(200).json({
      success: true,
      message: 'Insight feedback updated',
      data: insight
    });

  } catch (error) {
    console.error('Error updating insight feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update insight feedback',
      error: error.message
    });
  }
});

// Get intelligent inventory insights using AI
export const getIntelligentInventoryInsights = catchAsyncErrors(async (req, res) => {
  const { warehouseId } = req.query;
  const userWarehouseId = req.user.assignedWarehouseId;
  
  // Use user's assigned warehouse if not specified
  const targetWarehouseId = warehouseId || userWarehouseId;

  try {
    // Generate AI-powered insights
    const insights = await AnalyticsService.generateIntelligentInsights(targetWarehouseId);
    
    // Save insights to database
    const aiInsight = new AIInsight({
      insightType: 'stock_optimization',
      title: 'AI Inventory Analysis',
      description: insights.summary,
      severity: insights.criticalItems.length > 0 ? 'high' : 'medium',
      category: 'inventory',
      scope: targetWarehouseId ? 'warehouse' : 'global',
      targetEntity: {
        entityType: 'warehouse',
        entityId: targetWarehouseId
      },
      data: {
        analysis: insights,
        generatedAt: new Date()
      },
      generatedBy: req.user._id,
      status: 'active'
    });

    await aiInsight.save();

    res.status(200).json({
      success: true,
      message: 'Intelligent inventory insights generated successfully',
      data: {
        insightId: aiInsight._id,
        insights,
        recommendations: insights.recommendations,
        criticalItems: insights.criticalItems,
        costSavingOpportunities: insights.costSavingOpportunities
      }
    });
  } catch (error) {
    console.error('Error generating intelligent insights:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate intelligent insights',
      error: error.message
    });
  }
});

// Get AI-powered demand prediction for specific product
export const getAIDemandPrediction = catchAsyncErrors(async (req, res) => {
  const { productId } = req.params;
  const { forecastDays = 30 } = req.query;

  if (!productId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Product ID is required' 
    });
  }

  try {
    const prediction = await AnalyticsService.predictDemandWithAI(productId, parseInt(forecastDays));
    
    // Save as demand forecast
    const demandForecast = new DemandForecast({
      productId,
      warehouseId: req.user.assignedWarehouseId,
      forecastPeriod: {
        startDate: new Date(),
        endDate: new Date(Date.now() + (forecastDays * 24 * 60 * 60 * 1000)),
        periodType: forecastDays <= 7 ? 'daily' : forecastDays <= 30 ? 'weekly' : 'monthly'
      },
      aiPrediction: prediction.aiPrediction,
      recommendations: prediction.recommendations,
      riskAssessment: prediction.riskAssessment,
      generatedBy: req.user._id,
      status: 'active'
    });

    await demandForecast.save();

    res.status(200).json({
      success: true,
      message: 'AI demand prediction generated successfully',
      data: {
        forecastId: demandForecast._id,
        prediction,
        confidence: prediction.aiPrediction.confidenceLevel,
        recommendations: prediction.recommendations
      }
    });
  } catch (error) {
    console.error('Error generating AI demand prediction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate AI demand prediction',
      error: error.message
    });
  }
});

// Get seasonal trends analysis with AI
export const getSeasonalTrendsAnalysis = catchAsyncErrors(async (req, res) => {
  const { productCategory } = req.query;

  if (!productCategory) {
    return res.status(400).json({
      success: false,
      message: 'Product category is required'
    });
  }

  try {
    const seasonalAnalysis = await AnalyticsService.analyzeSeasonalTrends(productCategory);
    
    // Save as AI insight
    const aiInsight = new AIInsight({
      insightType: 'seasonal_analysis',
      title: `Seasonal Analysis - ${productCategory}`,
      description: `AI-powered seasonal trend analysis for ${productCategory} products`,
      severity: 'medium',
      category: 'market',
      scope: 'category',
      targetEntity: {
        entityType: 'category',
        entityId: productCategory
      },
      data: {
        seasonalAnalysis,
        generatedAt: new Date()
      },
      generatedBy: req.user._id,
      status: 'active'
    });

    await aiInsight.save();

    res.status(200).json({
      success: true,
      message: 'Seasonal trends analysis completed',
      data: {
        insightId: aiInsight._id,
        analysis: seasonalAnalysis,
        patterns: seasonalAnalysis.seasonalPatterns,
        upcomingTrends: seasonalAnalysis.upcomingTrends
      }
    });
  } catch (error) {
    console.error('Error analyzing seasonal trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze seasonal trends',
      error: error.message
    });
  }
});

// Get comprehensive inventory dashboard with AI insights
export const getAIInventoryDashboard = catchAsyncErrors(async (req, res) => {
  const { warehouseId } = req.query;
  const userWarehouseId = req.user.assignedWarehouseId;
  const targetWarehouseId = warehouseId || userWarehouseId;

  try {
    // Get multiple AI insights in parallel
    const [
      inventoryInsights,
      recentForecasts,
      criticalAlerts
    ] = await Promise.all([
      AnalyticsService.generateIntelligentInsights(targetWarehouseId),
      DemandForecast.find({ 
        warehouseId: targetWarehouseId,
        status: 'active',
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
      .populate('productId')
      .limit(10)
      .sort({ createdAt: -1 }),
      AIInsight.find({
        'targetEntity.entityId': targetWarehouseId,
        status: 'active',
        severity: { $in: ['critical', 'high'] }
      })
      .limit(5)
      .sort({ createdAt: -1 })
    ]);

    // Calculate summary metrics
    const summaryMetrics = {
      totalRecommendations: inventoryInsights.recommendations.length,
      criticalItems: inventoryInsights.criticalItems.length,
      costSavingOpportunities: inventoryInsights.costSavingOpportunities.length,
      activeForecasts: recentForecasts.length,
      criticalAlerts: criticalAlerts.length
    };

    res.status(200).json({
      success: true,
      message: 'AI inventory dashboard loaded successfully',
      data: {
        summary: summaryMetrics,
        insights: inventoryInsights,
        recentForecasts: recentForecasts.map(forecast => ({
          id: forecast._id,
          productName: forecast.productId.productName,
          forecastQuantity: forecast.aiPrediction.forecastQuantity,
          confidence: forecast.aiPrediction.confidenceLevel,
          createdAt: forecast.createdAt
        })),
        criticalAlerts: criticalAlerts.map(alert => ({
          id: alert._id,
          title: alert.title,
          severity: alert.severity,
          category: alert.category,
          createdAt: alert.createdAt
        })),
        generatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error loading AI inventory dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load AI inventory dashboard',
      error: error.message
    });
  }
});

// Analyze provided JSON inventory data with AI
export const analyzeJSONInventoryData = catchAsyncErrors(async (req, res) => {
  const { inventoryData, analysisType = 'comprehensive' } = req.body;

  if (!inventoryData || !inventoryData.products || !Array.isArray(inventoryData.products)) {
    return res.status(400).json({
      success: false,
      message: 'Valid inventory data with products array is required',
      expectedFormat: {
        products: [
          {
            productId: "string",
            productName: "string",
            sku: "string", 
            category: "string",
            price: "number",
            inventory: {
              currentStock: "number",
              warehouseLocation: "string"
            },
            sales: {
              totalSold: "number",
              lastSoldAt: "date or null"
            },
            returns: "array",
            damages: "array"
          }
        ]
      }
    });
  }

  try {
    console.log(`🤖 Analyzing JSON inventory data for ${inventoryData.products.length} products...`);

    // Import OpenAI service
    const OpenAIService = (await import('../services/ai/openai.service.js')).default;
    
    // Get AI analysis
    const aiAnalysis = await OpenAIService.analyzeJSONInventoryData(inventoryData, analysisType);

    if (!aiAnalysis.success) {
      return res.status(500).json({
        success: false,
        message: 'AI analysis failed',
        error: aiAnalysis.analysis.error || 'Unknown error',
        rawResponse: aiAnalysis.rawResponse
      });
    }

    // Save insights to database for future reference
    const { AIInsight } = await import('../models/index.js');
    
    const insight = new AIInsight({
      type: 'json_inventory_analysis',
      category: 'inventory',
      severity: aiAnalysis.analysis.overallSummary?.riskLevel || 'medium',
      title: `JSON Inventory Analysis - ${inventoryData.products.length} Products`,
      description: `Comprehensive AI analysis of provided inventory data`,
      targetData: {
        productCount: inventoryData.products.length,
        categories: [...new Set(inventoryData.products.map(p => p.category))],
        analysisType
      },
      aiAnalysis: {
        model: 'gpt-3.5-turbo',
        response: aiAnalysis.analysis,
        confidence: 85
      },
      actionItems: aiAnalysis.analysis.immediateActions?.map(action => ({
        action: action.action,
        priority: action.priority,
        estimatedImpact: action.expectedImpact,
        timeline: action.priority === 'critical' ? 'immediate' : '1-2 weeks'
      })) || [],
      validity: {
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        refreshFrequency: 'monthly'
      },
      status: 'active',
      generatedBy: req.user._id
    });

    await insight.save();

    res.status(200).json({
      success: true,
      message: 'JSON inventory data analyzed successfully',
      data: {
        analysisId: insight._id,
        summary: aiAnalysis.analysis.overallSummary,
        productInsights: aiAnalysis.analysis.productInsights,
        categoryAnalysis: aiAnalysis.analysis.categoryAnalysis,
        immediateActions: aiAnalysis.analysis.immediateActions,
        kpis: aiAnalysis.analysis.kpis,
        metadata: {
          productsAnalyzed: inventoryData.products.length,
          analysisType,
          generatedAt: new Date(),
          validUntil: insight.validity.validUntil
        }
      }
    });

  } catch (error) {
    console.error('Error analyzing JSON inventory data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze inventory data',
      error: error.message
    });
  }
});

// Helper functions
function getCurrentSeason() {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'Spring';
  if (month >= 6 && month <= 8) return 'Summer';
  if (month >= 9 && month <= 11) return 'Fall';
  return 'Winter';
}

function getCurrentSeasonalFactor(seasonalFactors) {
  const currentMonth = new Date().getMonth() + 1;
  const currentFactor = seasonalFactors.find(factor => factor.month === currentMonth);
  return currentFactor ? currentFactor.seasonalFactor : 1.0;
}

function getCurrentSeasonalMultiplier() {
  const season = getCurrentSeason();
  const multipliers = { Spring: 1.1, Summer: 1.2, Fall: 1.3, Winter: 1.4 };
  return multipliers[season] || 1.0;
}

function getUpcomingEvents() {
  const month = new Date().getMonth() + 1;
  const events = {
    11: 'Black Friday, Thanksgiving',
    12: 'Holiday Season, Christmas',
    1: 'New Year, Winter Sales',
    2: 'Valentine\'s Day',
    3: 'Spring Cleaning',
    6: 'Summer Sales',
    7: 'Back to School Prep',
    8: 'Back to School'
  };
  return events[month] || 'Regular Season';
}
