import React from "react";
import Navbar from "../components/Navbar";
// import Footer from "../components/Footer"; // Uncomment if you have a Footer component
import { AlertTriangle, MapPin, TrendingUp, Package, Plus, ArrowUpRight, Activity } from 'lucide-react';
import { Link } from "react-router-dom";

// Dummy data for demonstration
const products = [
  { id: 1, name: "Product A", price: 120, reorder_point: 10 },
  { id: 2, name: "Product B", price: 80, reorder_point: 15 },
  { id: 3, name: "Product C", price: 200, reorder_point: 5 },
];
const locations = [
  { id: 1, name: "Warehouse 1" },
  { id: 2, name: "Warehouse 2" },
];
const inventoryData = [
  { id: 1, product: products[0], location: locations[0], quantity: 50 },
  { id: 2, product: products[1], location: locations[1], quantity: 8 },
  { id: 3, product: products[2], location: locations[0], quantity: 0 },
];
const alerts = [
  { id: 1, message: "Product B is low on stock!", severity: "high", created_at: new Date() },
  { id: 2, message: "Product C is out of stock!", severity: "critical", created_at: new Date() },
];

const DashboardPage = () => {
  // Calculate stats
  const totalProducts = products.length;
  const totalLocations = locations.length;
  const totalValue = inventoryData.reduce((sum, item) => sum + (item.quantity * item.product.price), 0);
  const lowStockCount = inventoryData.filter(item => item.quantity <= item.product.reorder_point).length;
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical' || alert.severity === 'high').length;
  const topProducts = inventoryData
    .map(item => ({ ...item, totalValue: item.quantity * item.product.price }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5);
  const recentAlerts = alerts.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600">Monitor your inventory performance and key metrics</p>
            </div>
            <div className="flex gap-3 mt-4 md:mt-0">
              <Link to="/inventory">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  View Inventory
                </button>
              </Link>
              <Link to="/ai-assistant">
                <button className="border border-blue-600 text-blue-600 px-4 py-2 rounded flex items-center">
                  <Activity className="h-4 w-4 mr-2" />
                  AI Assistant
                </button>
              </Link>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <StatsCard title="Total Products" value={totalProducts} icon={<Package />} trend="up" trendValue="5%" />
            <StatsCard title="Locations" value={totalLocations} icon={<MapPin />} trend="up" trendValue="2%" />
            <StatsCard title="Total Value" value={`$${totalValue.toLocaleString()}`} icon={<TrendingUp />} trend="up" trendValue="12%" />
            <StatsCard title="Low Stock Items" value={lowStockCount} icon={<AlertTriangle />} trend="down" trendValue="8%" variant="warning" />
            <StatsCard title="Critical Alerts" value={criticalAlerts} icon={<AlertTriangle />} trend="down" trendValue="3%" variant="danger" />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Top Products */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Top Products by Value</h2>
                <Link to="/inventory">
                  <button className="text-blue-600 flex items-center text-sm font-medium hover:underline">
                    View All <ArrowUpRight className="h-4 w-4 ml-1" />
                  </button>
                </Link>
              </div>
              <div className="space-y-4">
                {topProducts.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-gray-500">{item.location.name} • {item.quantity} units</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${item.totalValue.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">${item.product.price}/unit</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link to="/inventory">
                  <button className="w-full flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Product
                  </button>
                </Link>
                <Link to="/analytics">
                  <button className="w-full flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Generate Report
                  </button>
                </Link>
                <Link to="/ai-assistant">
                  <button className="w-full flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50">
                    <Activity className="h-4 w-4 mr-2" />
                    AI Forecast
                  </button>
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Alerts & Stock Levels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Alerts */}
            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Recent Alerts</h2>
                <span className="text-sm font-normal text-gray-500">{alerts.length} total</span>
              </div>
              <div className="space-y-3">
                {recentAlerts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No alerts at this time</p>
                  </div>
                ) : (
                  recentAlerts.map((alert) => (
                    <div key={alert.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <AlertTriangle className={`h-5 w-5 mt-0.5 ${alert.severity === 'critical' ? 'text-red-500' :
                          alert.severity === 'high' ? 'text-orange-500' : 'text-yellow-500'
                        }`} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {alert.severity} • {new Date(alert.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            {/* Stock Level Overview */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Stock Level Overview</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Healthy Stock</span>
                  <span className="text-sm text-gray-500">
                    {inventoryData.filter(item => item.quantity > item.product.reorder_point * 2).length} items
                  </span>
                </div>
                <div className="w-full h-2 bg-blue-100 rounded-full mb-2">
                  <div className="h-2 bg-blue-500 rounded-full" style={{ width: '70%' }} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Low Stock</span>
                  <span className="text-sm text-gray-500">{lowStockCount} items</span>
                </div>
                <div className="w-full h-2 bg-yellow-100 rounded-full mb-2">
                  <div className="h-2 bg-yellow-400 rounded-full" style={{ width: '20%' }} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Out of Stock</span>
                  <span className="text-sm text-gray-500">
                    {inventoryData.filter(item => item.quantity === 0).length} items
                  </span>
                </div>
                <div className="w-full h-2 bg-red-100 rounded-full">
                  <div className="h-2 bg-red-400 rounded-full" style={{ width: '10%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* <Footer /> */}
    </div>
  );
};

// Simple StatsCard component for demonstration
function StatsCard({ title, value, icon, trend, trendValue, variant }) {
  const trendColor =
    variant === "danger"
      ? "text-red-500"
      : variant === "warning"
        ? "text-yellow-500"
        : trend === "up"
          ? "text-green-500"
          : "text-gray-500";
  return (
    <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
      <div className="flex items-center mb-2">
        <span className="mr-2">{icon}</span>
        <span className={`text-xs font-semibold ${trendColor}`}>{trend === "up" ? "▲" : "▼"} {trendValue}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-500 font-medium">{title}</div>
    </div>
  );
}

export default DashboardPage;
