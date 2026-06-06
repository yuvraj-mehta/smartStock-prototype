import React, { useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  BellIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import { useSearchParams } from 'react-router-dom';
import DemandForecast from '../components/ai/DemandForecast';
import StockAlert from '../components/ai/StockAlert';
import AIDashboard from '../components/ai/AIDashboard';
import './AIAssistantPage.css';

const tabs = [
  { id: 'demand-prediction', label: 'Demand Forecast', icon: ChartBarIcon },
  { id: 'stock-alerts', label: 'Stock Alerts', icon: BellIcon },
  { id: 'sales-analysis', label: 'Sales Analysis', icon: CpuChipIcon },
  { id: 'threshold-settings', label: 'Thresholds', icon: Cog6ToothIcon },
];

const getAITabId = (tabId) => `ai-tab-${tabId}`;
const getAIPanelId = (tabId) => `ai-panel-${tabId}`;
const DEFAULT_AI_TAB = 'demand-prediction';
const AI_TAB_IDS = new Set(tabs.map(({ id }) => id));

const defaultThresholdSettings = {
  lowStockThreshold: 10,
  criticalStockThreshold: 5,
  demandSensitivity: 'medium',
  forecastPeriod: '30',
};

const AIAssistantPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = AI_TAB_IDS.has(tabParam) ? tabParam : DEFAULT_AI_TAB;
  const [thresholdSettings, setThresholdSettings] = useState(defaultThresholdSettings);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('inventoryThresholdSettings');
      if (savedSettings) {
        setThresholdSettings({
          ...defaultThresholdSettings,
          ...JSON.parse(savedSettings),
        });
      }
    } catch (error) {
      console.warn('Unable to load AI threshold settings:', error);
    }
  }, []);

  useEffect(() => {
    if (tabParam !== null && !AI_TAB_IDS.has(tabParam)) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', DEFAULT_AI_TAB);
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams, tabParam]);

  const handleTabChange = (tabId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tabId);
    setSearchParams(nextParams);
  };

  const handleTabKeyDown = (event) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    handleTabChange(nextTab.id);
    requestAnimationFrame(() => document.getElementById(getAITabId(nextTab.id))?.focus());
  };

  const handleThresholdChange = (field, value) => {
    setThresholdSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveSettings = () => {
    try {
      setSaving(true);
      setSaveMessage('');

      if (Number(thresholdSettings.criticalStockThreshold) > Number(thresholdSettings.lowStockThreshold)) {
        setSaveMessage('Error: critical threshold cannot be higher than low stock threshold.');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
      }

      localStorage.setItem('inventoryThresholdSettings', JSON.stringify(thresholdSettings));

      setSaveMessage('Local threshold settings saved.');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage('Error saving settings. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const activeTabMeta = tabs.find((tab) => tab.id === activeTab) || tabs[0];

  const renderThresholdSettings = () => (
    <div className="threshold-settings">
      <div className="ai-section-header">
        <h2>Threshold Settings</h2>
        <p>Browser-local controls used by Stock Alerts in this AI workspace.</p>
      </div>

      <div className="ai-settings-panel">
        <div className="ai-settings-panel-header">
          <div>
            <h3>Inventory Thresholds</h3>
            <p>These values apply to generated Stock Alerts below; they do not update backend AI models or API thresholds.</p>
          </div>
          <span className="ai-settings-status">Local browser policy</span>
        </div>

        <div className="ai-settings-stack">
          <div className="ai-settings-group-card">
            <h4>Stock Levels</h4>
            <div className="ai-settings-grid">
              <div>
                <label className="ai-field-label" htmlFor="low-stock-threshold">
                  Low Stock Threshold
                </label>
                <input
                  id="low-stock-threshold"
                  type="number"
                  value={thresholdSettings.lowStockThreshold}
                  onChange={(e) => handleThresholdChange('lowStockThreshold', parseInt(e.target.value, 10) || 0)}
                  className="ai-input"
                  min="0"
                />
                <p className="ai-field-help">Alert when stock falls below this level.</p>
              </div>
              <div>
                <label className="ai-field-label" htmlFor="critical-stock-threshold">
                  Critical Stock Threshold
                </label>
                <input
                  id="critical-stock-threshold"
                  type="number"
                  value={thresholdSettings.criticalStockThreshold}
                  onChange={(e) => handleThresholdChange('criticalStockThreshold', parseInt(e.target.value, 10) || 0)}
                  className="ai-input"
                  min="0"
                />
                <p className="ai-field-help">Priority escalation threshold.</p>
              </div>
            </div>
          </div>

          <div className="ai-settings-group-card">
            <h4>Forecast Policy</h4>
            <div className="ai-settings-grid">
              <div>
                <label className="ai-field-label" htmlFor="demand-sensitivity">
                  Demand Sensitivity
                </label>
                <select
                  id="demand-sensitivity"
                  value={thresholdSettings.demandSensitivity}
                  onChange={(e) => handleThresholdChange('demandSensitivity', e.target.value)}
                  className="ai-input"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="ai-field-label" htmlFor="forecast-period">
                  Forecast Period
                </label>
                <select
                  id="forecast-period"
                  value={thresholdSettings.forecastPeriod}
                  onChange={(e) => handleThresholdChange('forecastPeriod', e.target.value)}
                  className="ai-input"
                >
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                  <option value="90">90 Days</option>
                </select>
              </div>
            </div>
          </div>

          {saveMessage && (
            <div className={`ai-settings-message ${saveMessage.includes('Error') ? 'is-error' : 'is-success'}`}>
              {saveMessage}
            </div>
          )}

          <div className="ai-settings-actions">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="ai-primary-button"
            >
              {saving && (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
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
        <div>
          <span className="ai-kicker">Inventory intelligence</span>
          <h1>AI Assistant</h1>
          <p>Operational recommendations for demand planning, stock alerts, and replenishment thresholds.</p>
        </div>
        <div className="ai-header-stat">
          <span>Current View</span>
          <strong>{activeTabMeta.label}</strong>
        </div>
      </div>

      <div className="ai-tab-navigation" role="tablist" aria-label="AI assistant sections">
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              id={getAITabId(tab.id)}
              role="tab"
              aria-selected={isActive}
              aria-controls={getAIPanelId(tab.id)}
              tabIndex={isActive ? 0 : -1}
              className={`ai-tab ${isActive ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
              onKeyDown={handleTabKeyDown}
            >
              <TabIcon className="ai-tab-icon" />
              <span className="ai-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div
        id={getAIPanelId(activeTab)}
        className="ai-content"
        role="tabpanel"
        aria-labelledby={getAITabId(activeTab)}
        tabIndex={0}
      >
        {activeTab === 'demand-prediction' && <DemandForecast />}
        {activeTab === 'stock-alerts' && <StockAlert thresholdSettings={thresholdSettings} />}
        {activeTab === 'sales-analysis' && <AIDashboard />}
        {activeTab === 'threshold-settings' && renderThresholdSettings()}
      </div>
    </div>
  );
};

export default AIAssistantPage;
