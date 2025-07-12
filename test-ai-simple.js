// Simple AI Test - Check System Status
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3500/api/v1';
let authToken = '';

async function login() {
  try {
    console.log('🔑 Attempting login...');
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@smartstock.com',
        password: 'admin123'
      })
    });

    if (response.ok) {
      const data = await response.json();
      authToken = data.token;
      console.log('✅ Login successful');
      return true;
    } else {
      const errorData = await response.json();
      console.error('❌ Login failed:', errorData.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return false;
  }
}

async function checkSystemStatus() {
  try {
    console.log('\n📊 Checking system status...');
    
    // Check products
    const productResponse = await fetch(`${API_BASE_URL}/product/all`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (productResponse.ok) {
      const productData = await productResponse.json();
      console.log(`✅ Products found: ${productData.data?.length || 0}`);
    } else {
      console.log(`❌ Product endpoint error: ${productResponse.status} ${productResponse.statusText}`);
    }
    
    // Check AI Dashboard
    const dashboardResponse = await fetch(`${API_BASE_URL}/ai/dashboard`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (dashboardResponse.ok) {
      const dashboardData = await dashboardResponse.json();
      console.log('✅ AI Dashboard accessible');
      console.log('📈 Dashboard summary:', dashboardData.data?.summary);
    } else {
      console.log(`❌ AI Dashboard error: ${dashboardResponse.status} ${dashboardResponse.statusText}`);
      if (dashboardResponse.status === 404) {
        console.log('   This might be because AI routes are not properly registered');
      }
    }
    
  } catch (error) {
    console.error('❌ System check error:', error.message);
  }
}

async function testSimpleAI() {
  console.log('🚀 Simple AI System Test');
  console.log('========================');
  
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }
  
  await checkSystemStatus();
  
  console.log('\n🎉 Test completed!');
  console.log('💡 To test AI features fully, make sure you have:');
  console.log('   1. OpenAI API key in .env file (OPENAI_API_KEY=your_key)');
  console.log('   2. Some products with historical sales data');
  console.log('   3. Inventory items in the system');
}

// Run the test
testSimpleAI().catch(console.error);
