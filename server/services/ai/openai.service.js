import OpenAI from 'openai';
import { catchAsyncErrors } from '../../middlewares/index.js';
import { conf } from '../../config/config.js';

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: conf.openaiApiKey,
    });
  }

  // Generate demand forecast for a specific product
  async generateDemandForecast(productData, salesHistory, seasonalData = {}) {
    try {
      const prompt = this.buildDemandForecastPrompt(productData, salesHistory, seasonalData);
      
      const completion = await this.openai.chat.completions.create({
        model: conf.aiModel,
        messages: [
          {
            role: "system",
            content: "You are an expert inventory management analyst specializing in demand forecasting for retail and warehouse management. Provide data-driven insights and specific recommendations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: conf.aiTemperature,
        max_tokens: conf.aiMaxTokens
      });

      return this.parseForecastResponse(completion.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate demand forecast');
    }
  }

  // Generate optimal stock levels
  async generateStockOptimization(inventoryData, salesData, seasonalFactors) {
    try {
      const prompt = this.buildStockOptimizationPrompt(inventoryData, salesData, seasonalFactors);
      
      const completion = await this.openai.chat.completions.create({
        model: conf.aiModel,
        messages: [
          {
            role: "system",
            content: "You are an inventory optimization expert. Analyze data and provide specific stock level recommendations, reorder points, and safety stock calculations."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: conf.aiTemperature,
        max_tokens: conf.aiMaxTokens
      });

      return this.parseOptimizationResponse(completion.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to generate stock optimization');
    }
  }

  // Predict seasonal demand patterns
  async predictSeasonalDemand(productCategory, historicalData, currentSeason) {
    try {
      const prompt = this.buildSeasonalDemandPrompt(productCategory, historicalData, currentSeason);
      
      const completion = await this.openai.chat.completions.create({
        model: conf.aiModel,
        messages: [
          {
            role: "system",
            content: "You are a seasonal demand forecasting specialist. Analyze patterns and predict demand fluctuations based on seasonal trends, holidays, and market factors."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: conf.aiTemperature,
        max_tokens: conf.aiMaxTokens
      });

      return this.parseSeasonalResponse(completion.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to predict seasonal demand');
    }
  }

  // Analyze inventory data from provided JSON format
  async analyzeJSONInventoryData(jsonData, analysisType = 'comprehensive') {
    try {
      const prompt = this.buildJSONDataAnalysisPrompt(jsonData, analysisType);
      
      const completion = await this.openai.chat.completions.create({
        model: conf.aiModel,
        messages: [
          {
            role: "system",
            content: "You are an expert inventory management analyst. Analyze the provided JSON inventory data and provide actionable insights for demand forecasting, stock optimization, and risk assessment. Focus on identifying patterns, trends, and recommendations based on the data structure provided."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: conf.aiTemperature,
        max_tokens: conf.aiMaxTokens
      });

      return this.parseJSONAnalysisResponse(completion.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error('Failed to analyze JSON inventory data');
    }
  }

  // Build prompts for different analysis types
  buildDemandForecastPrompt(productData, salesHistory, seasonalData) {
    return `
Analyze the following product data and provide a comprehensive demand forecast:

PRODUCT INFORMATION:
- Product Name: ${productData.productName}
- Category: ${productData.productCategory}
- Current Stock: ${productData.quantity}
- Price: $${productData.price}
- SKU: ${productData.sku}

SALES HISTORY (Last ${salesHistory.length} records):
${salesHistory.map(sale => `
- Date: ${sale.saleConfirmationDate}
- Quantity Sold: ${sale.products.reduce((sum, p) => sum + p.quantity, 0)}
- Revenue: $${sale.totalAmount || 'N/A'}
`).join('')}

SEASONAL DATA:
- Current Season: ${seasonalData.currentSeason || 'Unknown'}
- Historical Peak Months: ${seasonalData.peakMonths || 'N/A'}
- Market Trends: ${seasonalData.trends || 'N/A'}

Please provide:
1. 30-day demand forecast with confidence level
2. 90-day demand forecast with confidence level
3. Recommended reorder point
4. Optimal order quantity
5. Safety stock recommendation
6. Key factors affecting demand
7. Risk assessment and mitigation strategies

Format your response as structured JSON with the following structure:
{
  "forecast30Days": { "quantity": number, "confidence": number (0-100) },
  "forecast90Days": { "quantity": number, "confidence": number (0-100) },
  "reorderPoint": number,
  "optimalOrderQuantity": number,
  "safetyStock": number,
  "keyFactors": [string array],
  "riskAssessment": string,
  "recommendations": [string array]
}
    `;
  }

  buildStockOptimizationPrompt(inventoryData, salesData, seasonalFactors) {
    return `
Optimize inventory levels for the following warehouse data:

CURRENT INVENTORY:
${inventoryData.map(item => `
- Product: ${item.productName}
- Current Stock: ${item.currentStock}
- Category: ${item.category}
- Average Daily Sales: ${item.avgDailySales}
- Lead Time: ${item.leadTime} days
`).join('')}

SEASONAL FACTORS:
- Season: ${seasonalFactors.season}
- Demand Multiplier: ${seasonalFactors.demandMultiplier}
- Special Events: ${seasonalFactors.events}

Provide optimization recommendations including:
1. Optimal stock levels for each product
2. Reorder points considering lead times
3. Safety stock calculations
4. Total investment required
5. Space utilization optimization
6. Stockout risk assessment

Format as JSON with detailed recommendations for each product.
    `;
  }

  buildSeasonalDemandPrompt(productCategory, historicalData, currentSeason) {
    return `
Predict seasonal demand patterns for ${productCategory} products:

HISTORICAL DATA:
${historicalData.map(data => `
- Period: ${data.period}
- Sales Volume: ${data.volume}
- Revenue: $${data.revenue}
- Market Events: ${data.events}
`).join('')}

CURRENT CONTEXT:
- Season: ${currentSeason}
- Market Conditions: Analyze current retail trends

Provide:
1. Seasonal demand multipliers for next 12 months
2. Peak and low demand periods
3. Recommended inventory buildup timeline
4. Revenue projections
5. Market risk factors

Format as structured JSON with monthly breakdowns.
    `;
  }

  // Build prompt for JSON data analysis
  buildJSONDataAnalysisPrompt(jsonData, analysisType) {
    const products = jsonData.products || [];
    
    return `
Analyze the following comprehensive inventory data and provide intelligent insights:

INVENTORY DATA SUMMARY:
- Total Products: ${products.length}
- Categories: ${[...new Set(products.map(p => p.category))].join(', ')}

DETAILED PRODUCT ANALYSIS:
${products.map(product => `
Product: ${product.productName}
- SKU: ${product.sku}
- Category: ${product.category}
- Price: $${product.price}
- Current Stock: ${product.inventory?.currentStock || 'N/A'}
- Warehouse: ${product.inventory?.warehouseLocation || 'N/A'}
- Total Sold: ${product.sales?.totalSold || 0}
- Last Sale: ${product.sales?.lastSoldAt || 'Never'}
- Returns: ${product.returns?.length || 0} cases
- Damages: ${product.damages?.length || 0} incidents
- Damage Causes: ${product.damages?.map(d => d.cause).join(', ') || 'None'}
`).join('\n')}

ANALYSIS REQUIREMENTS:
Based on this data, provide comprehensive insights for:

1. DEMAND FORECASTING:
   - Predict future demand for each product
   - Identify high-risk products (zero sales, high damage)
   - Seasonal trends based on category

2. STOCK OPTIMIZATION:
   - Identify overstocked items (high inventory, low sales)
   - Recommend reorder points for active products
   - Suggest stock reduction for slow-moving items

3. RISK ASSESSMENT:
   - Products with high damage rates
   - Products with zero sales
   - Inventory holding costs analysis

4. ACTIONABLE RECOMMENDATIONS:
   - Immediate actions needed
   - Long-term inventory strategy
   - Category-specific insights

Please provide your analysis in the following JSON format:
{
  "overallSummary": {
    "totalValue": "estimated total inventory value",
    "riskLevel": "low/medium/high",
    "mainConcerns": ["array of main issues"]
  },
  "productInsights": [
    {
      "productId": "product ID",
      "productName": "product name",
      "riskLevel": "low/medium/high",
      "demandForecast": {
        "next30Days": "estimated demand",
        "confidence": "percentage",
        "reasoning": "explanation"
      },
      "stockOptimization": {
        "currentStatus": "overstocked/understocked/optimal",
        "recommendedStock": "suggested quantity",
        "reorderPoint": "when to reorder",
        "reasoning": "explanation"
      },
      "riskFactors": ["array of specific risks"],
      "recommendations": ["specific actions"]
    }
  ],
  "categoryAnalysis": {
    "decor": {
      "totalProducts": "count",
      "averagePrice": "price",
      "marketTrend": "description",
      "recommendations": ["category-specific advice"]
    }
  },
  "immediateActions": [
    {
      "priority": "critical/high/medium",
      "action": "description",
      "productIds": ["affected products"],
      "expectedImpact": "description"
    }
  ],
  "kpis": {
    "inventoryTurnover": "analysis",
    "deadStock": "percentage/count",
    "damageRate": "percentage",
    "profitabilityScore": "assessment"
  }
}
    `;
  }

  // Parse AI responses
  parseForecastResponse(response) {
    try {
      // Extract JSON from response if it's wrapped in text
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Convert percentage strings to numbers for confidence levels
        if (parsed.forecast30Days && parsed.forecast30Days.confidence) {
          if (typeof parsed.forecast30Days.confidence === 'string') {
            parsed.forecast30Days.confidence = parseFloat(parsed.forecast30Days.confidence.replace('%', ''));
          }
        }
        
        if (parsed.forecast90Days && parsed.forecast90Days.confidence) {
          if (typeof parsed.forecast90Days.confidence === 'string') {
            parsed.forecast90Days.confidence = parseFloat(parsed.forecast90Days.confidence.replace('%', ''));
          }
        }
        
        return parsed;
      }
      
      // Fallback parsing for non-JSON responses
      return {
        forecast30Days: { quantity: 0, confidence: 0 },
        forecast90Days: { quantity: 0, confidence: 0 },
        reorderPoint: 0,
        optimalOrderQuantity: 0,
        safetyStock: 0,
        keyFactors: [],
        riskAssessment: response,
        recommendations: []
      };
    } catch (error) {
      console.error('Failed to parse forecast response:', error);
      return null;
    }
  }

  parseOptimizationResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { recommendations: response };
    } catch (error) {
      console.error('Failed to parse optimization response:', error);
      return null;
    }
  }

  parseSeasonalResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { analysis: response };
    } catch (error) {
      console.error('Failed to parse seasonal response:', error);
      return null;
    }
  }

  parseJSONAnalysisResponse(response) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          analysis: parsed,
          rawResponse: response
        };
      }
      
      // If no JSON found, return the raw response with basic structure
      return {
        success: false,
        analysis: {
          overallSummary: {
            riskLevel: "medium",
            mainConcerns: ["Unable to parse detailed analysis"]
          },
          rawAnalysis: response
        },
        rawResponse: response
      };
    } catch (error) {
      console.error('Failed to parse JSON analysis response:', error);
      return {
        success: false,
        analysis: {
          overallSummary: {
            riskLevel: "unknown",
            mainConcerns: ["Analysis parsing failed"]
          },
          error: error.message
        },
        rawResponse: response
      };
    }
  }

  // Analyze inventory optimization
  async analyzeInventoryOptimization(analyticsData) {
    try {
      const prompt = `
        Analyze the following inventory data and provide optimization insights:

        ${JSON.stringify(analyticsData, null, 2)}

        Provide a JSON response with:
        {
          "summary": "Overall inventory status summary",
          "criticalItems": [
            {"productName": "string", "issue": "string", "priority": "high|medium|low"}
          ],
          "overallRecommendations": ["recommendation1", "recommendation2"],
          "costSavingOpportunities": ["opportunity1", "opportunity2"],
          "riskMitigation": ["risk1", "risk2"]
        }
      `;

      const completion = await this.openai.chat.completions.create({
        model: conf.aiModel,
        messages: [
          {
            role: "system",
            content: "You are an expert inventory management consultant. Analyze inventory data and provide actionable insights."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: conf.aiTemperature,
        max_tokens: conf.aiMaxTokens
      });

      const response = completion.choices[0].message.content;
      return JSON.parse(response);
    } catch (error) {
      console.error('Error analyzing inventory optimization:', error);
      return {
        summary: 'Basic inventory analysis completed',
        criticalItems: [],
        overallRecommendations: ['Review inventory levels', 'Monitor sales trends'],
        costSavingOpportunities: ['Optimize reorder quantities'],
        riskMitigation: ['Maintain safety stock levels']
      };
    }
  }
}

export default new OpenAIService();
