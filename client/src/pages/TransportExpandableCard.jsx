const statusClasses = {
  pending: 'bg-yellow-100 text-yellow-800',
  dispatched: 'bg-blue-100 text-blue-800',
  intransit: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  returned: 'bg-red-100 text-red-800',
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString();
};

const TransportExpandableCard = ({ transport, isExpanded, onToggleExpanded }) => {
  if (!transport) return null;

  const status = transport.status || 'pending';

  return (
    <article className="rounded-xl border border-blue-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="flex w-full flex-col gap-3 p-5 text-left md:flex-row md:items-center md:justify-between"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-gray-500">{transport.transportId || transport._id}</span>
            <span className={`rounded px-2 py-1 text-xs font-semibold ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
              {status}
            </span>
          </div>
          <h2 className="mt-2 text-lg font-bold text-blue-900">{transport.packageId || 'Unassigned package'}</h2>
          <p className="text-sm text-gray-600">
            {transport.startLocation || '-'} to {transport.endLocation || '-'}
          </p>
        </div>
        <span className="text-sm font-semibold text-blue-700">
          {isExpanded ? 'Hide details' : 'View details'}
        </span>
      </button>

      {isExpanded && (
        <div className="grid gap-4 border-t border-blue-50 p-5 text-sm text-gray-700 md:grid-cols-2">
          <div>
            <span className="font-semibold text-gray-900">Driver:</span> {transport.driverName || '-'}
          </div>
          <div>
            <span className="font-semibold text-gray-900">Vehicle:</span> {transport.vehicleNumber || '-'}
          </div>
          <div>
            <span className="font-semibold text-gray-900">Estimated delivery:</span> {formatDate(transport.estimatedDelivery)}
          </div>
          <div>
            <span className="font-semibold text-gray-900">Actual delivery:</span> {formatDate(transport.actualDelivery)}
          </div>
          <div>
            <span className="font-semibold text-gray-900">Distance:</span> {transport.distance || '-'}
          </div>
          <div>
            <span className="font-semibold text-gray-900">Created:</span> {formatDate(transport.createdAt)}
          </div>
        </div>
      )}
    </article>
  );
};

export default TransportExpandableCard;
