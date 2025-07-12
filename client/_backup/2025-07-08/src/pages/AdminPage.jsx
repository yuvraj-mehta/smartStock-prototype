import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import './AdminPage.css';

// Import admin components
import {
  AdminUserManagement,
  ProductManagement,
  ExternalUserManagement,
  AdminDashboard,
} from '../components/features';

const AdminPage = () => {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [triggerAction, setTriggerAction] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Handle URL parameters for tab switching and actions
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    const actionParam = urlParams.get('action');

    if (tabParam && ['dashboard', 'users', 'products', 'external'].includes(tabParam)) {
      setActiveTab(tabParam);

      // Handle create actions
      if (actionParam === 'create') {
        setTriggerAction('create');
        // Clear the action parameter after triggering
        setTimeout(() => setTriggerAction(null), 100);
      }
    }
  }, [location.search]);

  // Update URL when tab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    navigate(`/admin?tab=${tabId}`);
  };

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
    { id: 'external', label: 'Partner Contacts', icon: '🏢' },
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'users':
        return <AdminUserManagement triggerAction={triggerAction} />;
      case 'products':
        return <ProductManagement triggerAction={triggerAction} />;
      case 'external':
        return <ExternalUserManagement triggerAction={triggerAction} />;
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
            onClick={() => handleTabChange(tab.id)}
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
