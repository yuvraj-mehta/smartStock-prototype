import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, Building2, Package, Users } from 'lucide-react';
import './AdminPage.css';
import { USER_ROLES } from '../constants';

// Import admin components
import {
  AdminUserManagement,
  ProductManagement,
  ExternalUserManagement,
  AdminDashboard,
} from '../components/features';

const normalizeRole = (role) => (
  typeof role === 'string' ? role.trim().toLowerCase() : ''
);

const adminTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'users', label: 'User Management', icon: Users },
  { id: 'products', label: 'Product Management', icon: Package },
  { id: 'external', label: 'Partner Contacts', icon: Building2 },
];

const DEFAULT_ADMIN_TAB = 'dashboard';
const ADMIN_TAB_IDS = new Set(adminTabs.map(({ id }) => id));
const ADMIN_CREATE_ACTION_TABS = new Set(['users', 'products', 'external']);

const AdminPage = () => {
  const { user } = useSelector((state) => state.auth);
  const [triggerAction, setTriggerAction] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const actionParam = searchParams.get('action');
  const activeTab = ADMIN_TAB_IDS.has(tabParam) ? tabParam : DEFAULT_ADMIN_TAB;

  useEffect(() => {
    if (tabParam !== null && !ADMIN_TAB_IDS.has(tabParam)) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('tab', DEFAULT_ADMIN_TAB);
      nextParams.delete('action');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams, tabParam]);

  useEffect(() => {
    if (actionParam !== 'create' || !ADMIN_CREATE_ACTION_TABS.has(activeTab)) {
      return undefined;
    }

    setTriggerAction('create');
    const timer = setTimeout(() => setTriggerAction(null), 100);
    return () => clearTimeout(timer);
  }, [actionParam, activeTab]);

  const handleTabChange = (tabId) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tabId);
    nextParams.delete('action');
    setSearchParams(nextParams);
  };

  const handleTabKeyDown = (event) => {
    const currentIndex = adminTabs.findIndex((tab) => tab.id === activeTab);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % adminTabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + adminTabs.length) % adminTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = adminTabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = adminTabs[nextIndex];
    handleTabChange(nextTab.id);
    requestAnimationFrame(() => document.getElementById(`admin-tab-${nextTab.id}`)?.focus());
  };

  // Check if user is admin
  if (!user || normalizeRole(user.role) !== USER_ROLES.ADMIN) {
    return (
      <div className="admin-access-denied">
        <div className="admin-access-denied-content">
          <h2>Access Denied</h2>
          <p>You don't have permission to access the admin panel.</p>
          <p>Only administrators can access this page.</p>
        </div>
      </div>
    );
  }

  const activePanelId = `admin-panel-${activeTab}`;

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
        <div>
          <p className="admin-eyebrow">Operations console</p>
          <h1>Admin Panel</h1>
        </div>
        <div className="admin-context">
          <span>{user.fullName}</span>
          <span>{user.assignedWarehouseId?.warehouseName || 'Warehouse not assigned'}</span>
        </div>
      </div>

      <div className="admin-navigation" role="tablist" aria-label="Admin sections">
        {adminTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              id={`admin-tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`admin-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={`admin-tab ${isActive ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
              onKeyDown={handleTabKeyDown}
            >
              <Icon className="admin-tab-icon" aria-hidden="true" />
              <span className="admin-tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div
        id={activePanelId}
        className="admin-content"
        role="tabpanel"
        aria-labelledby={`admin-tab-${activeTab}`}
        tabIndex={0}
      >
        {renderActiveComponent()}
      </div>
    </div>
  );
};

export default AdminPage;
