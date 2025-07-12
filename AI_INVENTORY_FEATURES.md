# AI-Powered Inventory Management Features

## Overview

This system integrates ChatGPT (OpenAI GPT-3.5-Turbo) to provide intelligent inventory management capabilities including demand forecasting, stock optimization, and seasonal analysis.

## Features

### 1. **Demand Forecasting**
- AI-powered demand predictions for individual products
- 30, 60, and 90-day forecasts with confidence levels
- Historical sales data analysis
- Seasonal trend consideration

### 2. **Stock Optimization**
- Intelligent reorder point calculations
- Safety stock recommendations
- Optimal order quantity suggestions
- Stockout risk assessment

### 3. **Seasonal Analysis**
- Category-wise seasonal pattern identification
- Peak season predictions
- Inventory buildup recommendations
- Holiday and event impact analysis

### 4. **Intelligent Insights**
- AI-generated recommendations
- Critical item identification
- Cost-saving opportunities
- Risk mitigation strategies

## API Endpoints

### Authentication Required
All AI endpoints require authentication. Include JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### 1. Generate Demand Forecast
```http
POST /api/v1/ai/forecast/demand
Content-Type: application/json

{
  "productId": "product_id_here",
  "periodType": "monthly",
  "daysBack": 90
}
```

### 2. Stock Optimization
```http
POST /api/v1/ai/optimize/stock
Content-Type: application/json

{
  "warehouseId": "warehouse_id_here",
  "productIds": ["product1", "product2"]
}
```

### 3. AI Demand Prediction (Single Product)
```http
GET /api/v1/ai/predict/demand/{productId}?forecastDays=30
```

### 4. Intelligent Inventory Insights
```http
GET /api/v1/ai/insights/intelligent?warehouseId=warehouse_id
```

### 5. Seasonal Trends Analysis
```http
GET /api/v1/ai/analysis/seasonal?productCategory=electronics
```

### 6. AI Dashboard
```http
GET /api/v1/ai/dashboard?warehouseId=warehouse_id
```

### 7. Get AI Insights
```http
GET /api/v1/ai/insights?type=demand_forecast&severity=high&limit=10&page=1
```

### 8. Update Insight Feedback
```http
PATCH /api/v1/ai/insights/{insightId}/feedback
Content-Type: application/json

{
  "rating": 4,
  "comments": "Very helpful recommendation",
  "implementationStatus": "fully_implemented"
}
```

### 9. Analyze JSON Inventory Data (NEW!)
```http
POST /api/v1/ai/analyze/json-data
Content-Type: application/json

{
  "inventoryData": {
    "products": [
      {
        "productId": "string",
        "productName": "string", 
        "sku": "string",
        "category": "string",
        "price": number,
        "inventory": {
          "currentStock": number,
          "warehouseLocation": "string"
        },
        "sales": {
          "totalSold": number,
          "lastSoldAt": "date or null"
        },
        "returns": [
          {
            "returnId": "string",
            "reason": "string",
            "quantity": number,
            "returnDate": "string"
          }
        ],
        "damages": [
          {
            "cause": "string"
          }
        ]
      }
    ]
  },
  "analysisType": "comprehensive" // or "demand_focus", "risk_focus", "optimization_focus"
}
```

**Response:**
```json
{
  "success": true,
  "message": "JSON inventory data analyzed successfully",
  "data": {
    "analysisId": "analysis_id",
    "summary": {
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
      "category_name": {
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
    },
    "metadata": {
      "productsAnalyzed": "count",
      "analysisType": "type",
      "generatedAt": "timestamp",
      "validUntil": "expiry_date"
    }
  }
}
```

## Configuration

### Environment Variables
Add these to your `.env` file:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
AI_MODEL=gpt-3.5-turbo
AI_TEMPERATURE=0.3
AI_MAX_TOKENS=2000
```

### Getting OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Navigate to API Keys
4. Create a new secret key
5. Copy the key and add it to your `.env` file

## Data Models

### Demand Forecast
```javascript
{
  productId: ObjectId,
  warehouseId: ObjectId,
  forecastPeriod: {
    startDate: Date,
    endDate: Date,
    periodType: String
  },
  aiPrediction: {
    forecastQuantity: Number,
    confidenceLevel: Number,
    predictionModel: String,
    keyFactors: [Object]
  },
  recommendations: {
    optimalStockLevel: Number,
    reorderPoint: Number,
    safetyStock: Number
  },
  riskAssessment: {
    stockoutRisk: String,
    overStockRisk: String,
    mitigation: [String]
  }
}
```

### AI Insight
```javascript
{
  insightType: String,
  title: String,
  description: String,
  severity: String,
  category: String,
  scope: String,
  targetData: Object,
  aiAnalysis: {
    model: String,
    response: Object,
    confidence: Number
  },
  actionItems: [Object],
  generatedBy: ObjectId
}
```

## Usage Examples

### 1. Generate Weekly Demand Forecast
```javascript
const response = await fetch('/api/v1/ai/forecast/demand', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    productId: '60f5d2b8e8b8d0001f5e4321',
    periodType: 'weekly',
    daysBack: 60
  })
});

const forecast = await response.json();
console.log('Forecast:', forecast.data.aiResponse);
```

### 2. Get Intelligent Insights
```javascript
const insights = await fetch('/api/v1/ai/insights/intelligent', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

const data = await insights.json();
console.log('Critical Items:', data.data.criticalItems);
console.log('Recommendations:', data.data.recommendations);
```

### 3. Analyze Seasonal Trends
```javascript
const seasonal = await fetch('/api/v1/ai/analysis/seasonal?productCategory=electronics', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});

const analysis = await seasonal.json();
console.log('Seasonal Patterns:', analysis.data.patterns);
```

### 4. Analyze JSON Inventory Data
```javascript
const jsonDataResponse = await fetch('/api/v1/ai/analyze/json-data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    inventoryData: {
      products: [
        {
          productId: "123",
          productName: "Sample Product",
          sku: "SP-001",
          category: "Electronics",
          price: 299.99,
          inventory: {
            currentStock: 50,
            warehouseLocation: "Aisle 3, Shelf B"
          },
          sales: {
            totalSold: 150,
            lastSoldAt: "2023-10-01"
          },
          returns: [
            {
              returnId: "rtn-001",
              reason: "Defective",
              quantity: 1,
              returnDate: "2023-09-28"
            }
          ],
          damages: [
            {
              cause: "Water Damage"
            }
          ]
        }
      ]
    },
    analysisType: "comprehensive"
  })
});

const jsonDataAnalysis = await jsonDataResponse.json();
console.log('JSON Data Analysis:', jsonDataAnalysis.data);
```

## AI Prompts and Analysis

The system uses sophisticated prompts to analyze:

1. **Historical Sales Data**: Pattern recognition in sales velocity and trends
2. **Seasonal Factors**: Holiday impacts, weather patterns, market cycles
3. **Market Conditions**: Competition, pricing, demand elasticity
4. **Risk Assessment**: Stockout probability, overstock risks, expiry concerns
5. **Cost Optimization**: Holding costs, ordering costs, space utilization

## Benefits

1. **Reduced Stockouts**: Predictive analytics prevent inventory shortages
2. **Lower Holding Costs**: Optimal stock levels reduce excess inventory
3. **Improved Cash Flow**: Better inventory turnover and capital utilization
4. **Enhanced Customer Service**: Consistent product availability
5. **Data-Driven Decisions**: AI insights replace gut-feeling decisions
6. **Seasonal Preparedness**: Advanced planning for demand fluctuations

## Error Handling

The system includes comprehensive error handling:

- **OpenAI API Errors**: Fallback responses and retry mechanisms
- **Data Validation**: Input sanitization and validation
- **Rate Limiting**: Prevents API quota exhaustion
- **Graceful Degradation**: System continues without AI if service unavailable

## Performance Considerations

- **Caching**: AI responses cached to reduce API calls
- **Batch Processing**: Multiple predictions processed efficiently
- **Background Jobs**: Long-running analyses handled asynchronously
- **Rate Limiting**: Respects OpenAI API limits

## Security

- **API Key Protection**: Environment variable storage
- **User Authentication**: JWT-based access control
- **Data Privacy**: No sensitive data sent to OpenAI
- **Audit Logging**: All AI interactions logged for compliance

## Future Enhancements

1. **Multi-language Support**: Localized AI insights
2. **Custom Models**: Fine-tuned models for specific industries
3. **Real-time Alerts**: Instant notifications for critical insights
4. **Integration with ERP**: Seamless data flow with existing systems
5. **Mobile Dashboard**: On-the-go AI insights access
