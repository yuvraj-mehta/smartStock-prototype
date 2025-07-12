import React, { useState } from 'react';
import DemandForecast from '../components/ai/DemandForecast';
import StockAlerts from '../components/ai/StockAlerts';
import AIDashboard from '../components/ai/AIDashboard';
import './AIAssistantPage.css';

const AIAssistantPage = () => {
  const [activeTab, setActiveTab] = useState('demand-prediction');

  const tabs = [
    { id: 'demand-prediction', label: 'Demand Prediction', icon: '🔮' },
    { id: 'stock-alerts', label: 'Stock Alerts', icon: '🚨' },
    { id: 'sales-analysis', label: 'Sales Analysis', icon: '📊' },
    { id: 'threshold-settings', label: 'Threshold Settings', icon: '⚙️' },
  ];

  const renderThresholdSettings = () => (
    <div className="threshold-settings">
      <div className="section-header">
        <h2>Threshold Settings</h2>
        <p>Configure automated inventory thresholds and alerts</p>
      </div>
      
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Stock Level Thresholds</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  defaultValue={10}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">Alert when stock falls below this level</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Critical Stock Threshold
                </label>
                <input
                  type="number"
                  defaultValue={5}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">Critical alert threshold</p>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">AI Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Demand Sensitivity
                </label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forecast Period
                </label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );

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
        {activeTab === 'demand-prediction' && <DemandForecast />}

        {/* Stock Alerts Tab */}
        {activeTab === 'stock-alerts' && <StockAlerts />}

        {/* Sales Analysis Tab */}
        {activeTab === 'sales-analysis' && <AIDashboard />}

        {/* Threshold Settings Tab */}
        {activeTab === 'threshold-settings' && renderThresholdSettings()}
      </div>
    </div>
  );
};

export default AIAssistantPage;
