import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardList,
  Database,
  Package,
  RefreshCw,
  Users,
  Warehouse,
} from 'lucide-react';
import api, { inventoryAPI, productAPI, userAPI } from '../../../services/api';

const getCollection = (data, key) => {
  if (Array.isArray(data?.[key])) {
    return data[key];
  }

  return Array.isArray(data) ? data : [];
};

const getInventorySummary = (inventoryData) => {
  const inventoryProducts = getCollection(inventoryData, 'products');

  return {
    totalInventory: inventoryProducts.reduce((sum, item) => sum + (Number(item.totalQuantity) || 0), 0),
    lowStockItems: inventoryProducts.filter((item) => {
      const quantity = Number(item.totalQuantity) || 0;
      const threshold = Number(item.product?.thresholdLimit) || 0;
      return quantity > 0 && threshold > 0 && quantity <= threshold;
    }).length,
  };
};

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0);

const metricCardClass = 'rounded-lg border border-slate-200 bg-white p-4 shadow-sm';
const sectionCardClass = 'rounded-lg border border-slate-200 bg-white shadow-sm';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProducts: 0,
    totalInventory: 0,
    totalSales: 0,
    lowStockItems: 0,
    totalExternalUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [usersRes, productsRes, externalUsersRes, salesRes, inventoryRes] = await Promise.all([
        userAPI.getAllUsers(),
        productAPI.getAllProducts(),
        userAPI.getAllExternalUsers(),
        api.get('/sales/all').catch(() => ({ data: [] })),
        inventoryAPI.getAllInventory().catch(() => ({ data: [] })),
      ]);
      const inventorySummary = getInventorySummary(inventoryRes?.data);

      setStats({
        totalUsers: getCollection(usersRes?.data, 'users').length,
        totalProducts: getCollection(productsRes?.data, 'products').length,
        totalInventory: inventorySummary.totalInventory,
        totalSales: getCollection(salesRes?.data, 'sales').length,
        lowStockItems: inventorySummary.lowStockItems,
        totalExternalUsers: getCollection(externalUsersRes?.data, 'externalUsers').length,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const metricCards = useMemo(() => [
    {
      title: 'Internal Users',
      value: stats.totalUsers,
      icon: Users,
      description: 'Admin and staff accounts',
      link: '/admin?tab=users',
    },
    {
      title: 'Products',
      value: stats.totalProducts,
      icon: Package,
      description: 'Active catalog records',
      link: '/admin?tab=products',
    },
    {
      title: 'Inventory Units',
      value: stats.totalInventory,
      icon: Boxes,
      description: 'Units currently in stock',
      link: '/inventory',
    },
    {
      title: 'Low Stock',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      description: 'Products below threshold',
      link: '/inventory',
    },
    {
      title: 'Sales History',
      value: stats.totalSales,
      icon: ClipboardList,
      description: 'Confirmed sales records',
      link: '/orders',
    },
    {
      title: 'Partners',
      value: stats.totalExternalUsers,
      icon: Building2,
      description: 'Suppliers and transporters',
      link: '/admin?tab=external',
    },
  ], [stats]);

  const quickActions = [
    { label: 'Create user', detail: 'Provision internal warehouse access', to: '/admin?tab=users&action=create', icon: Users },
    { label: 'Add product', detail: 'Create a catalog item', to: '/admin?tab=products&action=create', icon: Package },
    { label: 'Add partner', detail: 'Register supplier or transporter', to: '/admin?tab=external&action=create', icon: Building2 },
    { label: 'Review inventory', detail: 'Inspect stock and supply intake', to: '/inventory', icon: Warehouse },
    { label: 'Manage orders', detail: 'Create or confirm order flows', to: '/orders', icon: ClipboardList },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        <p className="mt-4 text-sm font-medium text-slate-600">Loading admin metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-red-700" />
            <div>
              <h2 className="text-base font-semibold text-red-950">Admin dashboard unavailable</h2>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className={sectionCardClass}>
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Admin dashboard</h2>
            <p className="mt-1 text-sm text-slate-500">
              Live operational totals from users, products, inventory, sales history, and partner records.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchDashboardData}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {metricCards.map(({ title, value, icon: Icon, description, link }) => (
            <Link key={title} to={link} className={`${metricCardClass} transition hover:border-blue-200 hover:bg-slate-50`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-500">{title}</p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{formatNumber(value)}</p>
                  <p className="mt-1 text-sm text-slate-500">{description}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600">
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className={sectionCardClass}>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-950">Quick actions</h2>
            <p className="mt-1 text-sm text-slate-500">Jump into the main administrative workflows.</p>
          </div>
          <div className="grid gap-3 p-5 md:grid-cols-2">
            {quickActions.map(({ label, detail, to, icon: Icon }) => (
              <Link
                key={label}
                to={to}
                className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-slate-600 ring-1 ring-slate-200">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-950">{label}</span>
                  <span className="mt-1 block text-sm text-slate-500">{detail}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className={sectionCardClass}>
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-slate-950">System status</h2>
            <p className="mt-1 text-sm text-slate-500">Portfolio demo service health.</p>
          </div>
          <div className="space-y-3 p-5">
            {[
              { label: 'API server', value: 'Online', icon: CheckCircle2 },
              { label: 'Database', value: 'Connected', icon: Database },
              { label: 'Warehouse scope', value: 'Enforced', icon: Warehouse },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-700">
                  <Icon className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span className="truncate">{label}</span>
                </span>
                <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
