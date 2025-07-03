import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { config } from '../../../config/config';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { token } = useSelector((state) => state.auth);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalInventory: 0,
    totalSales: 0,
    recentActivities: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE_URL = config.apiBaseUrl;

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch users, products, inventory, and sales data
      const [usersRes, productsRes, inventoryRes, salesRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/user/all`, { headers }),
        axios.get(`${API_BASE_URL}/product/all`, { headers }),
        axios.get(`${API_BASE_URL}/inventory/all`, { headers }),
        axios.get(`${API_BASE_URL}/sales/all`, { headers })
      ]);

      setStats({
        totalUsers: usersRes.status === 'fulfilled' ? usersRes.value.data.totalUsers || 0 : 0,
        totalProducts: productsRes.status === 'fulfilled' ? (productsRes.value.data.products?.length || 0) : 0,
        totalInventory: inventoryRes.status === 'fulfilled' ? (inventoryRes.value.data.inventory?.length || 0) : 0,
        totalSales: salesRes.status === 'fulfilled' ? (salesRes.value.data.sales?.length || 0) : 0,
        recentActivities: [
          'User john.doe@walmart.com was created',
          'Product iPhone 15 was added',
          'Inventory updated for SKU123',
          'New sale recorded - Order #ORD001'
        ]
      });

    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h3>Error Loading Dashboard</h3>
        <p>{error}</p>
        <button onClick={fetchDashboardData} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: '👥',
      color: '#667eea',
      description: 'Active warehouse users'
    },
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: '📦',
      color: '#f093fb',
      description: 'Products in catalog'
    },
    {
      title: 'Inventory Items',
      value: stats.totalInventory,
      icon: '📋',
      color: '#4facfe',
      description: 'Items in stock'
    },
    {
      title: 'Total Sales',
      value: stats.totalSales,
      icon: '💰',
      color: '#43e97b',
      description: 'Sales recorded'
    }
  ];

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h2>Admin Dashboard</h2>
        <p>Overview of your warehouse operations</p>
      </div>

      <div className="stats-grid">
        {statCards.map((card, index) => (
          <div key={index} className="stat-card" style={{ borderLeftColor: card.color }}>
            <div className="stat-content">
              <div className="stat-icon" style={{ color: card.color }}>
                {card.icon}
              </div>
              <div className="stat-details">
                <h3>{card.value}</h3>
                <p className="stat-title">{card.title}</p>
                <span className="stat-description">{card.description}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-sections">
        <div className="recent-activities">
          <h3>Recent Activities</h3>
          <div className="activity-list">
            {stats.recentActivities.map((activity, index) => (
              <div key={index} className="activity-item">
                <div className="activity-icon">📝</div>
                <div className="activity-text">
                  <p>{activity}</p>
                  <span className="activity-time">
                    {new Date(Date.now() - index * 3600000).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button className="action-btn create-user">
              <span className="action-icon">👤</span>
              Create User
            </button>
            <button className="action-btn add-product">
              <span className="action-icon">➕</span>
              Add Product
            </button>
            <button className="action-btn add-supplier">
              <span className="action-icon">🏢</span>
              Add Supplier
            </button>
            <Link to="/sales" className="action-btn view-sales">
              <span className="action-icon">�</span>
              View Sales
            </Link>
          </div>
        </div>
      </div>

      <div className="system-info">
        <h3>System Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Server Status:</span>
            <span className="info-value status-online">🟢 Online</span>
          </div>
          <div className="info-item">
            <span className="info-label">Last Backup:</span>
            <span className="info-value">{new Date().toLocaleDateString()}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Active Sessions:</span>
            <span className="info-value">{stats.totalUsers} users</span>
          </div>
          <div className="info-item">
            <span className="info-label">Database:</span>
            <span className="info-value status-online">🟢 Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
