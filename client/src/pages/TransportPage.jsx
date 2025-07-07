
import React, { useEffect, useState } from 'react';
import TransportExpandableCard from './TransportExpandableCard';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  dispatched: 'bg-blue-100 text-blue-800',
  intransit: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  returned: 'bg-red-100 text-red-800',
};

const TransportStatusBadge = ({ status }) => (
  <span className={`px-2 py-1 rounded text-xs font-semibold ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
);


const TransportCard = ({ t, onShowDetails }) => {
  // Helper for mode icon
  const modeIcon = {
    land: (
      <span title="Land" className="inline-block mr-1 text-green-700">🚚</span>
    ),
    air: (
      <span title="Air" className="inline-block mr-1 text-blue-500">✈️</span>
    ),
    ship: (
      <span title="Ship" className="inline-block mr-1 text-indigo-700">🚢</span>
    ),
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-lg p-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between border border-blue-100 hover:shadow-xl transition-transform hover:scale-[1.015]">
      <div className="flex-1">
        <div className="flex flex-wrap gap-2 items-center mb-2">
          <span className="font-bold text-xl text-blue-900 tracking-wide">{t.packageId}</span>
          <span className="text-gray-400 text-xs">({t.trackingNumber})</span>
          <TransportStatusBadge status={t.status} />
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-gray-700 mb-2">
          <span><b>From:</b> <span className="text-blue-700">{t.location.from}</span></span>
          <span><b>To:</b> <span className="text-blue-700">{t.location.to}</span></span>
          <span><b>Mode:</b> {modeIcon[t.transportMode]}<span className="capitalize">{t.transportMode}</span></span>
        </div>
        <div className="flex flex-wrap gap-4 text-xs mt-2">
          <span className="bg-gray-100 rounded px-2 py-1">Products: <b>{t.products.length}</b></span>
          <span className="bg-gray-100 rounded px-2 py-1">Status History: <b>{t.statusHistory.length}</b></span>
        </div>
        {/* Product Preview */}
        <div className="mt-3 text-xs text-gray-600">
          <div className="font-semibold mb-1">Products Preview:</div>
          <div className="flex flex-wrap gap-1">
            {t.products.slice(0, 3).map((p, idx) => (
              <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {p.batchId?.productId?.productName || `Product ${idx + 1}`}
              </span>
            ))}
            {t.products.length > 3 && (
              <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded">
                +{t.products.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 md:mt-0 md:ml-6 flex flex-col gap-2 items-end">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold tracking-wide"
          onClick={() => onShowDetails(t)}
        >
          View Details
        </button>
      </div>
    </div>
  );
};

const TransportDetailsModal = ({ transport, onClose }) => {
  if (!transport) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-2xl relative">
        <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={onClose}>&times;</button>
        <h2 className="text-2xl font-bold mb-4">Transport Details</h2>
        <div className="mb-2"><b>Package ID:</b> {transport.packageId}</div>
        <div className="mb-2"><b>Tracking Number:</b> {transport.trackingNumber}</div>
        <div className="mb-2"><b>Status:</b> <TransportStatusBadge status={transport.status} /></div>
        <div className="mb-2"><b>From:</b> {transport.location.from} <b>To:</b> {transport.location.to}</div>
        <div className="mb-2"><b>Assigned To:</b> {transport.assignedTo.fullName} ({transport.assignedTo.email})</div>
        <div className="mb-2"><b>Transport Mode:</b> {transport.transportMode}</div>
        <div className="mb-2"><b>Cost:</b> ₹{transport.transportCost}</div>
        <div className="mb-2"><b>Weight:</b> {transport.totalWeight} kg</div>
        <div className="mb-2"><b>Volume:</b> {transport.totalVolume} m³</div>
        <div className="mb-2"><b>Value:</b> ₹{transport.totalValue}</div>
        <div className="mb-2"><b>Estimated Delivery:</b> {transport.estimatedDeliveryDate ? new Date(transport.estimatedDeliveryDate).toLocaleDateString() : '-'}</div>
        <div className="mb-4"><b>Products:</b>
          <ul className="list-disc ml-6">
            {transport.products.map((p, idx) => (
              <li key={idx} className="mb-1">
                <span className="font-semibold">{p.batchId?.productId?.productName || 'Product Name Not Available'}</span>
                <span className="text-gray-600"> (SKU: {p.batchId?.productId?.sku || 'N/A'})</span>
                <br />
                <span className="text-sm text-gray-600">Batch: {p.batchId?.batchNumber || p.batchId || 'N/A'}, Qty: {p.quantity}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <b>Status History:</b>
          <ul className="list-disc ml-6 mt-2">
            {transport.statusHistory.map((h, idx) => (
              <li key={idx} className="mb-1">
                <span className="font-semibold">{h.status}</span> at {h.location || '-'} on {new Date(h.timestamp).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const TransportPage = () => {
  const [selected, setSelected] = React.useState(null);
  const [expandedCard, setExpandedCard] = React.useState(null);

  const handleCardExpand = (transportId) => {
    // If clicking the same card, collapse it. Otherwise expand the new one.
    setExpandedCard(expandedCard === transportId ? null : transportId);
  };
  // Fetch transports from backend
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransports = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: Replace with your new backend API call
        // Mock transport data for now
        const mockTransports = [
          {
            _id: '1',
            transportId: 'T001',
            packageId: 'P001',
            driverName: 'John Doe',
            vehicleNumber: 'ABC123',
            startLocation: 'Warehouse A',
            endLocation: 'Customer Location',
            status: 'intransit',
            estimatedDelivery: '2024-01-15',
            actualDelivery: null,
            distance: '25 km',
            createdAt: '2024-01-14T10:00:00Z',
          },
          {
            _id: '2',
            transportId: 'T002',
            packageId: 'P002',
            driverName: 'Jane Smith',
            vehicleNumber: 'XYZ789',
            startLocation: 'Warehouse B',
            endLocation: 'Customer Location 2',
            status: 'delivered',
            estimatedDelivery: '2024-01-14',
            actualDelivery: '2024-01-14T16:30:00Z',
            distance: '15 km',
            createdAt: '2024-01-13T08:00:00Z',
          },
        ];
        setTransports(mockTransports);
      } catch (err) {
        setError('Failed to load transports');
      } finally {
        setLoading(false);
      }
    };
    fetchTransports();
  }, []);

  // Summary stats
  const summary = {
    total: transports.length,
    intransit: transports.filter(t => t.status === 'intransit').length,
    delivered: transports.filter(t => t.status === 'delivered').length,
    pending: transports.filter(t => t.status === 'pending').length,
    returned: transports.filter(t => t.status === 'returned').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-50 py-8 px-2 md:px-0">
      <div className="container mx-auto p-6 rounded-2xl shadow-xl bg-white/90">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-blue-800 tracking-tight">Transport Management</h1>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition font-semibold text-base float-right">
            <span className="text-xl">＋</span> New Transport
          </button>
        </div>
        {/* Summary bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-blue-900">{summary.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-purple-800">{summary.intransit}</div>
            <div className="text-xs text-gray-500">In Transit</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-green-700">{summary.delivered}</div>
            <div className="text-xs text-gray-500">Delivered</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-yellow-700">{summary.pending}</div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-red-700">{summary.returned}</div>
            <div className="text-xs text-gray-500">Returned</div>
          </div>
        </div>
        {/* Search/filter bar (UI only) */}
        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <input
            className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Search by Package ID, Tracking #, or Assigned... (UI only)"
            disabled
          />
          <div className="text-gray-600">Showing {loading ? '...' : transports.length} transport(s)</div>
        </div>
        {/* Loading/Error State */}
        {loading ? (
          <div className="text-center text-blue-600 py-8">Loading transports...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-8">{error}</div>
        ) : (
          <div className="space-y-4 mt-4">
            {transports.map((t) => (
              <TransportExpandableCard
                key={t._id}
                transport={t}
                isExpanded={expandedCard === t._id}
                onToggleExpanded={() => handleCardExpand(t._id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransportPage;
