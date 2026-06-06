import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ExclamationTriangleIcon,
  BellIcon,
  ChartBarIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { inventoryAPI } from '../../services/api';

const DEFAULT_THRESHOLD_SETTINGS = {
  lowStockThreshold: 10,
  criticalStockThreshold: 5,
};

const getApiErrorMessage = (error, fallback) => (
  error.response?.data?.message || error.message || fallback
);

const getQuantity = (value) => {
  const quantity = Number(value);
  return Number.isFinite(quantity) ? quantity : 0;
};

const normalizeStockPolicy = (settings = DEFAULT_THRESHOLD_SETTINGS) => {
  const lowThreshold = Number(settings.lowStockThreshold);
  const criticalThreshold = Number(settings.criticalStockThreshold);

  return {
    lowStockThreshold: Number.isFinite(lowThreshold) && lowThreshold >= 0
      ? lowThreshold
      : DEFAULT_THRESHOLD_SETTINGS.lowStockThreshold,
    criticalStockThreshold: Number.isFinite(criticalThreshold) && criticalThreshold >= 0
      ? criticalThreshold
      : DEFAULT_THRESHOLD_SETTINGS.criticalStockThreshold,
  };
};

const buildStockAlerts = (inventoryItems, thresholdSettings) => {
  const generatedAlerts = [];
  const now = new Date();
  const stockPolicy = normalizeStockPolicy(thresholdSettings);

  inventoryItems.forEach(productItem => {
    const product = productItem.product || {};
    const totalQuantity = getQuantity(productItem.totalQuantity);
    const isCriticalStock = totalQuantity <= stockPolicy.criticalStockThreshold;

    // Low stock alert
    if (totalQuantity <= stockPolicy.lowStockThreshold) {
      generatedAlerts.push({
        id: `low-${product._id}`,
        type: isCriticalStock ? 'critical' : 'low',
        title: `Low Stock Alert: ${product.productName || 'Unknown Product'}`,
        message: `Only ${totalQuantity} units remaining. Local threshold: ${isCriticalStock ? stockPolicy.criticalStockThreshold : stockPolicy.lowStockThreshold} units.`,
        timestamp: now,
        productId: product._id,
        severity: isCriticalStock ? 'critical' : 'warning',
        icon: isCriticalStock ? ExclamationTriangleIcon : ArrowTrendingDownIcon,
        action: isCriticalStock ? 'Reorder immediately' : 'Review replenishment plan',
      });
    }

    (productItem.batches || []).forEach(batch => {
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
            action: 'Remove from inventory',
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
            action: 'Plan clearance sale',
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
        action: 'Review demand forecast',
      });
    }
  });

  const severityOrder = { critical: 0, warning: 1, info: 2 };
  return generatedAlerts.sort((a, b) => (
    (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99)
  ));
};

const StockAlerts = ({ thresholdSettings = DEFAULT_THRESHOLD_SETTINGS }) => {
  const [inventoryItems, setInventoryItems] = useState([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, critical, low, expired

  const fetchStockAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch inventory data to generate alerts
      const response = await inventoryAPI.getAllInventory();
      const items = response.data.products || [];
      setInventoryItems(Array.isArray(items) ? items : []);
      setDismissedAlertIds(new Set());
    } catch (err) {
      setError(getApiErrorMessage(err, 'Network error while fetching stock alerts.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStockAlerts();
  }, [fetchStockAlerts]);

  const stockPolicy = useMemo(
    () => normalizeStockPolicy(thresholdSettings),
    [thresholdSettings],
  );
  const allAlerts = useMemo(
    () => buildStockAlerts(inventoryItems, stockPolicy),
    [inventoryItems, stockPolicy],
  );
  const alerts = useMemo(() => (
    allAlerts.filter(alert => !dismissedAlertIds.has(alert.id))
  ), [allAlerts, dismissedAlertIds]);

  const filteredAlerts = useMemo(() => {
    if (filter === 'all') return alerts;
    if (filter === 'critical') return alerts.filter(alert => alert.severity === 'critical');
    if (filter === 'low') return alerts.filter(alert => alert.type === 'low' || alert.type === 'critical');
    if (filter === 'expired') return alerts.filter(alert => alert.type === 'expired' || alert.type === 'expiring');
    return alerts;
  }, [alerts, filter]);

  const alertCounts = useMemo(() => ({
    all: alerts.length,
    critical: alerts.filter(a => a.severity === 'critical').length,
    low: alerts.filter(a => a.type === 'low' || a.type === 'critical').length,
    expired: alerts.filter(a => a.type === 'expired' || a.type === 'expiring').length,
    warning: alerts.filter(a => a.severity === 'warning').length,
  }), [alerts]);

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
    setDismissedAlertIds((currentAlertIds) => {
      const nextAlertIds = new Set(currentAlertIds);
      nextAlertIds.add(alertId);
      return nextAlertIds;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-rose-50 p-2 text-rose-600">
            <BellIcon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Stock Alerts</h1>
            <p className="text-sm text-slate-600">Monitor critical inventory levels and expiry dates.</p>
          </div>
        </div>

        <button
          onClick={fetchStockAlerts}
          disabled={loading}
          className="flex w-fit items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          <BellIcon className="w-4 h-4" />
          <span>Refresh Alerts</span>
        </button>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <div className="font-semibold text-blue-900">Local alert policy is active</div>
        <p className="mt-1">
          Stock alerts use the AI Assistant threshold settings stored in this browser:
          {' '}critical at {stockPolicy.criticalStockThreshold} units and low stock at {stockPolicy.lowStockThreshold} units.
          Expiry and overstock rules still use the built-in demo rules.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {[
          { key: 'all', label: 'All Alerts', count: alertCounts.all },
          { key: 'critical', label: 'Critical', count: alertCounts.critical },
          { key: 'low', label: 'Low Stock', count: alertCounts.low },
          { key: 'expired', label: 'Expiry', count: alertCounts.expired },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex min-w-fit flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${filter === tab.key
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-xs ${filter === tab.key ? 'bg-white text-slate-900' : 'bg-slate-100 text-slate-600'
                }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="mr-2 h-5 w-5 text-rose-600" />
            <p className="text-rose-800">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-12 shadow-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <span className="ml-2 text-slate-600">Loading alerts...</span>
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white py-12 text-center shadow-sm">
              <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="mb-2 text-lg font-semibold text-slate-950">No Active Alerts</h3>
              <p className="text-slate-600">
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
                  className={`rounded-lg border p-4 shadow-sm ${getSeverityColor(alert.severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <IconComponent className={`w-6 h-6 mt-0.5 ${getSeverityIcon(alert.severity)}`} />
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-slate-950">{alert.title}</h3>
                        <p className="mt-1 text-slate-600">{alert.message}</p>
                        <div className="mt-2 flex items-center gap-4">
                          <span className="text-sm text-slate-500">
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
                            <span className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700">
                              Recommended: {alert.action}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="text-slate-400 hover:text-slate-600"
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

      {!loading && alerts.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-950">Alert Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {alertCounts.critical}
              </div>
              <div className="text-sm text-slate-600">Critical Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {alertCounts.warning}
              </div>
              <div className="text-sm text-slate-600">Warning Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {alertCounts.low}
              </div>
              <div className="text-sm text-slate-600">Low Stock Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {alertCounts.expired}
              </div>
              <div className="text-sm text-slate-600">Expiry Issues</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAlerts;
