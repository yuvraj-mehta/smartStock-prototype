import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import './AIAssistantPage.css';

const AIAssistantPage = () => {
  const { token, user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('demand-prediction');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    products: [],
    sales: [],
    inventory: [],
    predictions: [],
    alerts: [],
    analytics: {},
  });
  const [analysisResults, setAnalysisResults] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [predictionPeriod, setPredictionPeriod] = useState('30');
  const [thresholdSettings, setThresholdSettings] = useState({
    lowStockThreshold: 10,
    highStockThreshold: 1000,
    demandSensitivity: 'medium',
  });

  useEffect(() => {
    fetchData();
    generateMockPredictions();
    generateMockAlerts();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with your new backend API calls
      // Mock data for now
      const mockData = {
        products: [
          { _id: '1', productName: 'Sample Product 1', sku: 'SP001', price: 29.99 },
          { _id: '2', productName: 'Sample Product 2', sku: 'SP002', price: 49.99 },
        ],
        sales: [
          { _id: '1', productId: '1', quantity: 10, date: '2024-01-15' },
          { _id: '2', productId: '2', quantity: 5, date: '2024-01-16' },
        ],
        inventory: [
          { _id: '1', productId: '1', quantity: 100, location: 'Warehouse A' },
          { _id: '2', productId: '2', quantity: 50, location: 'Warehouse B' },
        ],
      };

      setData(prev => ({
        ...prev,
        products: mockData.products,
        sales: mockData.sales,
        inventory: mockData.inventory,
      }));

    } catch (err) {
      console.error('Fetch data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateMockPredictions = () => {
    // Mock prediction data
    const mockPredictions = [
      {
        id: 1,
        productName: 'Sample Product 1',
        currentStock: 100,
        predictedDemand: 85,
        recommendedRestock: 150,
        confidence: 0.85,
        nextRestockDate: '2024-02-15',
      },
      {
        id: 2,
        productName: 'Sample Product 2',
        currentStock: 50,
        predictedDemand: 40,
        recommendedRestock: 80,
        confidence: 0.78,
        nextRestockDate: '2024-02-20',
      },
    ];

    setData(prev => ({ ...prev, predictions: mockPredictions }));
  };

  const generateMockAlerts = () => {
    // Mock alerts data
    const mockAlerts = [
      {
        id: 1,
        type: 'low_stock',
        message: 'Sample Product 1 is running low',
        severity: 'warning',
        timestamp: new Date().toISOString(),
      },
      {
        id: 2,
        type: 'high_demand',
        message: 'Unusual demand spike detected for Sample Product 2',
        severity: 'info',
        timestamp: new Date().toISOString(),
      },
    ];

    setData(prev => ({ ...prev, alerts: mockAlerts }));
  };

  const analyzeSalesData = async () => {
    setLoading(true);

    // Mock analysis (in real implementation, this would call AI service)
    setTimeout(() => {
      const analysis = {
        totalRevenue: 125600,
        totalSales: 342,
        avgOrderValue: 367.25,
        topProducts: [
          { name: 'iPhone 15', sales: 89, revenue: 79100 },
          { name: 'Samsung Galaxy S24', sales: 67, revenue: 53600 },
          { name: 'MacBook Pro', sales: 23, revenue: 45980 },
        ],
        trends: {
          weeklyGrowth: 12.5,
          monthlyGrowth: 8.3,
          yearlyGrowth: 25.7,
        },
        insights: [
          'Peak sales occur on Fridays and Saturdays',
          'Electronics category shows strongest growth',
          'Customer retention rate is 78%',
          'Average time between purchases is 21 days',
        ],
        recommendations: [
          'Increase iPhone 15 stock by 30% for next month',
          'Launch targeted marketing for slower-moving items',
          'Optimize pricing for accessories to increase basket size',
          'Consider bundle offers to increase average order value',
        ],
      };
      setAnalysisResults(analysis);
      setLoading(false);
    }, 2000);
  };

  const predictDemand = async () => {
    if (!selectedProduct || !predictionPeriod) {
      alert('Please select a product and prediction period');
      return;
    }

    setLoading(true);

    // Mock prediction (in real implementation, this would call AI service)
    setTimeout(() => {
      const prediction = {
        product: selectedProduct,
        period: predictionPeriod,
        currentStock: Math.floor(Math.random() * 100) + 20,
        predictedDemand: Math.floor(Math.random() * 150) + 50,
        confidence: Math.floor(Math.random() * 30) + 70,
        factors: [
          'Seasonal trends',
          'Historical sales data',
          'Market conditions',
          'Promotional impact',
        ],
        recommendations: [
          `Order ${Math.floor(Math.random() * 50) + 20} units`,
          'Monitor competitor pricing',
          'Consider promotional strategy',
        ],
      };

      alert(`Demand Prediction for ${selectedProduct}:\nPredicted demand: ${prediction.predictedDemand} units\nConfidence: ${prediction.confidence}%`);
      setLoading(false);
    }, 1500);
  };

  const updateThresholds = async () => {
    setLoading(true);

    // Mock threshold update
    setTimeout(() => {
      alert('Threshold settings updated successfully!\nNew settings will be applied to inventory monitoring.');
      setLoading(false);
    }, 1000);
  };

  const dismissAlert = (alertId) => {
    setData(prev => ({
      ...prev,
      alerts: prev.alerts.map(alert =>
        alert.id === alertId ? { ...alert, status: 'dismissed' } : alert,
      ),
    }));
  };

  const getAlertIcon = (type) => {
    const icons = {
      low_stock: '⚠️',
      overstock: '📦',
      demand_spike: '📈',
      threshold_adjust: '🎚️',
    };
    return icons[type] || '🔔';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'red',
      medium: 'orange',
      low: 'blue',
    };
    return colors[priority] || 'gray';
  };

  const tabs = [
    { id: 'demand-prediction', label: 'Demand Prediction', icon: '🔮' },
    { id: 'stock-alerts', label: 'Stock Alerts', icon: '🚨' },
    { id: 'sales-analysis', label: 'Sales Analysis', icon: '📊' },
    { id: 'threshold-settings', label: 'Threshold Settings', icon: '⚙️' },
  ];

  return (
    <div className="ai-assistant-page">
      <div className="ai-header">
        <h1>AI Assistant</h1>
        <p>Intelligent inventory management and demand forecasting</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="ai-content">
        {/* Demand Prediction Tab */}
        {activeTab === 'demand-prediction' && (
          <div className="demand-prediction">
            <div className="section-header">
              <h2>Demand Prediction</h2>
              <p>Forecast future demand using AI-powered analytics</p>
            </div>

            <div className="prediction-controls">
              <div className="control-group">
                <label>Select Product</label>
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  <option value="">Choose a product...</option>
                  {data.products.map(product => (
                    <option key={product._id} value={product.name}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="control-group">
                <label>Prediction Period</label>
                <select
                  value={predictionPeriod}
                  onChange={(e) => setPredictionPeriod(e.target.value)}
                >
                  <option value="7">Next 7 days</option>
                  <option value="30">Next 30 days</option>
                  <option value="90">Next 3 months</option>
                  <option value="365">Next year</option>
                </select>
              </div>
              <button
                className="btn-predict"
                onClick={predictDemand}
                disabled={loading}
              >
                {loading ? 'Analyzing...' : 'Predict Demand'}
              </button>
            </div>

            <div className="predictions-grid">
              {data.predictions.map((prediction, index) => (
                <div key={index} className="prediction-card">
                  <div className="prediction-header">
                    <h3>{prediction.productName}</h3>
                    <span className={`confidence confidence-${prediction.confidence > 85 ? 'high' : prediction.confidence > 70 ? 'medium' : 'low'}`}>
                      {prediction.confidence}% confidence
                    </span>
                  </div>
                  <div className="prediction-details">
                    <div className="detail-row">
                      <span>Current Stock:</span>
                      <span>{prediction.currentStock} units</span>
                    </div>
                    <div className="detail-row">
                      <span>Predicted Demand:</span>
                      <span>{prediction.predictedDemand} units</span>
                    </div>
                    <div className="detail-row">
                      <span>Recommended Stock:</span>
                      <span>{prediction.recommendedStock} units</span>
                    </div>
                    <div className="detail-row">
                      <span>Trend:</span>
                      <span className={`trend trend-${prediction.trend}`}>
                        {prediction.trend}
                      </span>
                    </div>
                  </div>
                  <div className="prediction-actions">
                    <button className="btn-action">View Details</button>
                    <button className="btn-action primary">Apply Recommendation</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stock Alerts Tab */}
        {activeTab === 'stock-alerts' && (
          <div className="stock-alerts">
            <div className="section-header">
              <h2>Stock Alerts</h2>
              <p>Real-time notifications for inventory optimization</p>
            </div>

            <div className="alerts-list">
              {data.alerts.filter(alert => alert.status !== 'dismissed').map((alert) => (
                <div key={alert.id} className={`alert-card alert-${alert.priority}`}>
                  <div className="alert-header">
                    <div className="alert-title">
                      <span className="alert-icon">{getAlertIcon(alert.type)}</span>
                      <span className="alert-product">{alert.product}</span>
                      <span className={`alert-priority priority-${alert.priority}`}>
                        {alert.priority.toUpperCase()}
                      </span>
                    </div>
                    <div className="alert-time">
                      {alert.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="alert-content">
                    <p className="alert-message">{alert.message}</p>
                    <p className="alert-recommendation">
                      <strong>Recommendation:</strong> {alert.recommendation}
                    </p>
                  </div>
                  <div className="alert-actions">
                    <button className="btn-action">View Product</button>
                    <button className="btn-action">Take Action</button>
                    <button
                      className="btn-dismiss"
                      onClick={() => dismissAlert(alert.id)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sales Analysis Tab */}
        {activeTab === 'sales-analysis' && (
          <div className="sales-analysis">
            <div className="section-header">
              <h2>Sales Analysis</h2>
              <p>AI-powered insights from your sales data</p>
            </div>

            <div className="analysis-controls">
              <button
                className="btn-analyze"
                onClick={analyzeSalesData}
                disabled={loading}
              >
                {loading ? 'Analyzing...' : 'Analyze Sales Data'}
              </button>
            </div>

            {analysisResults && (
              <div className="analysis-results">
                <div className="results-grid">
                  <div className="result-card">
                    <h3>Revenue Overview</h3>
                    <div className="metric-large">${analysisResults.totalRevenue.toLocaleString()}</div>
                    <div className="metric-small">{analysisResults.totalSales} total sales</div>
                    <div className="metric-small">Avg: ${analysisResults.avgOrderValue}</div>
                  </div>

                  <div className="result-card">
                    <h3>Growth Trends</h3>
                    <div className="trend-item">
                      <span>Weekly:</span>
                      <span className="trend-positive">+{analysisResults.trends.weeklyGrowth}%</span>
                    </div>
                    <div className="trend-item">
                      <span>Monthly:</span>
                      <span className="trend-positive">+{analysisResults.trends.monthlyGrowth}%</span>
                    </div>
                    <div className="trend-item">
                      <span>Yearly:</span>
                      <span className="trend-positive">+{analysisResults.trends.yearlyGrowth}%</span>
                    </div>
                  </div>

                  <div className="result-card">
                    <h3>Top Products</h3>
                    {analysisResults.topProducts.map((product, index) => (
                      <div key={index} className="top-product">
                        <span className="product-name">{product.name}</span>
                        <span className="product-sales">{product.sales} sales</span>
                        <span className="product-revenue">${product.revenue.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="insights-section">
                  <div className="insights-card">
                    <h3>AI Insights</h3>
                    <ul>
                      {analysisResults.insights.map((insight, index) => (
                        <li key={index}>{insight}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="recommendations-card">
                    <h3>Recommendations</h3>
                    <ul>
                      {analysisResults.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Threshold Settings Tab */}
        {activeTab === 'threshold-settings' && (
          <div className="threshold-settings">
            <div className="section-header">
              <h2>Threshold Settings</h2>
              <p>Configure automated inventory thresholds and alerts</p>
            </div>

            <div className="settings-form">
              <div className="settings-group">
                <h3>Stock Level Thresholds</h3>
                <div className="setting-item">
                  <label>Low Stock Threshold</label>
                  <input
                    type="number"
                    value={thresholdSettings.lowStockThreshold}
                    onChange={(e) => setThresholdSettings(prev => ({
                      ...prev,
                      lowStockThreshold: parseInt(e.target.value),
                    }))}
                  />
                  <span className="setting-description">Alert when stock falls below this level</span>
                </div>
                <div className="setting-item">
                  <label>High Stock Threshold</label>
                  <input
                    type="number"
                    value={thresholdSettings.highStockThreshold}
                    onChange={(e) => setThresholdSettings(prev => ({
                      ...prev,
                      highStockThreshold: parseInt(e.target.value),
                    }))}
                  />
                  <span className="setting-description">Alert when stock exceeds this level</span>
                </div>
              </div>

              <div className="settings-group">
                <h3>AI Sensitivity</h3>
                <div className="setting-item">
                  <label>Demand Prediction Sensitivity</label>
                  <select
                    value={thresholdSettings.demandSensitivity}
                    onChange={(e) => setThresholdSettings(prev => ({
                      ...prev,
                      demandSensitivity: e.target.value,
                    }))}
                  >
                    <option value="low">Low - Conservative predictions</option>
                    <option value="medium">Medium - Balanced approach</option>
                    <option value="high">High - Aggressive predictions</option>
                  </select>
                  <span className="setting-description">How sensitive AI should be to demand changes</span>
                </div>
              </div>

              <div className="settings-actions">
                <button
                  className="btn-save"
                  onClick={updateThresholds}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
                <button className="btn-reset">Reset to Defaults</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="ai-loading-overlay">
          <div className="ai-loading-content">
            <div className="loading-spinner"></div>
            <p>AI is processing your request...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistantPage;
