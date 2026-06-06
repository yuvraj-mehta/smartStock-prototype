import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  MapPin,
  Package,
  Plus,
  RotateCcw,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { ROUTES } from '../constants';
import { dashboardAPI } from '../services/api';

const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(Number(value) || 0);

const formatNumber = (value) => new Intl.NumberFormat('en-IN').format(Number(value) || 0);

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Today' : date.toLocaleDateString();
};

const getApiErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
);

const getTabRoute = (route, tab) => `${route}?tab=${tab}`;

function StatCard({ title, value, icon: Icon, tone = 'slate', detail }) {
  const tones = {
    slate: 'border-slate-200 text-slate-700 bg-slate-50',
    blue: 'border-blue-200 text-blue-700 bg-blue-50',
    amber: 'border-amber-200 text-amber-700 bg-amber-50',
    red: 'border-red-200 text-red-700 bg-red-50',
    emerald: 'border-emerald-200 text-emerald-700 bg-emerald-50',
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className={`rounded-md border p-2 ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {detail && <p className="mt-3 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, detail }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
      <Icon className="mx-auto h-7 w-7 text-slate-400" />
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

const DashboardPage = () => {
  const [products, setProducts] = useState([]);
  const [inventoryData, setInventoryData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dashboardErrors, setDashboardErrors] = useState([]);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      setDashboardErrors([]);
      const failures = [];
      const [inventoryResult, aiDashboardResult] = await Promise.allSettled([
        dashboardAPI.getInventory(),
        dashboardAPI.getAIDashboard(),
      ]);

      try {
        if (inventoryResult.status !== 'fulfilled') {
          throw inventoryResult.reason;
        }

        const inventory = inventoryResult.value.data || {};
        const inventoryProducts = Array.isArray(inventory.products) ? inventory.products : [];
        setProducts(inventoryProducts.map(p => p.product || {}));
        setInventoryData(
          inventoryProducts.flatMap((p) => {
            const product = p.product || {};

            return (Array.isArray(p.batches) ? p.batches : []).map(b => ({
              product,
              location: b.warehouse,
              quantity: Number(b.quantity) || 0,
              reorder_point: Number(product.reorder_point) || 10,
              totalValue: (Number(b.quantity) || 0) * (Number(product.price) || 0),
            }));
          }),
        );
        setTotalValue(inventory.totalInventoryValue || 0);
      } catch (err) {
        console.warn('Failed to fetch dashboard inventory:', err);
        failures.push({
          source: 'Inventory API',
          message: getApiErrorMessage(err, 'Inventory totals and batch tables could not be loaded.'),
        });
        setProducts([]);
        setInventoryData([]);
        setTotalValue(0);
      }

      try {
        if (aiDashboardResult.status !== 'fulfilled') {
          throw aiDashboardResult.reason;
        }

        const aiData = aiDashboardResult.value.data?.data || {};
        const alertItems = Array.isArray(aiData.criticalAlerts)
          ? aiData.criticalAlerts
          : Array.isArray(aiData.insights?.criticalItems)
            ? aiData.insights.criticalItems
            : [];
        setAlerts(
          alertItems.map((item, idx) => ({
            id: item.id || idx + 1,
            message: item.recommendation || item.title || 'Critical alert',
            severity: item.severity || 'high',
            created_at: item.generatedAt || item.createdAt || new Date(),
          })),
        );
      } catch (err) {
        console.warn('Failed to fetch AI dashboard alerts:', err);
        failures.push({
          source: 'AI dashboard API',
          message: getApiErrorMessage(err, 'AI alert signals could not be loaded.'),
        });
        setAlerts([]);
      }

      setDashboardErrors(failures);
      setLoading(false);
    }

    fetchDashboardData();
  }, []);

  const metrics = useMemo(() => {
    const warehouseNames = inventoryData
      .map(item => item.location?.warehouseName)
      .filter(Boolean);
    const outOfStockCount = inventoryData.filter(item => item.quantity === 0).length;
    const lowStockCount = inventoryData.filter(
      item => item.quantity > 0 && item.quantity <= item.reorder_point,
    ).length;
    const healthyStockCount = inventoryData.filter(item => item.quantity > item.reorder_point).length;
    const criticalAlerts = alerts.filter(
      alert => ['critical', 'high'].includes(String(alert.severity).toLowerCase()),
    ).length;

    return {
      totalProducts: products.length,
      totalLocations: new Set(warehouseNames).size,
      lowStockCount,
      outOfStockCount,
      healthyStockCount,
      criticalAlerts,
      totalUnits: inventoryData.reduce((sum, item) => sum + item.quantity, 0),
    };
  }, [alerts, inventoryData, products]);

  const topProducts = useMemo(() => (
    inventoryData
      .map(item => ({ ...item, totalValue: item.quantity * (Number(item.product.price) || 0) }))
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 6)
  ), [inventoryData]);

  const stockSegments = [
    { label: 'Healthy', value: metrics.healthyStockCount, color: 'bg-emerald-500' },
    { label: 'Low', value: metrics.lowStockCount, color: 'bg-amber-500' },
    { label: 'Out', value: metrics.outOfStockCount, color: 'bg-red-500' },
  ];
  const inventoryRows = Math.max(inventoryData.length, 1);
  const recentAlerts = alerts.slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-lg border border-slate-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operations command center</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">Warehouse dashboard</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Monitor stock value, location coverage, alert pressure, and the highest-value inventory batches from one working view.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to={getTabRoute(ROUTES.INVENTORY, 'overview')}
                className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <Package className="h-4 w-4" />
                Inventory
              </Link>
              <Link
                to={getTabRoute(ROUTES.ORDERS, 'manage')}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                <ClipboardList className="h-4 w-4" />
                Orders
              </Link>
              <Link
                to={ROUTES.FINANCE}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                <TrendingUp className="h-4 w-4" />
                Finance
              </Link>
            </div>
          </div>
        </section>

        {dashboardErrors.length > 0 && (
          <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <p className="font-semibold">Some dashboard data could not be loaded</p>
                <p className="mt-1 text-amber-800">
                  Visible metrics may be incomplete until these API responses recover.
                </p>
                <ul className="mt-2 space-y-1">
                  {dashboardErrors.map((failure) => (
                    <li key={failure.source}>
                      <span className="font-semibold">{failure.source}:</span> {failure.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Products" value={formatNumber(metrics.totalProducts)} icon={Package} detail={`${formatNumber(metrics.totalUnits)} units tracked`} />
          <StatCard title="Warehouses" value={formatNumber(metrics.totalLocations)} icon={MapPin} tone="blue" detail="Scoped to assigned access" />
          <StatCard title="Stock value" value={formatCurrency(totalValue)} icon={TrendingUp} tone="emerald" detail="From current inventory" />
          <StatCard title="Low stock" value={formatNumber(metrics.lowStockCount)} icon={AlertTriangle} tone="amber" detail={`${formatNumber(metrics.outOfStockCount)} out of stock`} />
          <StatCard title="Critical alerts" value={formatNumber(metrics.criticalAlerts)} icon={Activity} tone="red" detail={loading ? 'Refreshing signals' : 'Latest AI signal set'} />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(360px,0.8fr)]">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Top inventory value</h2>
                <p className="text-sm text-slate-500">Highest-value product batches by warehouse</p>
              </div>
              <Link to={getTabRoute(ROUTES.INVENTORY, 'stock')} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-slate-950">
                View all
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              {topProducts.length === 0 ? (
                <div className="p-5">
                  <EmptyState icon={Boxes} title="No inventory loaded" detail="Inventory batches will appear here after supplies are added." />
                </div>
              ) : (
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold text-slate-600">Product</th>
                      <th className="px-5 py-3 text-left font-semibold text-slate-600">Warehouse</th>
                      <th className="px-5 py-3 text-right font-semibold text-slate-600">Units</th>
                      <th className="px-5 py-3 text-right font-semibold text-slate-600">Unit price</th>
                      <th className="px-5 py-3 text-right font-semibold text-slate-600">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {topProducts.map((item, index) => (
                      <tr key={`${item.product._id || item.product.productName || index}-${item.location?._id || index}`} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                              {index + 1}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-950">{item.product.productName || item.product.name || 'Unnamed product'}</p>
                              <p className="text-xs text-slate-500">Reorder at {formatNumber(item.reorder_point)} units</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{item.location?.warehouseName || 'Unassigned'}</td>
                        <td className="px-5 py-4 text-right font-medium text-slate-800">{formatNumber(item.quantity)}</td>
                        <td className="px-5 py-4 text-right text-slate-600">{formatCurrency(item.product.price)}</td>
                        <td className="px-5 py-4 text-right font-semibold text-slate-950">{formatCurrency(item.totalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Stock health</h2>
                  <p className="text-sm text-slate-500">Batch-level inventory posture</p>
                </div>
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {formatNumber(inventoryData.length)} rows
                </span>
              </div>
              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="flex h-full w-full">
                  {stockSegments.map(segment => (
                    <div
                      key={segment.label}
                      className={segment.color}
                      style={{ width: `${(segment.value / inventoryRows) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {stockSegments.map(segment => (
                  <div key={segment.label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${segment.color}`} />
                      <span className="font-medium text-slate-700">{segment.label}</span>
                    </div>
                    <span className="text-slate-500">{formatNumber(segment.value)} batches</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">Work queue</h2>
                  <p className="text-sm text-slate-500">Fast access for daily warehouse actions</p>
                </div>
              </div>
              <div className="grid gap-2">
                {[
                  { to: getTabRoute(ROUTES.INVENTORY, 'add-supply'), label: 'Add supply', icon: Plus, meta: 'Receive new stock' },
                  { to: getTabRoute(ROUTES.ORDERS, 'manage'), label: 'Review orders', icon: ClipboardList, meta: 'Pack and fulfill' },
                  { to: ROUTES.TRANSPORT, label: 'Track transport', icon: Truck, meta: 'Outbound and return legs' },
                  { to: ROUTES.RETURNS, label: 'Process returns', icon: RotateCcw, meta: 'Disposition workflow' },
                ].map(({ to, label, icon: Icon, meta }) => (
                  <Link
                    key={to}
                    to={to}
                    className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-3 text-sm transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-slate-500" />
                      <span>
                        <span className="block font-semibold text-slate-800">{label}</span>
                        <span className="block text-xs text-slate-500">{meta}</span>
                      </span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-950">Recent alerts</h2>
              <p className="text-sm text-slate-500">Operational signals from inventory intelligence</p>
            </div>
            <span className="text-sm font-medium text-slate-500">{formatNumber(alerts.length)} total</span>
          </div>
          <div className="p-5">
            {recentAlerts.length === 0 ? (
              <EmptyState icon={AlertTriangle} title="No active alerts" detail="Critical AI alerts and stock warnings will appear here." />
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {recentAlerts.map((alert) => {
                  const severity = String(alert.severity).toLowerCase();
                  const severityClass = severity === 'critical'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : severity === 'high'
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600';

                  return (
                    <div key={alert.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-start gap-3">
                        <span className={`rounded-md border p-2 ${severityClass}`}>
                          <AlertTriangle className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">{alert.message}</p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                            {severity || 'signal'} - {formatDate(alert.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
