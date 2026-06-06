import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  Clock,
  CreditCard,
  Package,
  RotateCcw,
  Send,
  Truck,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { fetchTransportById, updateTransportStatus } from '../../app/slices/transportSlice';
import { ROUTES } from '../../constants';

const NEXT_FORWARD_STATUS_BY_CURRENT_STATUS = {
  dispatched: 'in_transit',
  in_transit: 'delivered',
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

const fieldClass = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50';

const getStatusLabel = (status) => (
  status ? status.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()) : '-'
);

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

const formatDate = (date) => (
  date ? new Date(date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-'
);

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

const getFinanceOrderHref = orderId => (
  `${getRouteWithQuery(ROUTES.FINANCE, { targetType: 'order', targetId: orderId })}#record-payment`
);

const getReturnInitiateHref = ({ orderId, packageId }) => (
  getRouteWithQuery(ROUTES.RETURNS, { action: 'initiate', orderId, packageId })
);

const TransportDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { transportDetails, loading, error } = useSelector(state => state.transport);
  const user = useSelector(state => state.auth.user);
  const canUpdateTransport = user?.role === 'admin' || user?.role === 'staff';
  const [notes, setNotes] = useState('');
  const [actionError, setActionError] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    dispatch(fetchTransportById(id));
  }, [dispatch, id]);

  const isReverseTransport = transportDetails?.transportType === 'reverse';
  const nextStatus = isReverseTransport
    ? null
    : NEXT_FORWARD_STATUS_BY_CURRENT_STATUS[transportDetails?.status];
  const relatedOrderId = getDocumentId(transportDetails?.packageId?.orderId);
  const relatedPackageId = getDocumentId(transportDetails?.packageId);
  const canStartPostDeliveryHandoffs = !isReverseTransport && transportDetails?.status === 'delivered';

  const details = useMemo(() => ([
    { label: 'Transport ID', value: transportDetails?.trackingNumber || transportDetails?._id || '-' },
    { label: 'Transporter', value: transportDetails?.transporterId?.fullName || transportDetails?.transporterId?.companyName || '-' },
    { label: 'Package', value: transportDetails?.packageId?.packageId || transportDetails?.packageId?._id || '-' },
    { label: 'Related order', value: relatedOrderId || '-' },
    { label: 'Current status', value: getStatusLabel(transportDetails?.status) },
  ]), [relatedOrderId, transportDetails]);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    setActionError('');
    setIsUpdating(true);
    try {
      await dispatch(updateTransportStatus({ id, status: nextStatus, notes })).unwrap();
      setNotes('');
      await dispatch(fetchTransportById(id)).unwrap();
    } catch (updateError) {
      setActionError(updateError?.message || updateError || 'Failed to update transport status.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[320px] max-w-7xl items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-5 py-4 text-sm font-medium text-gray-600 shadow-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          Loading transport details...
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
            <div className="font-semibold">Transport details could not be loaded</div>
            <div className="mt-1">{error.message || error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!transportDetails) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <Truck className="mx-auto h-10 w-10 text-gray-400" />
          <h2 className="mt-3 text-sm font-semibold text-gray-900">No details found</h2>
          <p className="mt-1 text-sm text-gray-500">This transport record may no longer exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link to={ROUTES.TRANSPORT} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-gray-950">
        <ArrowLeft className="h-4 w-4" />
        Back to transports
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
            <Truck className="h-3.5 w-3.5" />
            Transport record
          </div>
          <h2 className="text-3xl font-semibold text-gray-950">{transportDetails.trackingNumber || transportDetails._id}</h2>
          <p className="mt-2 text-sm text-gray-600">
            {transportDetails.transporterId?.fullName || transportDetails.transporterId?.companyName || 'Unassigned transporter'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {getStatusChip(transportDetails.status)}
          {getTypeChip(transportDetails.transportType)}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <h3 className="text-base font-semibold text-gray-950">Details</h3>
          </div>
          <div className="grid gap-px bg-gray-200 sm:grid-cols-2">
            {details.map(item => (
              <div key={item.label} className="bg-white px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.label}</div>
                <div className="mt-1 text-sm font-medium text-gray-950">{item.value}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold text-gray-950">Lifecycle action</h3>
          <p className="mt-1 text-sm text-gray-500">Forward deliveries can advance one status at a time.</p>
      {isReverseTransport ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Reverse return transports are controlled from the return lifecycle.
              <Link to={ROUTES.RETURNS} className="ml-1 font-semibold text-amber-900 underline">
            Manage return
          </Link>
        </div>
      ) : canUpdateTransport && nextStatus ? (
            <form onSubmit={handleStatusUpdate} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="transport-next-status">Next status</label>
                <select id="transport-next-status" name="status" value={nextStatus} className={`${fieldClass} mt-2`} disabled required>
                  <option value={nextStatus}>
                    {getStatusLabel(nextStatus)}
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="transport-status-notes">Notes</label>
                <textarea
                  id="transport-status-notes"
                  name="notes"
                  value={notes}
                  onChange={event => setNotes(event.target.value)}
                  className={`${fieldClass} mt-2 min-h-24 resize-y`}
                  placeholder="Optional notes"
                />
              </div>
              {actionError && (
                <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {actionError}
                </div>
              )}
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isUpdating}
              >
                <Send className="h-4 w-4" />
                {isUpdating ? 'Updating...' : 'Update status'}
              </button>
        </form>
      ) : !canUpdateTransport ? (
            <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Only admins and staff can update transport status.
            </div>
      ) : (
            <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
              No further status updates are available.
            </div>
      )}
          <div className="mt-5 border-t border-gray-200 pt-4">
            <h4 className="text-sm font-semibold text-gray-950">Related handoffs</h4>
            <div className="mt-3 flex flex-wrap gap-2">
              {relatedOrderId && (
                <Link
                  to={getRouteWithQuery(ROUTES.ORDERS, { orderId: relatedOrderId })}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  <ClipboardList className="h-4 w-4" />
                  View order
                </Link>
              )}
              {canStartPostDeliveryHandoffs && relatedOrderId && (
                <Link
                  to={getFinanceOrderHref(relatedOrderId)}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                >
                  <CreditCard className="h-4 w-4" />
                  Record payment
                </Link>
              )}
              {canStartPostDeliveryHandoffs && relatedPackageId && (
                <Link
                  to={getReturnInitiateHref({ orderId: relatedOrderId, packageId: relatedPackageId })}
                  className="inline-flex items-center gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100"
                >
                  <RotateCcw className="h-4 w-4" />
                  Initiate return
                </Link>
              )}
              {!relatedOrderId && !relatedPackageId && (
                <div className="text-sm text-gray-500">No related order or package handoff is available.</div>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h3 className="text-base font-semibold text-gray-950">Status history</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {transportDetails.statusHistory?.length ? transportDetails.statusHistory.map((h, idx) => (
            <div key={`${h.status}-${h.timestamp || idx}`} className="flex gap-3 px-5 py-4">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <Clock className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {getStatusChip(h.status)}
                  <span className="text-sm text-gray-500">{formatDate(h.timestamp)}</span>
                </div>
                {h.notes && <p className="mt-1 text-sm text-gray-600">{h.notes}</p>}
              </div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
              <Package className="h-10 w-10 text-gray-400" />
              <h4 className="mt-3 text-sm font-semibold text-gray-900">No status history</h4>
              <p className="mt-1 text-sm text-gray-500">Updates will appear here as the transport moves forward.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default TransportDetails;
