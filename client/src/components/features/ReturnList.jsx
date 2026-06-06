import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ClipboardCheck,
  Eye,
  PackageOpen,
  RotateCcw,
  Truck,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchAllReturns, initiateReturn, scheduleReturnPickup, markReturnPickedUp, processReturn } from '../../app/slices/returnSlice';
import { ROUTES } from '../../constants';
import ReturnInitiateModal from './ReturnInitiateModal';
import SchedulePickupModal from './SchedulePickupModal';
import MarkPickedUpModal from './MarkPickedUpModal';
import ProcessReturnModal from './ProcessReturnModal';

const statusClasses = {
  initiated: 'bg-amber-50 text-amber-700 ring-amber-200',
  pickup_scheduled: 'bg-blue-50 text-blue-700 ring-blue-200',
  picked_up: 'bg-violet-50 text-violet-700 ring-violet-200',
  received: 'bg-green-50 text-green-700 ring-green-200',
  processed: 'bg-gray-100 text-gray-700 ring-gray-200',
};

const tableHeadingClass = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500';
const tableCellClass = 'px-4 py-3 align-top text-sm text-gray-700';
const inputClass = 'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const getCompactId = (id) => {
  if (!id) {
    return '-';
  }

  if (id.length <= 12) {
    return id;
  }

  return `${id.slice(0, 8)}...${id.slice(-4)}`;
};

const getDocumentId = value => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return value._id || value.id || '';
};

const getRouteWithQuery = (route, params) => {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );

  return query.toString() ? `${route}?${query.toString()}` : route;
};

const getTransportDetailsHref = transportId => (
  ROUTES.TRANSPORT_DETAILS.replace(':id', encodeURIComponent(transportId))
);

const getReturnDisplayNumber = (returnRecord) => (
  returnRecord?.returnNumber || getCompactId(returnRecord?._id)
);

const formatReturnStatus = (status) => (
  status ? status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '-'
);

const formatCurrency = (amount) => (
  typeof amount === 'number'
    ? amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
    : '-'
);

const getStatusChip = (status) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses[status] || 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
    {formatReturnStatus(status)}
  </span>
);

const getFetchParams = ({ page, limit, status }) => {
  const params = { page, limit };
  if (status) params.status = status;
  return params;
};

const ReturnList = () => {
  const dispatch = useDispatch();
  const { returns, loading, error } = useSelector(state => state.returns);
  const [searchParams] = useSearchParams();
  // Pagination and filter state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showInitiate, setShowInitiate] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [pickupModalId, setPickupModalId] = useState(null);
  const [pickedUpModalId, setPickedUpModalId] = useState(null);
  const [processModalId, setProcessModalId] = useState(null);
  const initialOrderId = searchParams.get('orderId') || '';
  const initialPackageId = searchParams.get('packageId') || '';
  const statusCounts = useMemo(() => (
    (returns || []).reduce((counts, returnRecord) => {
      const key = returnRecord.returnStatus || 'unknown';
      return { ...counts, [key]: (counts[key] || 0) + 1 };
    }, {})
  ), [returns]);

  useEffect(() => {
    const params = getFetchParams({ page, limit, status });
    dispatch(fetchAllReturns(params)).then(res => {
      if (res.payload && typeof res.payload.totalPages === 'number') setTotalPages(res.payload.totalPages);
      if (res.payload && typeof res.payload.total === 'number') setTotal(res.payload.total);
    });
  }, [dispatch, page, limit, status]);

  useEffect(() => {
    if (searchParams.get('action') === 'initiate') {
      setModalError('');
      setShowInitiate(true);
    }

    const statusParam = searchParams.get('status');
    if (statusParam) {
      setStatus(currentStatus => {
        if (currentStatus === statusParam) {
          return currentStatus;
        }

        setPage(1);
        return statusParam;
      });
    }
  }, [searchParams]);


  const handleInitiateReturn = async (data) => {
    setModalLoading(true);
    setModalError('');
    try {
      await dispatch(initiateReturn(data)).unwrap();
      setShowInitiate(false);
      setModalError('');
    } catch (err) {
      setModalError(err || 'Failed to initiate return');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
            <RotateCcw className="h-3.5 w-3.5" />
            Reverse lifecycle
          </div>
          <h1 className="text-3xl font-semibold text-gray-950">Returns</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Schedule pickups, confirm handoff, and process returned stock back at the warehouse.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="returns-status-filter">Filter returns by status</label>
          <select
            id="returns-status-filter"
            className={inputClass}
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="initiated">Initiated</option>
            <option value="pickup_scheduled">Pickup Scheduled</option>
            <option value="picked_up">Picked Up</option>
            <option value="received">Received</option>
            <option value="processed">Processed</option>
          </select>
          <label className="sr-only" htmlFor="returns-page-size">Rows per page</label>
          <select
            id="returns-page-size"
            className={inputClass}
            value={limit}
            onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
          >
            {[10, 20, 50, 100].map(l => <option key={l} value={l}>{l} / page</option>)}
          </select>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            onClick={() => {
              setModalError('');
              setShowInitiate(true);
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Initiate return
          </button>
        </div>
      </div>
      {showInitiate && (
        <ReturnInitiateModal
          onClose={() => {
            setShowInitiate(false);
            setModalError('');
          }}
          onSubmit={handleInitiateReturn}
          submitError={modalError}
          submitting={modalLoading}
          initialOrderId={initialOrderId}
          initialPackageId={initialPackageId}
        />
      )}
      {pickupModalId && (
        <SchedulePickupModal
          returnId={pickupModalId}
          onClose={() => setPickupModalId(null)}
          onSuccess={() => {
            setPickupModalId(null);
            dispatch(fetchAllReturns(getFetchParams({ page, limit, status })));
          }}
        />
      )}
      {pickedUpModalId && (
        <MarkPickedUpModal
          returnId={pickedUpModalId}
          onClose={() => setPickedUpModalId(null)}
          onSuccess={() => {
            setPickedUpModalId(null);
            dispatch(fetchAllReturns(getFetchParams({ page, limit, status })));
          }}
        />
      )}
      {processModalId && (
        <ProcessReturnModal
          returnId={processModalId}
          onClose={() => setProcessModalId(null)}
          onSuccess={() => {
            setProcessModalId(null);
            dispatch(fetchAllReturns(getFetchParams({ page, limit, status })));
          }}
        />
      )}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-semibold">Returns could not be loaded</div>
            <div className="mt-1">{typeof error === 'string' ? error : (error?.message || 'An error occurred')}</div>
          </div>
        </div>
      )}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Visible returns</div>
          <div className="mt-2 text-2xl font-semibold text-gray-950">{returns?.length || 0}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Awaiting pickup</div>
          <div className="mt-2 text-2xl font-semibold text-blue-700">{statusCounts.initiated || 0}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ready to process</div>
          <div className="mt-2 text-2xl font-semibold text-violet-700">{statusCounts.picked_up || 0}</div>
        </div>
      </div>
      <div className="sr-only" aria-live="polite">
        Showing {returns?.length || 0} return records. Total returns available: {total}.
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center bg-gray-50">
            <div className="flex items-center gap-3 text-sm font-medium text-gray-600">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              Loading returns...
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className={tableHeadingClass}>Return</th>
              <th className={tableHeadingClass}>Package</th>
              <th className={tableHeadingClass}>Status</th>
              <th className={tableHeadingClass}>Reason</th>
              <th className={tableHeadingClass}>Items</th>
              <th className={tableHeadingClass}>Route</th>
              <th className={`${tableHeadingClass} text-right`}>Value</th>
              <th className={tableHeadingClass}>Processed By</th>
              <th className={tableHeadingClass}>Lifecycle action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {returns && returns.length > 0 ? returns.map(r => (
              <tr key={r._id} className="transition hover:bg-gray-50">
                <td className={`${tableCellClass} whitespace-nowrap`}>
                  <span className="font-mono font-semibold text-gray-950" title={r._id}>
                    {getReturnDisplayNumber(r)}
                  </span>
                  {r.returnNumber && (
                    <div className="mt-1 text-xs text-gray-500" title={r._id}>
                      ID {getCompactId(r._id)}
                    </div>
                  )}
                </td>
                <td className={`${tableCellClass} whitespace-nowrap`} title={typeof r.packageId === 'object' ? `ID: ${r.packageId?.packageId || r.packageId?._id}` : r.packageId}>
                  <div className="font-medium text-gray-900">{r.packageId?.packageId || r.packageId}</div>
                  {typeof r.packageId === 'object' && typeof r.packageId.totalValue === 'number' && (
                    <div className="text-xs font-medium text-gray-500">Package value {formatCurrency(r.packageId.totalValue)}</div>
                  )}
                  {getDocumentId(r.orderId) && (
                    <Link
                      to={getRouteWithQuery(ROUTES.ORDERS, { orderId: getDocumentId(r.orderId) })}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      View order
                    </Link>
                  )}
                </td>
                <td className={`${tableCellClass} whitespace-nowrap`}>
                  {getStatusChip(r.returnStatus)}
                </td>
                <td className={`${tableCellClass} whitespace-nowrap capitalize`}>{r.returnReason?.replace('_', ' ') || '-'}</td>
                <td className={`${tableCellClass} min-w-64`}>
                  <div className="space-y-1">
                    {Array.isArray(r.returnedItems) && r.returnedItems.map((item, idx) => {
                      const price = item.productId && typeof item.productId === 'object' && item.productId.price ? item.productId.price : 0;
                      const value = price * (item.quantity || 0);
                      return (
                        <div key={idx} className="rounded-md bg-gray-50 px-2.5 py-1.5" title={`${item.productId?.productName || item.productId} (Batch: ${item.batchId?.batchNumber || item.batchId}) x ${item.quantity}`}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate font-medium text-gray-800">{item.productId?.productName || item.productId}</span>
                            <span className="shrink-0 text-xs font-semibold text-gray-500">x {item.quantity}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-gray-500">Batch {item.batchId?.batchNumber || item.batchId}</div>
                          {price > 0 && (
                            <div className="mt-0.5 text-xs font-semibold text-green-700">{formatCurrency(value)}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </td>
                <td className={`${tableCellClass} min-w-44`}>
                  <div className="font-medium text-gray-900" title={r.transportId?.transporterId?.fullName || r.transportId?.transporterId?.name || '-'}>
                    {r.transportId?.transporterId?.fullName || r.transportId?.transporterId?.name || '-'}
                  </div>
                  <div className="mt-1 text-xs text-gray-500" title={typeof r.warehouseId === 'object' ? (r.warehouseId?.warehouseName || r.warehouseId?._id) : (r.warehouseId || '-')}>
                    {typeof r.warehouseId === 'object' ? (r.warehouseId?.warehouseName || r.warehouseId?._id) : (r.warehouseId || '-')}
                  </div>
                  {getDocumentId(r.transportId) && (
                    <Link
                      to={getTransportDetailsHref(getDocumentId(r.transportId))}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View transport
                    </Link>
                  )}
                </td>
                <td className={`${tableCellClass} whitespace-nowrap text-right font-semibold text-gray-950`}>
                  {Array.isArray(r.returnedItems) && r.packageId && typeof r.packageId === 'object' && Array.isArray(r.packageId.allocatedItems)
                    ? (() => {
                      const priceMap = {};
                      r.packageId.allocatedItems.forEach(ai => {
                        const key = `${ai.productId?._id || ai.productId}-${ai.batchId?._id || ai.batchId}`;
                        let price = 0;
                        if (ai.productId && typeof ai.productId === 'object' && ai.productId.price) price = ai.productId.price;
                        priceMap[key] = price;
                      });
                      const total = r.returnedItems.reduce((sum, item) => {
                        let price = item.productId && typeof item.productId === 'object' && item.productId.price ? item.productId.price : 0;
                        if (!price) {
                          const key = `${item.productId?._id || item.productId}-${item.batchId?._id || item.batchId}`;
                          price = priceMap[key] || 0;
                        }
                        return sum + price * (item.quantity || 0);
                      }, 0);
                      return total > 0 ? formatCurrency(total) : '-';
                    })()
                    : '-'}
                </td>
                <td className={`${tableCellClass} whitespace-nowrap`} title={r.processedBy?.fullName || '-'}>
                  {r.processedBy?.fullName || '-'}
                </td>
                <td className={`${tableCellClass} whitespace-nowrap`}>
                  {r.returnStatus === 'initiated' && (
                    <button
                      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                      onClick={() => setPickupModalId(r._id)}
                    >
                      <Truck className="h-4 w-4" />
                      Schedule pickup
                    </button>
                  )}
                  {r.returnStatus === 'pickup_scheduled' && (
                    <button
                      className="inline-flex items-center gap-2 rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
                      onClick={() => setPickedUpModalId(r._id)}
                    >
                      <PackageOpen className="h-4 w-4" />
                      Mark picked up
                    </button>
                  )}
                  {r.returnStatus === 'picked_up' && (
                    <button
                      className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
                      onClick={() => setProcessModalId(r._id)}
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      Process at warehouse
                    </button>
                  )}
                  {!['initiated', 'pickup_scheduled', 'picked_up'].includes(r.returnStatus) && (
                    <span className="text-xs font-medium text-gray-500">No action needed</span>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="9" className="px-4 py-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <RotateCcw className="h-10 w-10 text-gray-400" />
                    <h3 className="mt-3 text-sm font-semibold text-gray-900">No returns found</h3>
                    <p className="mt-1 max-w-sm text-sm text-gray-500">
                      Returns matching the current filters will appear here.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {status && (
                        <button
                          type="button"
                          onClick={() => {
                            setStatus('');
                            setPage(1);
                          }}
                          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          Clear status
                        </button>
                      )}
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                        onClick={() => {
                          setModalError('');
                          setShowInitiate(true);
                        }}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Initiate return
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-gray-600 text-sm">Total: {total}</div>
        <div className="flex gap-2 items-center">
          <button
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          <span className="text-sm text-gray-700">Page {page} of {totalPages}</span>
          <button
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnList;
