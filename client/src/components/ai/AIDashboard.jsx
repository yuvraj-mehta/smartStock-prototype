import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CpuChipIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { aiAPI } from '../../services/api';

const getApiErrorMessage = (error, fallback) => (
  error.response?.data?.message || error.message || fallback
);

const AIDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      const response = await aiAPI.getDashboard();
      const data = response.data;
      setDashboardData(data.data || data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch AI dashboard data'));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const refreshDashboard = async () => {
    setRefreshing(true);
    await fetchDashboardData({ showLoading: false });
    setRefreshing(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'inventory': return <ChartBarIcon className="w-5 h-5" />;
      case 'market': return <ArrowTrendingUpIcon className="w-5 h-5" />;
      case 'operations': return <CpuChipIcon className="w-5 h-5" />;
      default: return <InformationCircleIcon className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center rounded-lg border border-slate-200 bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-600">Loading AI insights...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
        <div className="flex">
          <XCircleIcon className="h-5 w-5 text-rose-500" />
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-rose-800">Error Loading AI Dashboard</h3>
            <p className="mt-2 text-sm text-rose-700">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-3 rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-blue-50 p-2 text-blue-600">
            <CpuChipIcon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Inventory Intelligence</h1>
            <p className="text-sm text-slate-600">Prioritized signals from forecast, alert, and cost-saving data.</p>
          </div>
        </div>
        <button
          onClick={refreshDashboard}
          disabled={refreshing}
          className="flex w-fit items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center">
            <ChartBarIcon className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Total Recommendations</p>
              <p className="text-2xl font-bold text-slate-950">{dashboardData?.summary?.totalRecommendations || 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Critical Items</p>
              <p className="text-2xl font-bold text-slate-950">{dashboardData?.summary?.criticalItems || 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center">
            <ArrowTrendingUpIcon className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Active Forecasts</p>
              <p className="text-2xl font-bold text-slate-950">{dashboardData?.summary?.activeForecasts || 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center">
            <CheckCircleIcon className="w-8 h-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Cost Savings</p>
              <p className="text-2xl font-bold text-slate-950">{dashboardData?.summary?.costSavingOpportunities || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-950">Recent Forecasts</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData?.recentForecasts?.length > 0 ? (
                dashboardData.recentForecasts.map((forecast) => (
                  <div key={forecast.id} className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 p-3">
                    <div>
                      <p className="font-medium text-slate-950">{forecast.productName}</p>
                      <p className="text-sm text-slate-600">Forecast: {forecast.forecastQuantity} units</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${forecast.confidence > 80 ? 'bg-green-100 text-green-800' :
                          forecast.confidence > 60 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                        {forecast.confidence}% confidence
                      </span>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(forecast.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-slate-500">No recent forecasts available</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-950">Critical Alerts</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData?.criticalAlerts?.length > 0 ? (
                dashboardData.criticalAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 rounded-md border border-slate-100 bg-slate-50 p-3">
                    <div className={`p-1 rounded-full ${getSeverityColor(alert.severity)}`}>
                      {getCategoryIcon(alert.category)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-slate-950">{alert.title}</p>
                      <p className="text-sm text-slate-600 capitalize">{alert.category}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-slate-500">No critical alerts</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {dashboardData?.insights?.recommendations && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-950">Recommendations</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {dashboardData.insights.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3 rounded-md border border-blue-100 bg-blue-50 p-3">
                  <CheckCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                  <p className="text-slate-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {dashboardData?.insights?.costSavingOpportunities && dashboardData.insights.costSavingOpportunities.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-950">Cost Saving Opportunities</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {dashboardData.insights.costSavingOpportunities.map((opportunity, index) => (
                <div key={index} className="flex items-start gap-3 rounded-md border border-emerald-100 bg-emerald-50 p-3">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-green-600 mt-0.5" />
                  <p className="text-slate-700">{opportunity}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-sm text-slate-500">
        Last updated: {dashboardData?.generatedAt ? new Date(dashboardData.generatedAt).toLocaleString() : 'Unknown'}
      </div>
    </div>
  );
};

export default AIDashboard;
