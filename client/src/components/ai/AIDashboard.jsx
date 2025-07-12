import React, { useState, useEffect } from 'react';
import { 
  ArrowTrendingUpIcon, 
  ExclamationTriangleIcon, 
  ChartBarIcon,
  CpuChipIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const AIDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/ai/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch AI dashboard data');
      }

      const data = await response.json();
      setDashboardData(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshDashboard = async () => {
    setRefreshing(true);
    await fetchDashboardData();
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
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading AI insights...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <XCircleIcon className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading AI Dashboard</h3>
            <p className="mt-2 text-sm text-red-700">{error}</p>
            <button 
              onClick={fetchDashboardData}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <CpuChipIcon className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Inventory Intelligence</h1>
            <p className="text-gray-600">ChatGPT-powered insights and recommendations</p>
          </div>
        </div>
        <button
          onClick={refreshDashboard}
          disabled={refreshing}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <ChartBarIcon className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Recommendations</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.summary?.totalRecommendations || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Critical Items</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.summary?.criticalItems || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <ArrowTrendingUpIcon className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Forecasts</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.summary?.activeForecasts || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <CheckCircleIcon className="w-8 h-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Cost Savings</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardData?.summary?.costSavingOpportunities || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Forecasts */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Recent AI Forecasts</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData?.recentForecasts?.length > 0 ? (
                dashboardData.recentForecasts.map((forecast) => (
                  <div key={forecast.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="font-medium text-gray-900">{forecast.productName}</p>
                      <p className="text-sm text-gray-600">Forecast: {forecast.forecastQuantity} units</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        forecast.confidence > 80 ? 'bg-green-100 text-green-800' :
                        forecast.confidence > 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {forecast.confidence}% confidence
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(forecast.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No recent forecasts available</p>
              )}
            </div>
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Critical Alerts</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData?.criticalAlerts?.length > 0 ? (
                dashboardData.criticalAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                    <div className={`p-1 rounded-full ${getSeverityColor(alert.severity)}`}>
                      {getCategoryIcon(alert.category)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{alert.title}</p>
                      <p className="text-sm text-gray-600 capitalize">{alert.category}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">No critical alerts</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      {dashboardData?.insights?.recommendations && (
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">AI Recommendations</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {dashboardData.insights.recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-md">
                  <CheckCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                  <p className="text-gray-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cost Saving Opportunities */}
      {dashboardData?.insights?.costSavingOpportunities && dashboardData.insights.costSavingOpportunities.length > 0 && (
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Cost Saving Opportunities</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {dashboardData.insights.costSavingOpportunities.map((opportunity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 rounded-md">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-green-600 mt-0.5" />
                  <p className="text-gray-700">{opportunity}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {dashboardData?.generatedAt ? new Date(dashboardData.generatedAt).toLocaleString() : 'Unknown'}
      </div>
    </div>
  );
};

export default AIDashboard;
