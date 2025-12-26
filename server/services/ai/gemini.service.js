import { GoogleGenAI } from '@google/genai';
import { conf } from '../../config/config.js';

class GeminiService {
  constructor() {
    const apiKey = conf.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('Missing Gemini API key. Set GEMINI_API_KEY or GOOGLE_API_KEY.');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateContent(prompt) {
    // Ensure model name is properly formatted for Gemini API
    let modelName = conf.aiModel;

    // Convert OpenAI models to Gemini equivalents
    if (modelName.includes('gpt-3.5') || modelName.includes('gpt-4')) {
      console.warn(`Converting OpenAI model '${modelName}' to Gemini model`);
      modelName = 'gemini-2.5-flash';
    }

    // Add 'models/' prefix if not present
    if (!modelName.startsWith('models/')) {
      modelName = `models/${modelName}`;
    }

    console.log(`Using Gemini model: ${modelName}`);

    const result = await this.ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        temperature: conf.aiTemperature,
        maxOutputTokens: conf.aiMaxTokens,
      }
    });
    return result?.text || '';
  }

  async generateDemandForecast(productData, salesHistory, seasonalData = {}) {
    try {
      const system = 'You are an expert inventory management analyst specializing in demand forecasting for retail and warehouse management. Provide data-driven insights and specific recommendations.';
      const prompt = this.buildDemandForecastPrompt(productData, salesHistory, seasonalData);
      const combined = `${system}\n\n${prompt}`;
      const text = await this.generateContent(combined);
      return this.parseForecastResponse(text);
    } catch (error) {
      console.error('Gemini API Error (generateDemandForecast):', error);
      throw new Error('Failed to generate demand forecast');
    }
  }

  async generateStockOptimization(inventoryData, salesData, seasonalFactors) {
    try {
      const system = 'You are an inventory optimization expert. Analyze data and provide specific stock level recommendations, reorder points, and safety stock calculations.';
      const prompt = this.buildStockOptimizationPrompt(inventoryData, salesData, seasonalFactors);
      const combined = `${system}\n\n${prompt}`;
      const text = await this.generateContent(combined);
      return this.parseOptimizationResponse(text);
    } catch (error) {
      console.error('Gemini API Error (generateStockOptimization):', error);
      throw new Error('Failed to generate stock optimization');
    }
  }

  async predictSeasonalDemand(productCategory, historicalData, currentSeason) {
    try {
      const system = 'You are a seasonal demand forecasting specialist. Analyze patterns and predict demand fluctuations based on seasonal trends, holidays, and market factors.';
      const prompt = this.buildSeasonalDemandPrompt(productCategory, historicalData, currentSeason);
      const combined = `${system}\n\n${prompt}`;
      const text = await this.generateContent(combined);
      return this.parseSeasonalResponse(text);
    } catch (error) {
      console.error('Gemini API Error (predictSeasonalDemand):', error);
      throw new Error('Failed to predict seasonal demand');
    }
  }

  async analyzeJSONInventoryData(jsonData, analysisType = 'comprehensive') {
    try {
      const system = 'You are an expert inventory management analyst. Analyze the provided JSON inventory data and provide actionable insights for demand forecasting, stock optimization, and risk assessment. Focus on identifying patterns, trends, and recommendations based on the data structure provided.';
      const prompt = this.buildJSONDataAnalysisPrompt(jsonData, analysisType);
      const combined = `${system}\n\n${prompt}`;
      const text = await this.generateContent(combined);
      return this.parseJSONAnalysisResponse(text);
    } catch (error) {
      console.error('Gemini API Error (analyzeJSONInventoryData):', error);
      throw new Error('Failed to analyze JSON inventory data');
    }
  }

  async analyzeInventoryOptimization(analyticsData) {
    try {
      const system = 'You are an expert inventory management consultant. Analyze inventory data and provide actionable insights.';
      const prompt = `Analyze the following inventory data and provide optimization insights:\n\n${JSON.stringify(analyticsData, null, 2)}\n\nProvide a JSON response with:\n{\n  "summary": "Overall inventory status summary",\n  "criticalItems": [\n    {"productName": "string", "issue": "string", "priority": "high|medium|low"}\n  ],\n  "overallRecommendations": ["recommendation1", "recommendation2"],\n  "costSavingOpportunities": ["opportunity1", "opportunity2"],\n  "riskMitigation": ["risk1", "risk2"]\n}`;
      const combined = `${system}\n\n${prompt}`;
      const text = await this.generateContent(combined);
      try {
        return JSON.parse(text);
      } catch (_) {
        // If not pure JSON, attempt to extract
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        return {
          summary: 'Basic inventory analysis completed',
          criticalItems: [],
          overallRecommendations: ['Review inventory levels', 'Monitor sales trends'],
          costSavingOpportunities: ['Optimize reorder quantities'],
          riskMitigation: ['Maintain safety stock levels']
        };
      }
    } catch (error) {
      console.error('Error analyzing inventory optimization (Gemini):', error);
      return {
        summary: 'Basic inventory analysis completed',
        criticalItems: [],
        overallRecommendations: ['Review inventory levels', 'Monitor sales trends'],
        costSavingOpportunities: ['Optimize reorder quantities'],
        riskMitigation: ['Maintain safety stock levels']
      };
    }
  }

  async getSeasonalInsights({ category, historicalData, currentMonth, currentYear }) {
    try {
      const system = 'You are a retail seasonal analysis expert. Produce concise, structured JSON insights.';
      const prompt = `Analyze seasonal trends for category: ${category}.\n\nHistorical data (monthly):\n${historicalData.map(d => `- ${d.period}: volume=${d.volume}, revenue=${d.revenue}, orders=${d.orders}, events=${Array.isArray(d.events) ? d.events.join(', ') : d.events}`).join('\n')}\n\nCurrent context: month=${currentMonth}, year=${currentYear}.\n\nReturn JSON with keys: seasonalPatterns[], upcomingTrends[], preparationSteps[].`;
      const combined = `${system}\n\n${prompt}`;
      const text = await this.generateContent(combined);
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      return {
        seasonalPatterns: [],
        upcomingTrends: [],
        preparationSteps: []
      };
    } catch (error) {
      console.error('Gemini API Error (getSeasonalInsights):', error);
      return {
        seasonalPatterns: [],
        upcomingTrends: [],
        preparationSteps: []
      };
    }
  }

  // Prompt builders (copied/adapted from OpenAI service)
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

  // Parsers copied from OpenAI service
  parseForecastResponse(response) {
    try {
      // Try to extract JSON from the response
      let jsonStr = response;
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      // Try to parse the JSON
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseError) {
        // If parsing fails, try to clean up common issues
        console.warn('Initial JSON parse failed, attempting cleanup...');
        // Remove trailing commas
        jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
        // Remove single quotes around keys (convert to double quotes)
        jsonStr = jsonStr.replace(/'([^']*)':/g, '"$1":');
        parsed = JSON.parse(jsonStr);
      }

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
    } catch (error) {
      console.error('Failed to parse forecast response:', error);
      console.error('Original response:', response);
      return {
        forecast30Days: { quantity: 0, confidence: 0 },
        forecast90Days: { quantity: 0, confidence: 0 },
        reorderPoint: 0,
        optimalOrderQuantity: 0,
        safetyStock: 0,
        keyFactors: [],
        riskAssessment: 'Failed to parse AI response',
        recommendations: []
      };
    }
  }

  parseOptimizationResponse(response) {
    try {
      let jsonStr = response;
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      try {
        return JSON.parse(jsonStr);
      } catch (parseError) {
        console.warn('Initial JSON parse failed, attempting cleanup...');
        jsonStr = jsonStr.replace(/,([\s\}\]])/g, '$1');
        jsonStr = jsonStr.replace(/'([^']*)'/g, '"$1"');
        return JSON.parse(jsonStr);
      }
    } catch (error) {
      console.error('Failed to parse optimization response:', error);
      return { recommendations: 'Failed to parse AI response' };
    }
  }

  parseSeasonalResponse(response) {
    try {
      let jsonStr = response;
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      try {
        return JSON.parse(jsonStr);
      } catch (parseError) {
        console.warn('Initial JSON parse failed, attempting cleanup...');
        jsonStr = jsonStr.replace(/,([\s\}\]])/g, '$1');
        jsonStr = jsonStr.replace(/'([^']*)'/g, '"$1"');
        return JSON.parse(jsonStr);
      }
    } catch (error) {
      console.error('Failed to parse seasonal response:', error);
      return { analysis: 'Failed to parse AI response' };
    }
  }

  parseJSONAnalysisResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          analysis: parsed,
          rawResponse: response
        };
      }
      return {
        success: false,
        analysis: {
          overallSummary: {
            riskLevel: 'medium',
            mainConcerns: ['Unable to parse detailed analysis']
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
            riskLevel: 'unknown',
            mainConcerns: ['Analysis parsing failed']
          },
          error: error.message
        },
        rawResponse: response
      };
    }
  }
}

export default new GeminiService();
