// AI-Powered Inventory Management System Test
// This file demonstrates how to use the ChatGPT integration for inventory management

const API_BASE_URL = 'https://smartstock-prototype.onrender.com/api/v1';
let authToken = '';

// Sample login function to get authentication token
async function login() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@smartstock.com', // Updated to match created admin
        password: 'admin123'
      })
    });

    if (response.ok) {
      const data = await response.json();
      authToken = data.token;
      console.log('✅ Login successful');
      return true;
    } else {
      console.error('❌ Login failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return false;
  }
}

// Test AI Demand Forecasting
async function testDemandForecast(productId) {
  console.log('\n🔮 Testing AI Demand Forecasting...');

  try {
    const response = await fetch(`${API_BASE_URL}/ai/forecast/${productId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        forecastDays: 30
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Demand forecast generated successfully');
      console.log('📊 Forecast Data:', {
        totalDemand: data.data.forecast?.forecast?.totalDemand,
        dailyAverage: data.data.forecast?.forecast?.dailyAverage,
        reorderQuantity: data.data.forecast?.recommendations?.reorderQuantity,
        confidenceLevel: data.data.forecast?.recommendations?.confidenceLevel
      });

      return data.data;
    } else {
      const error = await response.json();
      console.error('❌ Forecast failed:', error.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Forecast error:', error.message);
    return null;
  }
}

// Test Stock Optimization
async function testStockOptimization() {
  console.log('\n📈 Testing AI Stock Optimization...');

  try {
    const response = await fetch(`${API_BASE_URL}/ai/optimization`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Stock optimization completed');
      console.log('📋 Summary:', {
        overallHealth: data.data.optimization?.overallHealth,
        totalValue: data.data.optimization?.totalValue,
        recommendationsCount: data.data.optimization?.recommendations?.length || 0
      });

      if (data.data.optimization?.insights) {
        console.log('💡 Generated Insights:');
        const insights = data.data.optimization.insights;
        if (insights.slowMoving?.length > 0) {
          console.log(`   - Slow moving items: ${insights.slowMoving.length}`);
        }
        if (insights.fastMoving?.length > 0) {
          console.log(`   - Fast moving items: ${insights.fastMoving.length}`);
        }
      }

      return data.data;
    } else {
      const error = await response.json();
      console.error('❌ Optimization failed:', error.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Optimization error:', error.message);
    return null;
  }
}

// Test Intelligent Inventory Insights (Reorder Suggestions)
async function testIntelligentInsights() {
  console.log('\n🧠 Testing Intelligent Reorder Suggestions...');

  try {
    const response = await fetch(`${API_BASE_URL}/ai/reorder-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Reorder suggestions generated');
      console.log('📊 Suggestions Summary:', {
        totalSuggestions: data.data.suggestions?.reorderSuggestions?.length || 0,
        totalCost: data.data.suggestions?.summary?.estimatedTotalCost || 0,
        criticalItems: data.data.suggestions?.summary?.criticalItems || 0
      });

      if (data.data.suggestions?.reorderSuggestions?.length > 0) {
        console.log('� Reorder Suggestions:');
        data.data.suggestions.reorderSuggestions.slice(0, 3).forEach((suggestion, index) => {
          console.log(`   ${index + 1}. ${suggestion.productName} - ${suggestion.urgency} (Qty: ${suggestion.recommendedQuantity})`);
        });
      }

      return data.data;
    } else {
      const error = await response.json();
      console.error('❌ Reorder suggestions failed:', error.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Reorder suggestions error:', error.message);
    return null;
  }
}

// Test Sales Trend Analysis
async function testSeasonalAnalysis(days = 30) {
  console.log(`\n🌟 Testing Sales Trend Analysis for ${days} days...`);

  try {
    const response = await fetch(`${API_BASE_URL}/ai/sales-trends?days=${days}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Sales trend analysis completed');
      console.log('📅 Analysis Data:', {
        overallTrend: data.data.analysis?.trends?.overall,
        growthRate: data.data.analysis?.trends?.growthRate,
        topProductsCount: data.data.analysis?.topProducts?.length || 0
      });

      if (data.data.analysis?.insights?.length > 0) {
        console.log('💡 Key Insights:');
        data.data.analysis.insights.slice(0, 3).forEach((insight, index) => {
          console.log(`   ${index + 1}. ${insight}`);
        });
      }

      return data.data;
    } else {
      const error = await response.json();
      console.error('❌ Sales trend analysis failed:', error.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Sales trend analysis error:', error.message);
    return null;
  }
}

// Test AI Dashboard
async function testAIDashboard() {
  console.log('\n📱 Testing AI Dashboard...');

  try {
    const response = await fetch(`${API_BASE_URL}/ai/dashboard`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ AI Dashboard loaded successfully');
      console.log('📊 Dashboard Summary:', data.data.summary);

      console.log('📈 Recent Forecasts:', data.data.recentForecasts.length);
      console.log('🚨 Critical Alerts:', data.data.criticalAlerts.length);

      return data.data;
    } else {
      const error = await response.json();
      console.error('❌ Dashboard failed:', error.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Dashboard error:', error.message);
    return null;
  }
}

// Test Product-specific AI Prediction
async function testProductAIPrediction(productId, forecastDays = 30) {
  console.log(`\n🎯 Testing AI Prediction for specific product (${forecastDays} days)...`);

  try {
    const response = await fetch(`${API_BASE_URL}/ai/forecast/${productId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Product AI prediction retrieved');
      console.log('🔮 Prediction:', {
        totalDemand: data.data?.forecastData?.totalDemand,
        dailyAverage: data.data?.forecastData?.dailyAverage,
        confidenceLevel: data.data?.recommendations?.confidenceLevel,
        reorderQuantity: data.data?.recommendations?.reorderQuantity
      });

      return data.data;
    } else {
      const error = await response.json();
      console.error('❌ Product prediction failed:', error.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Product prediction error:', error.message);
    return null;
  }
}

// Get Available Products for Testing
async function getProducts() {
  try {
    const response = await fetch(`${API_BASE_URL}/product`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.data || [];
    }
    return [];
  } catch (error) {
    console.error('❌ Error fetching products:', error.message);
    return [];
  }
}

// Main test function
async function runAITests() {
  console.log('🚀 Starting AI-Powered Inventory Management Tests');
  console.log('================================================');

  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  // Step 2: Get products for testing
  console.log('\n📦 Fetching available products...');
  const products = await getProducts();

  if (products.length === 0) {
    console.log('⚠️  No products found. Please add products to test AI features.');
    return;
  }

  console.log(`✅ Found ${products.length} products`);
  const testProductId = products[0]._id; // Use first product for testing
  console.log(`🎯 Using product: ${products[0].name} (${products[0]._id})`);

  // Step 3: Test all AI features
  await testAIDashboard();
  await testDemandForecast(testProductId);
  await testProductAIPrediction(testProductId, 30);
  await testStockOptimization();
  await testIntelligentInsights();
  await testSeasonalAnalysis(30);

  console.log('\n🎉 All AI tests completed!');
  console.log('================================================');
  console.log('💡 Tips for optimal AI performance:');
  console.log('   1. Ensure you have historical sales data');
  console.log('   2. Set your OpenAI API key in environment variables');
  console.log('   3. Products with more sales history get better predictions');
  console.log('   4. Check AI insights regularly for inventory optimization');
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  runAITests().catch(console.error);
} else {
  // Browser environment
  console.log('AI Test functions loaded. Call runAITests() to start testing.');
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAITests,
    testDemandForecast,
    testStockOptimization,
    testIntelligentInsights,
    testSeasonalAnalysis,
    testAIDashboard,
    testProductAIPrediction,
    login
  };
}