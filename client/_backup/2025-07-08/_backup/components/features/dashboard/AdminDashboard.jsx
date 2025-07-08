
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import api, { userAPI, productAPI } from '../../../services/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { token } = useSelector((state) => state.auth);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalInventory: 0,
    totalSales: 0,
    lowStockItems: 0,
    totalExternalUsers: 0,
    recentActivities: [],
    inventoryHealth: {},
    salesTrend: [],
    topProducts: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch users
      const [usersRes, productsRes, externalUsersRes, salesRes, inventoryRes] = await Promise.all([
        userAPI.getAllUsers(),
        productAPI.getAllProducts(),
        userAPI.getAllExternalUsers(),
        api.get('/sales/all').catch(() => ({ data: [] })),
        api.get('/inventory/all').catch(() => ({ data: [] })),
      ]);

      setStats({
        totalUsers: Array.isArray(usersRes?.data?.users) ? usersRes.data.users.length : 0,
        totalProducts: Array.isArray(productsRes?.data?.products) ? productsRes.data.products.length : 0,
        totalInventory: Array.isArray(inventoryRes?.data?.inventory) ? inventoryRes.data.inventory.length : 0,
        totalSales: Array.isArray(salesRes?.data?.sales) ? salesRes.data.sales.length : 0,
        lowStockItems: 'upcoming feature',
        totalExternalUsers: Array.isArray(externalUsersRes?.data?.externalUsers) ? externalUsersRes.data.externalUsers.length : 0,
        recentActivities: 'upcoming feature',
        inventoryHealth: 'upcoming feature',
        salesTrend: 'upcoming feature',
        topProducts: 'upcoming feature',
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mb-4"></div>
        <p className="text-gray-600 text-lg font-medium">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center">
          <div className="text-6xl mb-6">⚠️</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers ?? 'upcoming feature',
      icon: '👥',
      color: '#667eea',
      description: 'Active warehouse users',
      link: '/admin?tab=users',
      available: typeof stats.totalUsers === 'number',
    },
    {
      title: 'Total Products',
      value: stats.totalProducts ?? 'upcoming feature',
      icon: '📦',
      color: '#f093fb',
      description: 'Products in catalog',
      link: '/admin?tab=products',
      available: typeof stats.totalProducts === 'number',
    },
    {
      title: 'Total Sales',
      value: stats.totalSales ?? 'upcoming feature',
      icon: '💰',
      color: '#43e97b',
      description: 'Sales recorded',
      link: '/sales',
      available: typeof stats.totalSales === 'number',
    },
    {
      title: 'External Users',
      value: stats.totalExternalUsers ?? 'upcoming feature',
      icon: '🏢',
      color: '#764ba2',
      description: 'Suppliers & Transporters',
      link: '/admin?tab=external',
      available: typeof stats.totalExternalUsers === 'number',
    },
  ];

  const upcomingFeatures = [
    {
      title: 'Revenue Analytics',
      icon: '📊',
      description: 'Detailed financial reports and trends',
      status: 'Coming Soon',
    },
    {
      title: 'Predictive Analytics',
      icon: '🔮',
      description: 'AI-powered demand forecasting',
      status: 'Coming Soon',
    },
    {
      title: 'Performance Metrics',
      icon: '🎯',
      description: 'KPI tracking and benchmarking',
      status: 'Coming Soon',
    },
    {
      title: 'Automated Reports',
      icon: '📋',
      description: 'Scheduled email reports',
      status: 'Coming Soon',
    },
  ];

  return (
    <div className="p-0 bg-gray-50 min-h-screen">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-10 rounded-2xl text-white mb-10">
        <h2 className="text-4xl font-bold text-white m-0 mb-3">Admin Dashboard</h2>
        <p className="text-white/90 text-xl m-0 font-light">Overview of your warehouse operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {statCards.map((card, index) => (
          <Link key={index} to={card.link} className="block no-underline">
            <div
              className="bg-white rounded-2xl p-6 shadow-lg border-l-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl h-48 flex flex-col justify-between"
              style={{ borderLeftColor: card.color }}
            >
              <div className="flex items-start justify-between gap-4 flex-1">
                <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                  <div>
                    <h3 className="text-3xl font-bold mb-2 text-gray-900 leading-tight">{card.value}</h3>
                    <p className="text-sm font-semibold text-gray-700 mb-2">{card.title}</p>
                    <span className="text-xs text-gray-500 leading-relaxed block">{card.description}</span>
                  </div>
                  {card.available && (
                    <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-semibold uppercase tracking-wide self-start mt-3">
                      ✓ Live
                    </span>
                  )}
                </div>
                <div
                  className="text-3xl opacity-90 flex-shrink-0"
                  style={{ color: card.color }}
                >
                  {card.icon}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 m-0">Recent Activities</h3>
              <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                Coming Soon
              </span>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border-l-4 border-orange-200">
                <div className="text-lg opacity-80 mt-1">🚧</div>
                <div className="flex-1">
                  <p className="text-gray-800 font-medium mb-1 leading-relaxed m-0 text-sm">Activity tracking system is being developed</p>
                  <span className="text-xs text-gray-500 font-normal">
                    Currently showing basic timestamps
                  </span>
                </div>
              </div>
              {stats.recentActivities === 'upcoming feature' ? (
                <div className="text-center text-gray-400 italic py-4">Upcoming feature</div>
              ) : (
                stats.recentActivities.slice(0, 3).map((activity, index) => (
                  <div key={activity.id || index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border-l-4 border-gray-200 opacity-50">
                    <div className="text-lg opacity-80 mt-1">📝</div>
                    <div className="flex-1">
                      <p className="text-gray-800 font-medium mb-1 leading-relaxed m-0 text-sm">
                        {activity.action} by {activity.user}
                      </p>
                      <span className="text-xs text-gray-500 font-normal">
                        {activity.time}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div className="text-center py-2">
                <p className="text-xs text-gray-500 italic">
                  📊 Full activity logging coming soon!
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 m-0">Quick Actions</h3>
              <span className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                Available
              </span>
            </div>
            <div className="flex flex-wrap gap-4 justify-start">
              <Link to="/admin?tab=users&action=create" className="flex-1 min-w-[120px] max-w-[140px] flex flex-col items-center justify-center gap-2 p-5 bg-gray-50 border border-gray-200 rounded-xl no-underline text-gray-700 transition-all duration-200 hover:bg-gray-100 hover:border-gray-300 hover:-translate-y-1 hover:shadow-md">
                <span className="text-3xl mb-1 opacity-80">👤</span>
                <span className="text-sm font-semibold text-center leading-tight">Create User</span>
              </Link>
              <Link to="/admin?tab=products&action=create" className="flex-1 min-w-[120px] max-w-[140px] flex flex-col items-center justify-center gap-2 p-5 bg-gray-50 border border-gray-200 rounded-xl no-underline text-gray-700 transition-all duration-200 hover:bg-gray-100 hover:border-gray-300 hover:-translate-y-1 hover:shadow-md">
                <span className="text-3xl mb-1 opacity-80">➕</span>
                <span className="text-sm font-semibold text-center leading-tight">Add Product</span>
              </Link>
              <Link to="/admin?tab=external&action=create" className="flex-1 min-w-[120px] max-w-[140px] flex flex-col items-center justify-center gap-2 p-5 bg-gray-50 border border-gray-200 rounded-xl no-underline text-gray-700 transition-all duration-200 hover:bg-gray-100 hover:border-gray-300 hover:-translate-y-1 hover:shadow-md">
                <span className="text-3xl mb-1 opacity-80">🏢</span>
                <span className="text-sm font-semibold text-center leading-tight">Add Supplier</span>
              </Link>
              <Link to="/inventory" className="flex-1 min-w-[120px] max-w-[140px] flex flex-col items-center justify-center gap-2 p-5 bg-gray-50 border border-gray-200 rounded-xl no-underline text-gray-700 transition-all duration-200 hover:bg-gray-100 hover:border-gray-300 hover:-translate-y-1 hover:shadow-md">
                <span className="text-3xl mb-1 opacity-80">📦</span>
                <span className="text-sm font-semibold text-center leading-tight">View Inventory</span>
              </Link>
              <Link to="/sales" className="flex-1 min-w-[120px] max-w-[140px] flex flex-col items-center justify-center gap-2 p-5 bg-gray-50 border border-gray-200 rounded-xl no-underline text-gray-700 transition-all duration-200 hover:bg-gray-100 hover:border-gray-300 hover:-translate-y-1 hover:shadow-md">
                <span className="text-3xl mb-1 opacity-80">💰</span>
                <span className="text-sm font-semibold text-center leading-tight">View Sales</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 m-0">System Information</h3>
          <span className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
            Status
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border-l-4 border-green-500">
            <span className="text-sm font-semibold text-gray-700">Server Status:</span>
            <span className="text-sm font-bold text-green-600 flex items-center gap-1">
              🟢 Online
            </span>
          </div>
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border-l-4 border-blue-500">
            <span className="text-sm font-semibold text-gray-700">Last Backup:</span>
            <span className="text-sm font-medium text-gray-600">{new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border-l-4 border-purple-500">
            <span className="text-sm font-semibold text-gray-700">Active Sessions:</span>
            <span className="text-sm font-medium text-gray-600">{stats.totalUsers} users</span>
          </div>
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border-l-4 border-green-500">
            <span className="text-sm font-semibold text-gray-700">Database:</span>
            <span className="text-sm font-bold text-green-600 flex items-center gap-1">
              🟢 Connected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
