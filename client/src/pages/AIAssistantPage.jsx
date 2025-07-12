import React, { useState, useEffect } from 'react';
import DemandForecast from '../components/ai/DemandForecast';
import StockAlert from '../components/ai/StockAlert';
import AIDashboard from '../components/ai/AIDashboard';
import './AIAssistantPage.css';

const AIAssistantPage = () => {
  const [activeTab, setActiveTab] = useState('demand-prediction');
  const [thresholdSettings, setThresholdSettings] = useState({
    lowStockThreshold: 10,
    criticalStockThreshold: 5,
    demandSensitivity: 'medium',
    forecastPeriod: '30'
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('inventoryThresholdSettings');
    if (savedSettings) {
      setThresholdSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleThresholdChange = (field, value) => {
    setThresholdSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setSaveMessage('');

      // Save to localStorage
      localStorage.setItem('inventoryThresholdSettings', JSON.stringify(thresholdSettings));

      // Here you could also send to backend API
      // await fetch(`${import.meta.env.VITE_API_BASE_URL}/settings/thresholds`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(thresholdSettings)
      // });

      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Error saving settings. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

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
                  value={thresholdSettings.lowStockThreshold}
                  onChange={(e) => handleThresholdChange('lowStockThreshold', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
                <p className="text-sm text-gray-500 mt-1">Alert when stock falls below this level</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Critical Stock Threshold
                </label>
                <input
                  type="number"
                  value={thresholdSettings.criticalStockThreshold}
                  onChange={(e) => handleThresholdChange('criticalStockThreshold', parseInt(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
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
                <select
                  value={thresholdSettings.demandSensitivity}
                  onChange={(e) => handleThresholdChange('demandSensitivity', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forecast Period
                </label>
                <select
                  value={thresholdSettings.forecastPeriod}
                  onChange={(e) => handleThresholdChange('forecastPeriod', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </div>
            </div>
          </div>

          {saveMessage && (
            <div className={`p-3 rounded-md ${saveMessage.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {saveMessage}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {saving ? 'Saving...' : 'Save Settings'}
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
        {activeTab === 'stock-alerts' && <StockAlert />}

        {/* Sales Analysis Tab */}
        {activeTab === 'sales-analysis' && <AIDashboard />}

        {/* Threshold Settings Tab */}
        {activeTab === 'threshold-settings' && renderThresholdSettings()}
      </div>
    </div>
  );
};

export default AIAssistantPage;
