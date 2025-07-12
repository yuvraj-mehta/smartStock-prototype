import React, { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  BellIcon,
  ChartBarIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const StockAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, critical, low, expired

  useEffect(() => {
    fetchStockAlerts();
  }, []);

  const fetchStockAlerts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (!token) {
        setError('No authentication token found. Please log in.');
        return;
      }

      // Fetch inventory data to generate alerts
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/inventory/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Inventory data for alerts:', data);

        const inventoryItems = data.products || [];
        generateAlerts(inventoryItems);
      } else {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          setError('Authentication failed. Please log in again.');
        } else if (response.status === 403) {
          setError('Access denied. You need proper permissions to view inventory.');
        } else {
          setError(`Failed to fetch inventory: ${errorData.message || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Error fetching stock alerts:', err);
      setError('Network error while fetching stock alerts.');
    } finally {
      setLoading(false);
    }
  };

  const generateAlerts = (inventoryItems) => {
    const generatedAlerts = [];
    const now = new Date();

    inventoryItems.forEach(productItem => {
      const product = productItem.product;
      const totalQuantity = productItem.totalQuantity;

      // Low stock alert
      if (totalQuantity <= 10) {
        generatedAlerts.push({
          id: `low-${product._id}`,
          type: totalQuantity <= 5 ? 'critical' : 'low',
          title: `Low Stock Alert: ${product.productName || 'Unknown Product'}`,
          message: `Only ${totalQuantity} units remaining`,
          timestamp: now,
          productId: product._id,
          severity: totalQuantity <= 5 ? 'critical' : 'warning',
          icon: totalQuantity <= 5 ? ExclamationTriangleIcon : ArrowTrendingDownIcon,
          action: 'Reorder immediately'
        });
      }

      // Check batches for expiry alerts
      productItem.batches.forEach(batch => {
        if (batch.expDate) {
          const expiryDate = new Date(batch.expDate);
          const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

          if (daysUntilExpiry <= 0) {
            generatedAlerts.push({
              id: `expired-${batch.batchId}`,
              type: 'expired',
              title: `Expired Batch: ${product.productName || 'Unknown Product'}`,
              message: `Batch ${batch.batchNumber} expired ${Math.abs(daysUntilExpiry)} days ago`,
              timestamp: now,
              productId: product._id,
              batchId: batch.batchId,
              severity: 'critical',
              icon: XMarkIcon,
              action: 'Remove from inventory'
            });
          } else if (daysUntilExpiry <= 7) {
            generatedAlerts.push({
              id: `expiring-${batch.batchId}`,
              type: 'expiring',
              title: `Batch Expiring Soon: ${product.productName || 'Unknown Product'}`,
              message: `Batch ${batch.batchNumber} expires in ${daysUntilExpiry} days`,
              timestamp: now,
              productId: product._id,
              batchId: batch.batchId,
              severity: 'warning',
              icon: ClockIcon,
              action: 'Plan clearance sale'
            });
          }
        }
      });

      // High stock alert (potential overstock)
      if (totalQuantity > 1000) {
        generatedAlerts.push({
          id: `high-${product._id}`,
          type: 'overstock',
          title: `High Stock Level: ${product.productName || 'Unknown Product'}`,
          message: `${totalQuantity} units in stock (potentially overstocked)`,
          timestamp: now,
          productId: product._id,
          severity: 'info',
          icon: ChartBarIcon,
          action: 'Review demand forecast'
        });
      }
    });

    // Sort by severity: critical > warning > info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    generatedAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    setAlerts(generatedAlerts);
  };

  const getFilteredAlerts = () => {
    if (filter === 'all') return alerts;
    if (filter === 'critical') return alerts.filter(alert => alert.severity === 'critical');
    if (filter === 'low') return alerts.filter(alert => alert.type === 'low' || alert.type === 'critical');
    if (filter === 'expired') return alerts.filter(alert => alert.type === 'expired' || alert.type === 'expiring');
    return alerts;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'info': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const dismissAlert = (alertId) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };

  const filteredAlerts = getFilteredAlerts();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BellIcon className="w-8 h-8 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Alerts</h1>
            <p className="text-gray-600">Monitor critical inventory levels and expiry dates</p>
          </div>
        </div>

        <button
          onClick={fetchStockAlerts}
          disabled={loading}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <BellIcon className="w-4 h-4" />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'all', label: 'All Alerts', count: alerts.length },
          { key: 'critical', label: 'Critical', count: alerts.filter(a => a.severity === 'critical').length },
          { key: 'low', label: 'Low Stock', count: alerts.filter(a => a.type === 'low' || a.type === 'critical').length },
          { key: 'expired', label: 'Expiry', count: alerts.filter(a => a.type === 'expired' || a.type === 'expiring').length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${filter === tab.key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${filter === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'
                }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading alerts...</span>
        </div>
      )}

      {/* Alerts List */}
      {!loading && (
        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Alerts</h3>
              <p className="text-gray-600">
                {filter === 'all'
                  ? 'Great! All your inventory levels are within normal ranges.'
                  : `No ${filter} alerts at this time.`
                }
              </p>
            </div>
          ) : (
            filteredAlerts.map(alert => {
              const IconComponent = alert.icon;
              return (
                <div
                  key={alert.id}
                  className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <IconComponent className={`w-6 h-6 mt-0.5 ${getSeverityIcon(alert.severity)}`} />
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{alert.title}</h3>
                        <p className="text-gray-600 mt-1">{alert.message}</p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-sm text-gray-500">
                            {alert.timestamp.toLocaleString()}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${alert.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                            }`}>
                            {alert.severity}
                          </span>
                        </div>
                        {alert.action && (
                          <div className="mt-3">
                            <span className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-white border border-gray-300 text-gray-700">
                              Recommended: {alert.action}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Summary Statistics */}
      {!loading && alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {alerts.filter(a => a.severity === 'critical').length}
              </div>
              <div className="text-sm text-gray-600">Critical Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {alerts.filter(a => a.severity === 'warning').length}
              </div>
              <div className="text-sm text-gray-600">Warning Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {alerts.filter(a => a.type === 'low' || a.type === 'critical').length}
              </div>
              <div className="text-sm text-gray-600">Low Stock Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {alerts.filter(a => a.type === 'expired' || a.type === 'expiring').length}
              </div>
              <div className="text-sm text-gray-600">Expiry Issues</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAlerts;
