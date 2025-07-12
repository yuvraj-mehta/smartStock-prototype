// Test JSON Inventory Data Analysis
// This file tests the new AI analysis feature with your specific JSON data format

const API_BASE_URL = 'https://smartstock-prototype.onrender.com/api/v1';
let authToken = '';

// Your sample inventory data
const sampleInventoryData = {
  "products": [
    {
      "productId": "686dbecc340b0fc4ee3631a2",
      "productName": "Minimalist Line Art Canvas",
      "sku": "FF-LN-MIN112",
      "category": "decor",
      "price": 1899,
      "inventory": {
        "currentStock": 10000,
        "warehouseLocation": "686dbe39c701dc6414a76c7c"
      },
      "sales": {
        "totalSold": 0,
        "lastSoldAt": null
      },
      "returns": [
        {
          "returnId": "ret001",
          "reason": "Damaged in transit",
          "quantity": 1,
          "returnDate": "2024-01-15"
        }
      ],
      "damages": [
        { "cause": "Water damage" },
        { "cause": "Corner bent" },
        { "cause": "Frame crack" },
        { "cause": "Color fade" },
        { "cause": "Scratches" }
      ]
    },
    {
      "productId": "686dbf6e340b0fc4ee368082",
      "productName": "Vintage Floral Canvas",
      "sku": "BA-FLR-VT555",
      "category": "decor",
      "price": 1799,
      "inventory": {
        "currentStock": 500,
        "warehouseLocation": "686dbe39c701dc6414a76c7c"
      },
      "sales": {
        "totalSold": 25,
        "lastSoldAt": "2024-06-15"
      },
      "returns": [],
      "damages": []
    },
    {
      "productId": "686dbf76340b0fc4ee36808c",
      "productName": "Botanical Print Canvas",
      "sku": "GW-BOT-PR334",
      "category": "decor",
      "price": 1599,
      "inventory": {
        "currentStock": 150,
        "warehouseLocation": "686dbe39c701dc6414a76c7c"
      },
      "sales": {
        "totalSold": 75,
        "lastSoldAt": "2024-07-01"
      },
      "returns": [
        {
          "returnId": "ret002",
          "reason": "Wrong size",
          "quantity": 2,
          "returnDate": "2024-06-20"
        }
      ],
      "damages": [
        { "cause": "Minor scratch" }
      ]
    }
  ]
};

// Login function
async function login() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@smartstock.com', // Update with your admin credentials
        password: 'admin123' // Update with your admin password
      })
    });

    const data = await response.json();

    if (data.success && data.token) {
      authToken = data.token;
      console.log('✅ Login successful');
      return true;
    } else {
      console.error('❌ Login failed:', data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return false;
  }
}

// Test JSON data analysis
async function testJSONDataAnalysis() {
  console.log('\n🧠 Testing AI Analysis of JSON Inventory Data...');

  try {
    const response = await fetch(`${API_BASE_URL}/ai/analyze/json-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        inventoryData: sampleInventoryData,
        analysisType: 'comprehensive'
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ JSON Data Analysis completed successfully!');
      console.log('\n📊 Analysis Summary:');
      console.log('- Analysis ID:', data.data.analysisId);
      console.log('- Products Analyzed:', data.data.metadata.productsAnalyzed);
      console.log('- Overall Risk Level:', data.data.summary?.riskLevel || 'Unknown');

      if (data.data.summary?.mainConcerns) {
        console.log('\n⚠️ Main Concerns:');
        data.data.summary.mainConcerns.forEach((concern, index) => {
          console.log(`  ${index + 1}. ${concern}`);
        });
      }

      if (data.data.productInsights) {
        console.log('\n🎯 Product Insights:');
        data.data.productInsights.forEach(product => {
          console.log(`\n📦 ${product.productName}:`);
          console.log(`  - Risk Level: ${product.riskLevel}`);
          console.log(`  - Current Status: ${product.stockOptimization?.currentStatus || 'N/A'}`);
          console.log(`  - 30-Day Forecast: ${product.demandForecast?.next30Days || 'N/A'}`);
          console.log(`  - Confidence: ${product.demandForecast?.confidence || 'N/A'}`);

          if (product.recommendations && product.recommendations.length > 0) {
            console.log('  - Recommendations:');
            product.recommendations.forEach(rec => {
              console.log(`    • ${rec}`);
            });
          }
        });
      }

      if (data.data.immediateActions) {
        console.log('\n🚨 Immediate Actions Required:');
        data.data.immediateActions.forEach((action, index) => {
          console.log(`  ${index + 1}. [${action.priority.toUpperCase()}] ${action.action}`);
          console.log(`     Expected Impact: ${action.expectedImpact}`);
        });
      }

      if (data.data.kpis) {
        console.log('\n📈 Key Performance Indicators:');
        Object.entries(data.data.kpis).forEach(([key, value]) => {
          console.log(`  - ${key}: ${value}`);
        });
      }

      console.log('\n✨ Analysis completed and saved to database!');
      return data.data.analysisId;

    } else {
      console.error('❌ JSON Data Analysis failed:', data.message);
      if (data.error) {
        console.error('Error details:', data.error);
      }
      return null;
    }
  } catch (error) {
    console.error('❌ JSON Data Analysis error:', error.message);
    return null;
  }
}

// Test different analysis types
async function testDifferentAnalysisTypes() {
  console.log('\n🔄 Testing Different Analysis Types...');

  const analysisTypes = ['comprehensive', 'demand_focus', 'risk_focus', 'optimization_focus'];

  for (const analysisType of analysisTypes) {
    console.log(`\n📊 Testing ${analysisType} analysis...`);

    try {
      const response = await fetch(`${API_BASE_URL}/ai/analyze/json-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          inventoryData: sampleInventoryData,
          analysisType: analysisType
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log(`✅ ${analysisType} analysis completed`);
        console.log(`   Analysis ID: ${data.data.analysisId}`);
        console.log(`   Risk Level: ${data.data.summary?.riskLevel || 'Unknown'}`);
      } else {
        console.log(`❌ ${analysisType} analysis failed: ${data.message}`);
      }
    } catch (error) {
      console.log(`❌ ${analysisType} analysis error: ${error.message}`);
    }
  }
}

// Main test function
async function runJSONAnalysisTests() {
  console.log('🚀 Starting JSON Inventory Data Analysis Tests');
  console.log('================================================');

  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  // Step 2: Test comprehensive analysis
  const analysisId = await testJSONDataAnalysis();

  if (analysisId) {
    console.log('\n✅ Basic analysis completed successfully!');

    // Step 3: Test different analysis types
    await testDifferentAnalysisTypes();

    console.log('\n🎉 All JSON analysis tests completed!');
    console.log('\n📋 What you can do next:');
    console.log('1. Check the database for saved AI insights');
    console.log('2. Use the analysis ID to retrieve specific insights');
    console.log('3. Integrate this into your frontend dashboard');
    console.log('4. Set up automated analysis for regular inventory reviews');
  } else {
    console.log('\n❌ Analysis tests failed. Please check your server logs.');
  }
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  runJSONAnalysisTests().catch(console.error);
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testJSONDataAnalysis,
    testDifferentAnalysisTypes,
    runJSONAnalysisTests,
    sampleInventoryData
  };
}
