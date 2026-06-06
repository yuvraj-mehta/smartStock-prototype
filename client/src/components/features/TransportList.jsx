import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  Package,
  Search,
  Send,
  Truck,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchAllTransports, updateTransportStatus } from '../../app/slices/transportSlice';
import { ROUTES } from '../../constants';

const TRANSPORT_STATUS_LABELS = {
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  delivered: 'Delivered',
};

const statusClasses = {
  dispatched: 'bg-green-50 text-green-700 ring-green-200',
  in_transit: 'bg-amber-50 text-amber-700 ring-amber-200',
  delivered: 'bg-blue-50 text-blue-700 ring-blue-200',
};

const typeClasses = {
  forward: 'bg-gray-100 text-gray-700 ring-gray-200',
  reverse: 'bg-amber-50 text-amber-700 ring-amber-200',
};

const NEXT_FORWARD_STATUS_BY_CURRENT = {
  dispatched: 'in_transit',
  in_transit: 'delivered',
};

const tableHeadingClass = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500';
const tableCellClass = 'px-4 py-3 align-top text-sm text-gray-700';
const fieldClass = 'rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50';

const getStatusLabel = (status) => TRANSPORT_STATUS_LABELS[status] || status || '-';

const isReverseTransport = (transport) => transport?.transportType === 'reverse';

const getTransportDisplayId = (transport) => (
  transport?.trackingNumber || transport?._id || '-'
);

const getPackageDisplayId = (transport) => (
  transport?.packageId?.packageId || transport?.packageId?._id || transport?.packageId || '-'
);

const getNextForwardStatus = (transport) => {
  if (isReverseTransport(transport)) {
    return null;
  }

  return NEXT_FORWARD_STATUS_BY_CURRENT[transport?.status] || null;
};

const getStatusChip = (status) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses[status] || 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
    {getStatusLabel(status)}
  </span>
);

const getTypeChip = (type) => (
  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${typeClasses[type] || 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
    {type || '-'}
  </span>
);

const getTransportDetailsHref = transportId => (
  ROUTES.TRANSPORT_DETAILS.replace(':id', encodeURIComponent(transportId))
);

const TransportList = () => {
  const dispatch = useDispatch();
  const { transports, loading, error } = useSelector(state => state.transport);
  const user = useSelector(state => state.auth.user);
  const [searchParams] = useSearchParams();
  const [statusUpdates, setStatusUpdates] = useState({});
  const [notesUpdates, setNotesUpdates] = useState({});
  const [actionErrors, setActionErrors] = useState({});
  const [updatingId, setUpdatingId] = useState('');
  const canUpdateTransport = user?.role === 'admin' || user?.role === 'staff';

  // Client-side features
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    dispatch(fetchAllTransports({ page: 1, limit: 1000 })); // fetch all for client-side features
  }, [dispatch]);

  useEffect(() => {
    const packageId = searchParams.get('packageId');
    const trackingNumber = searchParams.get('trackingNumber');
    const statusParam = searchParams.get('status');
    const typeParam = searchParams.get('type');

    if (packageId || trackingNumber) {
      setSearch(packageId || trackingNumber);
      setPage(1);
    }

    if (statusParam) {
      setStatusFilter(currentStatus => {
        if (currentStatus === statusParam) {
          return currentStatus;
        }

        setPage(1);
        return statusParam;
      });
    }

    if (typeParam) {
      setTypeFilter(currentType => {
        if (currentType === typeParam) {
          return currentType;
        }

        setPage(1);
        return typeParam;
      });
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    let nextTransports = Array.isArray(transports) ? transports : [];
    if (search) {
      const s = search.toLowerCase();
      nextTransports = nextTransports.filter(t => (
        String(t?._id || '').toLowerCase().includes(s) ||
        String(t?.trackingNumber || '').toLowerCase().includes(s) ||
        String(t?.status || '').toLowerCase().includes(s) ||
        String(t?.transportType || '').toLowerCase().includes(s) ||
        String(t?.transporterId?.fullName || '').toLowerCase().includes(s) ||
        String(t?.transporterId?.companyName || '').toLowerCase().includes(s) ||
        String(t?.packageId?._id || '').toLowerCase().includes(s) ||
        String(typeof t?.packageId === 'string' ? t.packageId : '').toLowerCase().includes(s) ||
        String(t?.packageId?.packageId || '').toLowerCase().includes(s)
      ));
    }
    if (statusFilter) nextTransports = nextTransports.filter(t => t.status === statusFilter);
    if (typeFilter) nextTransports = nextTransports.filter(t => t.transportType === typeFilter);
    return nextTransports;
  }, [search, statusFilter, transports, typeFilter]);

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const statusOptions = useMemo(() => Array.from(new Set((transports || []).map(t => t.status))).filter(Boolean), [transports]);
  const typeOptions = useMemo(() => Array.from(new Set((transports || []).map(t => t.transportType))).filter(Boolean), [transports]);

  const handleTransportUpdate = async (event, transport) => {
    event.preventDefault();

    if (isReverseTransport(transport)) {
      setActionErrors(current => ({
        ...current,
        [transport._id]: 'Reverse return transports must be advanced from the Returns lifecycle.',
      }));
      return;
    }

    const nextStatus = statusUpdates[transport._id];
    if (!nextStatus) {
      setActionErrors(current => ({
        ...current,
        [transport._id]: 'Choose the next delivery status before updating.',
      }));
      return;
    }

    setUpdatingId(transport._id);
    setActionErrors(current => ({ ...current, [transport._id]: '' }));

    try {
      await dispatch(updateTransportStatus({
        id: transport._id,
        status: nextStatus,
        notes: notesUpdates[transport._id] || '',
      })).unwrap();
      setStatusUpdates(current => ({ ...current, [transport._id]: '' }));
      setNotesUpdates(current => ({ ...current, [transport._id]: '' }));
      await dispatch(fetchAllTransports({ page: 1, limit: 1000 })).unwrap();
    } catch (updateError) {
      setActionErrors(current => ({
        ...current,
        [transport._id]: updateError?.message || updateError || 'Failed to update transport status.',
      }));
    } finally {
      setUpdatingId('');
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[320px] max-w-7xl items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-5 py-4 text-sm font-medium text-gray-600 shadow-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Loading transports...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <div className="font-semibold">Transports could not be loaded</div>
            <div className="mt-1">{error.message || error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
            <Truck className="h-3.5 w-3.5" />
            Delivery operations
          </div>
          <h1 className="text-3xl font-semibold text-gray-950">Transports</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-600">
            Track forward deliveries and route reverse pickups back through the returns lifecycle.
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
          <span className="font-semibold text-gray-950">{total}</span> visible transports
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_160px_auto] lg:items-center">
          <div className="relative">
            <label className="sr-only" htmlFor="transport-search">Search transports</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="transport-search"
              type="text"
              placeholder="Search ID, transporter, package..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className={`${fieldClass} w-full pl-9`}
            />
          </div>
        <label className="sr-only" htmlFor="transport-status-filter">Filter transports by status</label>
        <select
          id="transport-status-filter"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            className={fieldClass}
        >
          <option value="">All Statuses</option>
          {statusOptions.map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
        </select>
        <label className="sr-only" htmlFor="transport-type-filter">Filter transports by type</label>
        <select
          id="transport-type-filter"
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
            className={fieldClass}
        >
          <option value="">All Types</option>
          {typeOptions.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <div className="flex items-center gap-2 lg:justify-end">
          <label className="text-sm text-gray-600" htmlFor="transport-page-size">Rows per page:</label>
          <select
            id="transport-page-size"
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className={fieldClass}
          >
            {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        </div>
      </div>
      <div className="sr-only" aria-live="polite">
        Showing {paginated.length} of {total} matching transport records.
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className={tableHeadingClass}>Transport</th>
              <th className={tableHeadingClass}>Status</th>
              <th className={tableHeadingClass}>Type</th>
              <th className={tableHeadingClass}>Transporter</th>
              <th className={tableHeadingClass}>Package</th>
              <th className={tableHeadingClass}>Lifecycle action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {paginated && paginated.length > 0 ? paginated.map(t => {
              const nextStatus = getNextForwardStatus(t);
              const reverseTransport = isReverseTransport(t);
              const canUpdateThisTransport = canUpdateTransport && !reverseTransport && Boolean(nextStatus);

              return (
                <tr key={t._id} className="transition hover:bg-gray-50">
                  <td className={tableCellClass} title={t._id}>
                    <div className="font-mono text-sm font-semibold text-gray-950">{getTransportDisplayId(t)}</div>
                    <div className="mt-1 text-xs text-gray-500">ID {String(t._id || '').slice(-8) || '-'}</div>
                  </td>
                  <td className={tableCellClass}>
                    {getStatusChip(t.status)}
                  </td>
                  <td className={tableCellClass}>{getTypeChip(t.transportType)}</td>
                  <td className={tableCellClass}>
                    <div className="font-medium text-gray-900">{t.transporterId?.fullName || t.transporterId?.companyName || '-'}</div>
                    {t.transporterId?.phoneNumber && <div className="mt-1 text-xs text-gray-500">{t.transporterId.phoneNumber}</div>}
                  </td>
                  <td className={tableCellClass}>
                    <div className="flex items-center gap-2 font-medium text-gray-900">
                      <Package className="h-4 w-4 text-gray-400" />
                      {getPackageDisplayId(t)}
                    </div>
                  </td>
                  <td className={`${tableCellClass} min-w-80`}>
                    <Link to={getTransportDetailsHref(t._id)} className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
                      <Eye className="h-4 w-4" />
                      View
                    </Link>
                    {reverseTransport && (
                      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Reverse pickup status is controlled from Returns.
                        <Link to={ROUTES.RETURNS} className="ml-1 font-semibold text-amber-900 underline">
                          Manage return
                        </Link>
                      </div>
                    )}
                    {canUpdateTransport && !reverseTransport && !nextStatus && (
                      <div className="mt-3 text-xs font-medium text-gray-500">No further delivery updates are available.</div>
                    )}
                    {canUpdateThisTransport && (
                      <form
                        onSubmit={event => handleTransportUpdate(event, t)}
                        className="mt-3 grid gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 sm:grid-cols-[150px_minmax(180px,1fr)_auto]"
                      >
                        <select
                          value={statusUpdates[t._id] || ''}
                          onChange={e => setStatusUpdates(current => ({ ...current, [t._id]: e.target.value }))}
                          className={fieldClass}
                        >
                          <option value="">Next status</option>
                          <option value={nextStatus}>{getStatusLabel(nextStatus)}</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Notes"
                          value={notesUpdates[t._id] || ''}
                          onChange={e => setNotesUpdates(current => ({ ...current, [t._id]: e.target.value }))}
                          className={fieldClass}
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={updatingId === t._id || !statusUpdates[t._id]}
                        >
                          <Send className="h-4 w-4" />
                          {updatingId === t._id ? 'Updating...' : 'Update'}
                        </button>
                      </form>
                    )}
                    {actionErrors[t._id] && (
                      <div role="alert" className="mt-2 text-xs font-medium text-red-600">{actionErrors[t._id]}</div>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="6" className="px-4 py-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Truck className="h-10 w-10 text-gray-400" />
                    <h3 className="mt-3 text-sm font-semibold text-gray-900">No transports found</h3>
                    <p className="mt-1 max-w-sm text-sm text-gray-500">
                      Delivery records matching the current filters will appear here.
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {(search || statusFilter || typeFilter) && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearch('');
                            setStatusFilter('');
                            setTypeFilter('');
                            setPage(1);
                          }}
                          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          <Search className="h-4 w-4" />
                          Clear filters
                        </button>
                      )}
                      <Link
                        to={ROUTES.ORDERS}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                      >
                        <ClipboardList className="h-4 w-4" />
                        Assign from orders
                      </Link>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-600">
          Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {total}
        </div>
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

export default TransportList;
