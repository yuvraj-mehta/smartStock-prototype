import React, { useState } from 'react';
import SalesManagement from './SalesManagement';
import ReturnsManagement from './ReturnsManagement';
import './SalesReturnsManagement.css';

const SalesReturnsManagement = () => {
  const [activeTab, setActiveTab] = useState('sales');

  const tabs = [
    { id: 'sales', label: 'Sales', icon: '💰' },
    { id: 'returns', label: 'Returns', icon: '↩️' }
  ];

  return (
    <div className="sales-returns-management">
      <div className="sr-header">
        <h2>Sales & Returns Management</h2>
        <p>Manage sales transactions and process returns</p>
      </div>

      <div className="sr-navigation">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`sr-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="sr-tab-icon">{tab.icon}</span>
            <span className="sr-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="sr-content">
        {activeTab === 'sales' && <SalesManagement />}
        {activeTab === 'returns' && <ReturnsManagement />}
      </div>
    </div>
  );
};

export default SalesReturnsManagement;
