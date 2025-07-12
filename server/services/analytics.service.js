import { Inventory, Product, Order, Batch, SalesHistory } from '../models/index.js';
import mongoose from 'mongoose';

class AnalyticsService {
  
  // Get comprehensive sales history for a product
  async getProductSalesHistory(productId, daysBack = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const salesHistory = await SalesHistory.find({
        'products.productId': productId,
        saleConfirmationDate: { $gte: cutoffDate }
      })
      .populate('products.productId')
      .populate('packageId')
      .populate('orderId')
      .sort({ saleConfirmationDate: -1 });

      return salesHistory.map(sale => ({
        saleId: sale._id,
        saleDate: sale.saleConfirmationDate,
        deliveryDate: sale.deliveryDate,
        quantitySold: sale.products
          .filter(p => p.productId._id.toString() === productId)
          .reduce((sum, p) => sum + p.quantity, 0),
        totalProducts: sale.products.length,
        warehouseId: sale.warehouseId,
        dayOfWeek: sale.saleConfirmationDate.getDay(),
        month: sale.saleConfirmationDate.getMonth() + 1,
        quarter: Math.ceil((sale.saleConfirmationDate.getMonth() + 1) / 3)
      }));
    } catch (error) {
      console.error('Error fetching sales history:', error);
      throw error;
    }
  }

  // Calculate sales velocity and trends
  async calculateSalesVelocity(productId, periodDays = 30) {
    try {
      const salesHistory = await this.getProductSalesHistory(productId, periodDays);
      
      const totalQuantity = salesHistory.reduce((sum, sale) => sum + sale.quantitySold, 0);
      const avgDailySales = totalQuantity / periodDays;
      
      // Calculate weekly trends
      const weeklyData = {};
      salesHistory.forEach(sale => {
        const week = Math.floor((Date.now() - sale.saleDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        weeklyData[week] = (weeklyData[week] || 0) + sale.quantitySold;
      });

      // Trend calculation (simple linear regression)
      const weeks = Object.keys(weeklyData).map(Number).sort();
      let trend = 'stable';
      if (weeks.length >= 3) {
        const recentWeeks = weeks.slice(-3);
        const oldAvg = recentWeeks.slice(0, 2).reduce((sum, week) => sum + weeklyData[week], 0) / 2;
        const recentAvg = weeklyData[recentWeeks[2]];
        
        if (recentAvg > oldAvg * 1.2) trend = 'increasing';
        else if (recentAvg < oldAvg * 0.8) trend = 'decreasing';
      }

      return {
        avgDailySales,
        totalSales: totalQuantity,
        salesDays: salesHistory.length,
        trend,
        weeklyData: Object.entries(weeklyData).map(([week, sales]) => ({
          week: parseInt(week),
          sales
        }))
      };
    } catch (error) {
      console.error('Error calculating sales velocity:', error);
      throw error;
    }
  }

  // Get current inventory levels with analytics
  async getInventoryAnalytics(warehouseId = null) {
    try {
      const matchCondition = warehouseId ? { warehouseId } : {};
      
      const inventoryData = await Inventory.aggregate([
        { $match: matchCondition },
        {
          $lookup: {
            from: 'batches',
            localField: 'batchId',
            foreignField: '_id',
            as: 'batch'
          }
        },
        { $unwind: '$batch' },
        {
          $lookup: {
            from: 'products',
            localField: 'batch.productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $group: {
            _id: '$batch.productId',
            productName: { $first: '$product.productName' },
            productCategory: { $first: '$product.productCategory' },
            sku: { $first: '$product.sku' },
            price: { $first: '$product.price' },
            totalQuantity: { $sum: '$quantity' },
            batchCount: { $sum: 1 },
            avgMfgDate: { $avg: '$batch.mfgDate' },
            nearestExpiry: { $min: '$batch.expDate' },
            warehouseIds: { $addToSet: '$warehouseId' }
          }
        },
        {
          $project: {
            productId: '$_id',
            productName: 1,
            productCategory: 1,
            sku: 1,
            price: 1,
            currentStock: '$totalQuantity',
            batchCount: 1,
            avgAge: {
              $divide: [
                { $subtract: [new Date(), '$avgMfgDate'] },
                1000 * 60 * 60 * 24
              ]
            },
            daysUntilExpiry: {
              $divide: [
                { $subtract: ['$nearestExpiry', new Date()] },
                1000 * 60 * 60 * 24
              ]
            },
            warehouseCount: { $size: '$warehouseIds' }
          }
        }
      ]);

      // Add sales velocity data
      const enrichedData = await Promise.all(
        inventoryData.map(async (item) => {
          const velocity = await this.calculateSalesVelocity(item.productId);
          return {
            ...item,
            ...velocity,
            turnoverRate: item.currentStock > 0 ? velocity.avgDailySales / item.currentStock : 0,
            stockoutRisk: this.calculateStockoutRisk(item.currentStock, velocity.avgDailySales),
            reorderRecommendation: this.getReorderRecommendation(item.currentStock, velocity.avgDailySales)
          };
        })
      );

      return enrichedData;
    } catch (error) {
      console.error('Error getting inventory analytics:', error);
      throw error;
    }
  }

  // Calculate seasonal factors
  async calculateSeasonalFactors(productCategory = null) {
    try {
      const matchCondition = productCategory ? { 'products.productId': { $exists: true } } : {};
      
      const seasonalData = await SalesHistory.aggregate([
        { $match: matchCondition },
        { $unwind: '$products' },
        ...(productCategory ? [{
          $lookup: {
            from: 'products',
            localField: 'products.productId',
            foreignField: '_id',
            as: 'productInfo'
          }
        }, {
          $match: { 'productInfo.productCategory': productCategory }
        }] : []),
        {
          $group: {
            _id: {
              month: { $month: '$saleConfirmationDate' },
              year: { $year: '$saleConfirmationDate' }
            },
            totalQuantity: { $sum: '$products.quantity' },
            totalSales: { $sum: 1 },
            avgDailyQuantity: { $avg: '$products.quantity' }
          }
        },
        {
          $group: {
            _id: '$_id.month',
            avgMonthlyQuantity: { $avg: '$totalQuantity' },
            yearlyData: {
              $push: {
                year: '$_id.year',
                quantity: '$totalQuantity'
              }
            }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      const totalAvg = seasonalData.reduce((sum, month) => sum + month.avgMonthlyQuantity, 0) / 12;
      
      return seasonalData.map(month => ({
        month: month._id,
        monthName: new Date(2024, month._id - 1, 1).toLocaleString('default', { month: 'long' }),
        seasonalFactor: month.avgMonthlyQuantity / totalAvg,
        avgQuantity: month.avgMonthlyQuantity,
        yearlyTrend: this.calculateYearlyTrend(month.yearlyData)
      }));
    } catch (error) {
      console.error('Error calculating seasonal factors:', error);
      throw error;
    }
  }

  // AI-powered inventory analysis
  async generateIntelligentInsights(warehouseId = null) {
    try {
      const inventoryData = await this.getInventoryAnalytics(warehouseId);
      
      // Prepare data for AI analysis
      const analyticsData = {
        inventory: inventoryData,
        timestamp: new Date(),
        warehouseId
      };

      // Import OpenAI service here to avoid circular dependencies
      const OpenAIService = (await import('./ai/openai.service.js')).default;
      
      const aiInsights = await OpenAIService.analyzeInventoryOptimization(analyticsData);
      
      return {
        summary: aiInsights.summary || 'AI analysis completed',
        criticalItems: aiInsights.criticalItems || [],
        recommendations: aiInsights.overallRecommendations || [],
        costSavingOpportunities: aiInsights.costSavingOpportunities || [],
        riskMitigation: aiInsights.riskMitigation || [],
        generatedAt: new Date(),
        dataSource: 'AI-Analytics'
      };
    } catch (error) {
      console.error('Error generating intelligent insights:', error);
      throw error;
    }
  }

  // Demand prediction with AI
  async predictDemandWithAI(productId, forecastDays = 30) {
    try {
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const salesHistory = await this.getProductSalesHistory(productId, 90);
      const salesVelocity = await this.calculateSalesVelocity(productId);
      const seasonalFactors = await this.calculateSeasonalFactors(product.productCategory);

      const OpenAIService = (await import('./ai/openai.service.js')).default;
      
      const forecastData = await OpenAIService.generateDemandForecast(
        {
          productId,
          productName: product.productName,
          category: product.productCategory,
          currentStock: product.quantity,
          price: product.price,
          avgDailySales: salesVelocity.avgDailySales,
          salesTrend: salesVelocity.trend,
          recentSales: salesHistory.slice(0, 30),
          seasonalFactor: seasonalFactors.find(f => f.month === new Date().getMonth() + 1)?.seasonalFactor || 1.0,
          demandLevel: this.calculateDemandLevel(salesVelocity.avgDailySales),
          forecastPeriod: `${forecastDays} days`
        }
      );

      return {
        productId,
        productName: product.productName,
        currentStock: product.quantity,
        forecastPeriod: forecastDays,
        aiPrediction: {
          forecastQuantity: forecastData.forecast30Days?.quantity || 0,
          confidenceLevel: forecastData.forecast30Days?.confidence || 0,
          predictionModel: 'gpt-4',
          keyFactors: forecastData.keyFactors || []
        },
        recommendations: {
          optimalStockLevel: forecastData.optimalOrderQuantity || 0,
          reorderPoint: forecastData.reorderPoint || 0,
          safetyStock: forecastData.safetyStock || 0
        },
        riskAssessment: {
          stockoutRisk: this.assessStockoutRisk(product.quantity, salesVelocity.avgDailySales),
          overStockRisk: this.assessOverstockRisk(product.quantity, salesVelocity.avgDailySales),
          mitigation: forecastData.recommendations || []
        },
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error predicting demand with AI:', error);
      throw error;
    }
  }

  // Helper methods for risk assessment
  calculateDemandLevel(avgDailySales) {
    if (avgDailySales > 10) return 'high';
    if (avgDailySales > 3) return 'medium';
    return 'low';
  }

  assessStockoutRisk(currentStock, avgDailySales) {
    const daysOfStock = currentStock / (avgDailySales || 1);
    if (daysOfStock < 7) return 'high';
    if (daysOfStock < 14) return 'medium';
    return 'low';
  }

  assessOverstockRisk(currentStock, avgDailySales) {
    const daysOfStock = currentStock / (avgDailySales || 1);
    if (daysOfStock > 90) return 'high';
    if (daysOfStock > 60) return 'medium';
    return 'low';
  }

  // Helper methods for calculations
  calculateStockoutRisk(currentStock, avgDailySales) {
    if (avgDailySales === 0) return 'low';
    const daysOfStock = currentStock / avgDailySales;
    if (daysOfStock < 7) return 'high';
    if (daysOfStock < 14) return 'medium';
    return 'low';
  }

  getReorderRecommendation(currentStock, avgDailySales) {
    if (avgDailySales === 0) return 'monitor';
    const daysOfStock = currentStock / avgDailySales;
    if (daysOfStock < 7) return 'urgent';
    if (daysOfStock < 14) return 'soon';
    if (daysOfStock > 60) return 'reduce';
    return 'maintain';
  }

  calculateYearlyTrend(yearlyData) {
    if (!yearlyData || yearlyData.length < 2) return 'stable';
    const recent = yearlyData.slice(-2);
    const growth = (recent[1].quantity - recent[0].quantity) / recent[0].quantity;
    if (growth > 0.1) return 'increasing';
    if (growth < -0.1) return 'decreasing';
    return 'stable';
  }

  // Seasonal demand analysis with AI
  async analyzeSeasonalTrends(productCategory) {
    try {
      const historicalData = await this.getSeasonalSalesData(productCategory);
      
      const OpenAIService = (await import('./ai/openai.service.js')).default;
      
      const seasonalInsights = await OpenAIService.getSeasonalInsights({
        category: productCategory,
        historicalData,
        currentMonth: new Date().getMonth() + 1,
        currentYear: new Date().getFullYear()
      });

      return {
        category: productCategory,
        seasonalPatterns: seasonalInsights.seasonalPatterns || [],
        upcomingTrends: seasonalInsights.upcomingTrends || [],
        preparationSteps: seasonalInsights.preparationSteps || [],
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error analyzing seasonal trends:', error);
      throw error;
    }
  }

  // Get seasonal sales data for AI analysis
  async getSeasonalSalesData(productCategory, yearsBack = 2) {
    try {
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - yearsBack);

      const seasonalData = await SalesHistory.aggregate([
        {
          $match: {
            saleConfirmationDate: { $gte: startDate }
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: 'products.productId',
            foreignField: '_id',
            as: 'productDetails'
          }
        },
        {
          $match: {
            'productDetails.productCategory': productCategory
          }
        },
        {
          $group: {
            _id: {
              month: { $month: '$saleConfirmationDate' },
              year: { $year: '$saleConfirmationDate' }
            },
            totalSales: {
              $sum: {
                $reduce: {
                  input: '$products',
                  initialValue: 0,
                  in: { $add: ['$$value', '$$this.quantity'] }
                }
              }
            },
            totalRevenue: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);

      return seasonalData.map(data => ({
        period: `${data._id.year}-${String(data._id.month).padStart(2, '0')}`,
        month: data._id.month,
        year: data._id.year,
        volume: data.totalSales,
        revenue: data.totalRevenue,
        orders: data.orderCount,
        events: this.getMonthlyEvents(data._id.month) // Helper to get seasonal events
      }));
    } catch (error) {
      console.error('Error getting seasonal sales data:', error);
      throw error;
    }
  }

  // Helper to get monthly events/holidays
  getMonthlyEvents(month) {
    const events = {
      1: ['New Year', 'Winter Sales'],
      2: ['Valentine\'s Day'],
      3: ['Spring Arrival'],
      4: ['Easter'],
      5: ['Mother\'s Day'],
      6: ['Father\'s Day', 'Summer Start'],
      7: ['Summer Peak'],
      8: ['Back to School'],
      9: ['Fall Start'],
      10: ['Halloween'],
      11: ['Black Friday', 'Thanksgiving'],
      12: ['Christmas', 'Holiday Season']
    };
    return events[month] || [];
  }
}

export default new AnalyticsService();
