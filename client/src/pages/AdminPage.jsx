import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import './AdminPage.css';

// Import admin components
import UserManagement from '../components/admin/UserManagement';
import ProductManagement from '../components/admin/ProductManagement';
import ExternalUserManagement from '../components/admin/ExternalUserManagement';
import AdminDashboard from '../components/admin/AdminDashboard';

const AdminPage = () => {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className="admin-access-denied">
        <div className="access-denied-content">
          <h2>Access Denied</h2>
          <p>You don't have permission to access the admin panel.</p>
          <p>Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  const adminTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'products', label: 'Product Management', icon: '📦' },
    { id: 'external', label: 'External Users', icon: '🏢' },
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'users':
        return <UserManagement />;
      case 'products':
        return <ProductManagement />;
      case 'external':
        return <ExternalUserManagement />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <p>Welcome, {user.fullName} | Warehouse: {user.assignedWarehouseId?.warehouseName || 'Not Assigned'}</p>
      </div>

      <div className="admin-navigation">
        {adminTabs.map((tab) => (
          <button
            key={tab.id}
            className={`admin-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="admin-content">
        {renderActiveComponent()}
      </div>
    </div>
  );
};

export default AdminPage;
