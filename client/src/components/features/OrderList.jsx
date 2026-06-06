import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  PackageCheck,
  RotateCcw,
  Search,
  Send,
  Truck,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { getAllOrders, processOrder } from '../../services/orderService';
import { getPackagesByOrderId, updatePackageStatus } from '../../services/packageService';
import { assignTransport } from '../../services/transportService';
import { userAPI } from '../../services/api';

const statusClasses = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  processing: 'bg-blue-50 text-blue-700 ring-blue-200',
  packaged: 'bg-violet-50 text-violet-700 ring-violet-200',
  dispatched: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  delivered: 'bg-green-50 text-green-700 ring-green-200',
  returned: 'bg-red-50 text-red-700 ring-red-200',
  sale_confirmed: 'bg-gray-100 text-gray-700 ring-gray-200',
};

const packageStatusClasses = {
  ready_for_dispatch: 'bg-violet-50 text-violet-700 ring-violet-200',
  dispatched: 'bg-green-50 text-green-700 ring-green-200',
  in_transit: 'bg-amber-50 text-amber-700 ring-amber-200',
  delivered: 'bg-blue-50 text-blue-700 ring-blue-200',
  returned: 'bg-red-50 text-red-700 ring-red-200',
};

const tableHeadingClass = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500';
const tableCellClass = 'px-4 py-3 align-top text-sm text-gray-700';
const fieldClass = 'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50';
const lifecycleStatuses = ['pending', 'processing', 'packaged', 'dispatched', 'delivered', 'sale_confirmed', 'returned'];

const formatStatus = (status) => (
  status ? status.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) : '-'
);

const formatCurrency = (amount) => (
  typeof amount === 'number'
    ? amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
    : '-'
);

const formatDate = (date) => (
  date ? new Date(date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-'
);

const getStatusChip = (status, classes = statusClasses) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${classes[status] || 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
    {formatStatus(status)}
  </span>
);

const getRouteWithQuery = (route, params) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );

  return query.toString() ? `${route}?${query.toString()}` : route;
};

const getFinanceOrderHref = orderId => (
  `${getRouteWithQuery(ROUTES.FINANCE, { targetType: 'order', targetId: orderId })}#record-payment`
);

const getReturnInitiateHref = ({ orderId, packageId }) => (
  getRouteWithQuery(ROUTES.RETURNS, { action: 'initiate', orderId, packageId })
);

const getTransportPackageHref = packageId => (
  getRouteWithQuery(ROUTES.TRANSPORT, { packageId })
);

export default function OrderList({ products }) {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [orderPackages, setOrderPackages] = useState({}); // { [orderId]: packageDoc }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [packingId, setPackingId] = useState(null);
  const [packingNotes, setPackingNotes] = useState('');
  const [showPacking, setShowPacking] = useState(null); // orderId for which packing UI is shown
  const [packError, setPackError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');


  // Delivery logic (assign transport feature restored)
  const [showAssignTransport, setShowAssignTransport] = useState(null); // packageId for which assign UI is shown
  const [assignTransporterId, setAssignTransporterId] = useState('');
  const [assignTransportError, setAssignTransportError] = useState('');
  const [assigningTransport, setAssigningTransport] = useState(false);
  const [externalUsers, setExternalUsers] = useState([]);
  const productById = useMemo(() => {
    const map = new Map();
    (products || []).forEach(product => {
      if (product?._id) {
        map.set(product._id, product);
      }
    });
    return map;
  }, [products]);

  const statusFilterOptions = useMemo(() => (
    ['all', ...new Set([
      ...lifecycleStatuses,
      ...orders.map(order => order.orderStatus).filter(Boolean),
    ])]
  ), [orders]);

  const orderSummary = useMemo(() => {
    const counts = orders.reduce((summary, order) => {
      const status = order.orderStatus || 'unknown';
      return { ...summary, [status]: (summary[status] || 0) + 1 };
    }, {});
    const readyPackages = Object.values(orderPackages).filter(pkg => pkg?.packageStatus === 'ready_for_dispatch').length;

    return {
      total: orders.length,
      active: ['pending', 'processing', 'packaged', 'dispatched'].reduce((sum, status) => sum + (counts[status] || 0), 0),
      delivered: counts.delivered || 0,
      returned: counts.returned || 0,
      readyPackages,
      counts,
    };
  }, [orderPackages, orders]);

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();

    return orders.filter((order) => {
      const statusMatches = statusFilter === 'all' || order.orderStatus === statusFilter;
      if (!statusMatches) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        order._id,
        order.orderNumber,
        order.platformOrderId,
        order.orderStatus,
        order.createdBy?.fullName,
        order.notes,
      ].filter(Boolean).some(value => String(value).toLowerCase().includes(query));
    });
  }, [orderSearch, orders, statusFilter]);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (!orderId) {
      return;
    }

    setOrderSearch(orderId);
    setStatusFilter('all');
  }, [searchParams]);

  useEffect(() => {
    // Fetch only transporters for delivery assignment
    const fetchExternalUsers = async () => {
      try {
        const res = await userAPI.getAllExternalUsers('transporter');
        setExternalUsers(res.data?.externalUsers || res.data?.users || []);
      } catch {
        setExternalUsers([]);
      }
    };
    fetchExternalUsers();
  }, []);

  const handleShowAssignTransport = (packageId) => {
    setShowAssignTransport(packageId);
    setAssignTransporterId('');
    setAssignTransportError('');
  };

  const handleAssignTransport = async (packageId) => {
    setAssigningTransport(true);
    setAssignTransportError('');
    try {
      await assignTransport(packageId, assignTransporterId);
      await fetchOrders();
      setShowAssignTransport(null);
    } catch (err) {
      setAssignTransportError(err?.response?.data?.message || 'Failed to assign transporter');
    } finally {
      setAssigningTransport(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    setActionError('');
    try {
      const data = await getAllOrders({ fetchAll: true, limit: 100 });
      const ordersArr = Array.isArray(data) ? data : (Array.isArray(data.orders) ? data.orders : []);
      if (!Array.isArray(ordersArr)) {
        setError('Unexpected response from server.');
        setOrders([]);
      } else {
        setOrders(ordersArr);
      }
      if (data && data.message && !ordersArr.length) {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };


  // Fetch orders and their packages
  useEffect(() => {
    const fetchAll = async () => {
      await fetchOrders();
    };
    fetchAll();
  }, []);

  // Fetch packages for all orders when orders change (transport feature removed)
  useEffect(() => {
    const fetchPackages = async () => {
      if (!orders.length) return;
      const pkgs = {};
      await Promise.all(orders.map(async (order) => {
        try {
          const pkgRes = await getPackagesByOrderId(order._id);
          const packageDoc = Array.isArray(pkgRes.packages) ? pkgRes.packages[0] : (Array.isArray(pkgRes) ? pkgRes[0] : null);
          if (packageDoc && packageDoc._id) {
            pkgs[order._id] = packageDoc;
          }
        } catch { }
      }));
      setOrderPackages(pkgs);
    };
    fetchPackages();
  }, [orders]);

  // Removed transporter fetching logic

  const handleProcess = async (orderId) => {
    setProcessingId(orderId);
    setActionError('');
    try {
      await processOrder(orderId);
      await fetchOrders();
    } catch (err) {
      setActionError(err?.response?.data?.message || 'Failed to process order.');
    } finally {
      setProcessingId(null);
    }
  };

  // Packing logic
  const handleShowPacking = (orderId) => {
    setShowPacking(orderId);
    setPackingNotes('');
    setPackError('');
  };

  const handlePackOrder = async (orderId) => {
    setPackingId(orderId);
    setPackError('');
    try {
      // Get package for this order
      const pkgRes = await getPackagesByOrderId(orderId);
      const packageDoc = Array.isArray(pkgRes.packages) ? pkgRes.packages[0] : (Array.isArray(pkgRes) ? pkgRes[0] : null);
      if (!packageDoc || !packageDoc._id) {
        setPackError('No package found for this order.');
        setPackingId(null);
        return;
      }
      await updatePackageStatus(packageDoc._id, 'ready_for_dispatch', packingNotes);
      await fetchOrders();
      setShowPacking(null);
    } catch (err) {
      setPackError(err?.response?.data?.message || 'Failed to pack order');
    } finally {
      setPackingId(null);
    }
  };

  // Delivery logic removed

  // Mark in transit/delivered logic removed

  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Loading orders...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <div className="font-semibold">Orders could not be loaded</div>
          <div className="mt-1">{error}</div>
        </div>
      </div>
    );
  }

  if (!Array.isArray(orders) || orders.length === 0) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 text-center">
        <ClipboardList className="h-10 w-10 text-gray-400" />
        <h3 className="mt-3 text-sm font-semibold text-gray-900">No orders yet</h3>
        <p className="mt-1 max-w-sm text-sm text-gray-500">
          Created orders will appear here for processing, packing, and dispatch assignment.
        </p>
        <a
          href={ROUTES.ORDERS}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
        >
          <ClipboardList className="h-4 w-4" />
          Create order
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-semibold">Order action failed</div>
            <div className="mt-1">{actionError}</div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Total orders', value: orderSummary.total },
            { label: 'Active lifecycle', value: orderSummary.active },
            { label: 'Delivered', value: orderSummary.delivered },
            { label: 'Returned', value: orderSummary.returned },
            { label: 'Ready packages', value: orderSummary.readyPackages },
          ].map(metric => (
            <div key={metric.label} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{metric.label}</div>
              <div className="mt-1 text-xl font-semibold text-gray-950">{metric.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
          <label className="relative block">
            <span className="sr-only">Search orders</span>
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              className={`${fieldClass} pl-9`}
              value={orderSearch}
              onChange={event => setOrderSearch(event.target.value)}
              placeholder="Search order number, platform ID, creator, status, or notes"
            />
          </label>
          <select
            className={fieldClass}
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            aria-label="Filter orders by status"
          >
            {statusFilterOptions.map(status => (
              <option key={status} value={status}>
                {status === 'all'
                  ? `All statuses (${orderSummary.total})`
                  : `${formatStatus(status)} (${orderSummary.counts[status] || 0})`}
              </option>
            ))}
          </select>
        </div>
        <div className="sr-only" aria-live="polite">
          Showing {filteredOrders.length} of {orders.length} orders.
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className={tableHeadingClass}>Order</th>
            <th className={tableHeadingClass}>Status</th>
            <th className={tableHeadingClass}>Items</th>
            <th className={`${tableHeadingClass} text-right`}>Value</th>
            <th className={tableHeadingClass}>Created</th>
            <th className={tableHeadingClass}>Notes</th>
            <th className={tableHeadingClass}>Lifecycle action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {filteredOrders.length > 0 ? filteredOrders.map(order => (
            <tr key={order._id} className="transition hover:bg-gray-50">
              <td className={tableCellClass}>
                <div className="font-mono text-sm font-semibold text-gray-950">{order.orderNumber || '-'}</div>
                <div className="mt-1 text-xs text-gray-500">{order.platformOrderId || 'No platform ID'}</div>
              </td>
              <td className={tableCellClass}>
                {getStatusChip(order.orderStatus)}
              </td>
              <td className={`${tableCellClass} min-w-64`}>
                <div className="space-y-1">
                  {(Array.isArray(order.items) ? order.items : []).map((item, idx) => {
                    const productId = item.productId && item.productId._id ? item.productId._id : item.productId;
                    const product = productById.get(productId) || {};
                    let productLabel = '';
                    if (typeof product === 'object' && product !== null) {
                      productLabel = product.name || product.productName || product.sku || (typeof item.productId === 'string' ? item.productId : JSON.stringify(item.productId));
                    } else {
                      productLabel = typeof product === 'string' ? product : (typeof item.productId === 'string' ? item.productId : JSON.stringify(item.productId));
                    }
                    return (
                      <div key={idx} className="flex items-center justify-between gap-4 rounded-md bg-gray-50 px-2.5 py-1.5">
                        <span className="truncate font-medium text-gray-800">{productLabel}</span>
                        <span className="shrink-0 text-xs font-semibold text-gray-500">x {item.quantity}</span>
                      </div>
                    );
                  })}
                  {(!Array.isArray(order.items) || order.items.length === 0) && (
                    <div className="rounded-md bg-gray-50 px-2.5 py-1.5 text-sm text-gray-500">
                      No item rows
                    </div>
                  )}
                </div>
              </td>
              <td className={`${tableCellClass} text-right font-semibold text-gray-950`}>
                {formatCurrency(orderPackages[order._id]?.totalValue)}
              </td>
              <td className={tableCellClass}>
                <div className="font-medium text-gray-900">{order.createdBy?.fullName || '-'}</div>
                <div className="mt-1 text-xs text-gray-500">{formatDate(order.createdAt)}</div>
              </td>
              <td className={`${tableCellClass} max-w-56`}>
                <div className="line-clamp-2 text-gray-600" title={order.notes || ''}>{order.notes || '-'}</div>
              </td>
              <td className={`${tableCellClass} min-w-80`}>
                {order.orderStatus === 'pending' && (
                  <button
                    onClick={() => handleProcess(order._id)}
                    disabled={processingId === order._id}
                    className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Search className="h-4 w-4" />
                    {processingId === order._id ? 'Processing...' : 'Process order'}
                  </button>
                )}
                {order.orderStatus === 'processing' && (
                  <>
                    <button
                      onClick={() => handleShowPacking(order._id)}
                      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={packingId === order._id}
                    >
                      <PackageCheck className="h-4 w-4" />
                      Pack order
                    </button>
                    {showPacking === order._id && (
                      <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3">
                        <label className="sr-only" htmlFor={`packing-notes-${order._id}`}>Packing notes</label>
                        <textarea
                          id={`packing-notes-${order._id}`}
                          className={`${fieldClass} w-full`}
                          placeholder="Packing notes or special instructions"
                          value={packingNotes}
                          onChange={e => setPackingNotes(e.target.value)}
                          rows={2}
                        />
                        {packError && <div role="alert" className="mt-2 text-sm font-medium text-red-600">{packError}</div>}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() => handlePackOrder(order._id)}
                            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={packingId === order._id}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {packingId === order._id ? 'Packing...' : 'Confirm pack'}
                          </button>
                          <button
                            onClick={() => setShowPacking(null)}
                            className="rounded-md px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-white hover:text-gray-900"
                          >Cancel</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {order.orderStatus === 'packaged' && (() => {
                  const pkg = orderPackages[order._id];
                  if (!pkg) {
                    return getStatusChip('No Package', { 'No Package': 'bg-gray-100 text-gray-700 ring-gray-200' });
                  }
                  if (pkg.packageStatus === 'ready_for_dispatch') {
                    return <>
                      {getStatusChip(pkg.packageStatus, packageStatusClasses)}
                      <button
                        onClick={() => handleShowAssignTransport(pkg._id)}
                        className="ml-2 inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
                      >
                        <Truck className="h-4 w-4" />
                        Assign transport
                      </button>
                      {showAssignTransport === pkg._id && (
                        <div className="mt-3 rounded-md border border-green-200 bg-green-50 p-3">
                          <label className="sr-only" htmlFor={`assign-transporter-${pkg._id}`}>Select transporter</label>
                          <select
                            id={`assign-transporter-${pkg._id}`}
                            className={`${fieldClass} w-full`}
                            value={assignTransporterId}
                            onChange={e => setAssignTransporterId(e.target.value)}
                          >
                            <option value="">Select Transporter</option>
                            {externalUsers.map(user => (
                              <option key={user._id || user.id} value={user._id || user.id}>{user.fullName || user.name} {user.phoneNumber ? `(${user.phoneNumber})` : ''}</option>
                            ))}
                          </select>
                          {assignTransportError && <div role="alert" className="mt-2 text-sm font-medium text-red-600">{assignTransportError}</div>}
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              onClick={() => handleAssignTransport(showAssignTransport)}
                              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={assigningTransport || !assignTransporterId}
                            >
                              <Send className="h-4 w-4" />
                              {assigningTransport ? 'Assigning...' : 'Confirm assign'}
                            </button>
                            <button
                              onClick={() => setShowAssignTransport(null)}
                              className="rounded-md px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-white hover:text-gray-900"
                            >Cancel</button>
                          </div>
                        </div>
                      )}
                    </>;
                  }
                  return getStatusChip(pkg.packageStatus, packageStatusClasses);
                })()}
                {['dispatched', 'delivered', 'sale_confirmed', 'returned'].includes(order.orderStatus) && orderPackages[order._id]?._id && (
                  <Link
                    to={getTransportPackageHref(orderPackages[order._id]._id)}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    <Truck className="h-4 w-4" />
                    Track delivery
                  </Link>
                )}
                {['delivered', 'sale_confirmed'].includes(order.orderStatus) && (
                  <Link
                    to={getFinanceOrderHref(order._id)}
                    className="ml-2 inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <CreditCard className="h-4 w-4" />
                    Record payment
                  </Link>
                )}
                {['delivered', 'sale_confirmed'].includes(order.orderStatus) && orderPackages[order._id]?._id && (
                  <Link
                    to={getReturnInitiateHref({ orderId: order._id, packageId: orderPackages[order._id]._id })}
                    className="ml-2 inline-flex items-center gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Initiate return
                  </Link>
                )}
                {order.orderStatus === 'returned' && (
                  <Link
                    to={ROUTES.RETURNS}
                    className="ml-2 inline-flex items-center gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                  >
                    <RotateCcw className="h-4 w-4" />
                    View returns
                  </Link>
                )}
              </td>
            </tr>
          )) : (
            <tr>
              <td className="px-4 py-10 text-center text-sm text-gray-500" colSpan="7">
                <div className="flex flex-col items-center gap-3">
                  <span>No orders match the current filters.</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    onClick={() => {
                      setOrderSearch('');
                      setStatusFilter('all');
                    }}
                  >
                    <Search className="h-4 w-4" />
                    Clear filters
                  </button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      </div>
    </div>
  );
}
