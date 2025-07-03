import React from "react";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  dispatched: "bg-blue-100 text-blue-800 border-blue-300",
  intransit: "bg-purple-100 text-purple-800 border-purple-300",
  delivered: "bg-green-100 text-green-800 border-green-300",
  returned: "bg-red-100 text-red-800 border-red-300",
};

const TransportStatusBadge = ({ status }) => (
  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[status] || "bg-gray-100 text-gray-800 border-gray-300"}`}>
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
);

const modeIcon = {
  land: <span title="Land Transport" className="inline-block mr-2 text-green-700 text-lg">🚚</span>,
  air: <span title="Air Transport" className="inline-block mr-2 text-blue-500 text-lg">✈️</span>,
  ship: <span title="Ship Transport" className="inline-block mr-2 text-indigo-700 text-lg">🚢</span>,
};

// Progress indicator component
const ProgressIndicator = ({ status }) => {
  const steps = ['pending', 'dispatched', 'intransit', 'delivered'];
  const currentIndex = steps.indexOf(status);

  return (
    <div className="flex items-center space-x-2 my-3">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${index <= currentIndex
              ? status === 'returned' && step === 'delivered'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-500'
            }`}>
            {index + 1}
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-1 h-1 rounded ${index < currentIndex ? 'bg-blue-500' : 'bg-gray-200'
              }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const TransportExpandableCard = ({ transport, isExpanded, onToggleExpanded }) => {
  // Calculate days until/since delivery
  const getDeliveryStatus = () => {
    if (transport.status === 'delivered' && transport.actualDeliveryDate) {
      const delivered = new Date(transport.actualDeliveryDate);
      const daysSince = Math.floor((Date.now() - delivered.getTime()) / (1000 * 60 * 60 * 24));
      return `Delivered ${daysSince} days ago`;
    } else if (transport.status === 'returned' && transport.returnDate) {
      const returned = new Date(transport.returnDate);
      const daysSince = Math.floor((Date.now() - returned.getTime()) / (1000 * 60 * 60 * 24));
      return `Returned ${daysSince} days ago`;
    } else if (transport.estimatedDeliveryDate) {
      const estimated = new Date(transport.estimatedDeliveryDate);
      const daysUntil = Math.floor((estimated.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil > 0) return `${daysUntil} days to delivery`;
      if (daysUntil === 0) return 'Delivery due today';
      return `${Math.abs(daysUntil)} days overdue`;
    }
    return 'No delivery date set';
  };

  return (
    <div
      className={`bg-gradient-to-r from-white to-blue-50 rounded-2xl shadow-lg border-l-4 ${transport.status === 'delivered' ? 'border-green-500' :
          transport.status === 'returned' ? 'border-red-500' :
            transport.status === 'intransit' ? 'border-purple-500' :
              transport.status === 'dispatched' ? 'border-blue-500' : 'border-yellow-500'
        } p-6 transition-all duration-300 cursor-pointer hover:shadow-xl hover:scale-[1.02] ${isExpanded ? "ring-2 ring-blue-400 shadow-2xl" : ""}`}
      onClick={onToggleExpanded}
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <span className="font-bold text-xl text-gray-800 tracking-wide">{transport.packageId}</span>
            <TransportStatusBadge status={transport.status} />
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">#{transport.trackingNumber}</span>
          </div>

          {/* Route Information */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="font-semibold text-sm text-gray-700">{transport.location.from}</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-300 relative">
              {modeIcon[transport.transportMode]}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-gray-700">{transport.location.to}</span>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
          </div>

          {/* Progress Indicator */}
          <ProgressIndicator status={transport.status} />

          {/* Key Info */}
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              👤 {transport.assignedTo.fullName}
            </span>
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
              💰 ₹{transport.transportCost}
            </span>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
              📦 {transport.products.length} item(s)
            </span>
          </div>
        </div>

        <div className="mt-4 md:mt-0 md:ml-6 text-right">
          <div className="text-sm font-semibold text-gray-700 mb-1">{getDeliveryStatus()}</div>
          <div className="text-xs text-blue-500 cursor-pointer hover:text-blue-700">
            {isExpanded ? "🔼 Hide Details" : "🔽 View Details"}
          </div>
        </div>
      </div>
      {/* Expandable Details Section */}
      {isExpanded && (
        <div className="mt-6 border-t border-gray-200 pt-6">
          {/* Detailed Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">💰</div>
              <div className="text-xs text-gray-600 mb-1">Total Cost</div>
              <div className="font-bold text-lg">₹{transport.transportCost}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">⚖️</div>
              <div className="text-xs text-gray-600 mb-1">Weight</div>
              <div className="font-bold text-lg">{transport.totalWeight}kg</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">📦</div>
              <div className="text-xs text-gray-600 mb-1">Volume</div>
              <div className="font-bold text-lg">{transport.totalVolume}m³</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">💎</div>
              <div className="text-xs text-gray-600 mb-1">Total Value</div>
              <div className="font-bold text-lg">₹{transport.totalValue}</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">📅</div>
              <div className="text-xs text-gray-600 mb-1">Est. Delivery</div>
              <div className="font-bold text-sm">{transport.estimatedDeliveryDate ? new Date(transport.estimatedDeliveryDate).toLocaleDateString() : 'TBD'}</div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">🏷️</div>
              <div className="text-xs text-gray-600 mb-1">Tracking</div>
              <div className="font-bold text-xs">{transport.trackingNumber}</div>
            </div>
          </div>

          {/* Tracking Timeline & Additional Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Timeline */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📍</span>
                <h3 className="font-bold text-gray-800">Tracking Timeline</h3>
              </div>
              <div className="space-y-3">
                {transport.statusHistory.map((h, idx) => (
                  <div key={idx} className="flex items-start gap-3 relative">
                    <div className={`w-3 h-3 rounded-full mt-1 ${h.status === 'delivered' ? 'bg-green-500' :
                        h.status === 'intransit' ? 'bg-purple-500' :
                          h.status === 'dispatched' ? 'bg-blue-500' :
                            h.status === 'returned' ? 'bg-red-500' : 'bg-yellow-500'
                      }`}></div>
                    {idx < transport.statusHistory.length - 1 && (
                      <div className="absolute left-1 top-4 w-0.5 h-8 bg-gray-300"></div>
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-sm capitalize text-gray-800">{h.status}</div>
                      <div className="text-xs text-gray-600">{h.location || "Location not specified"}</div>
                      <div className="text-xs text-gray-500">{new Date(h.timestamp).toLocaleString()}</div>
                      {h.notes && <div className="text-xs text-gray-600 italic mt-1">"{h.notes}"</div>}
                      {h.updatedBy && <div className="text-xs text-gray-500 mt-1">Updated by: {h.updatedBy.fullName}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Products & Additional Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📋</span>
                <h3 className="font-bold text-gray-800">Shipment Details</h3>
              </div>

              {/* Assigned Transport Details */}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-semibold text-gray-700 mb-1">Assigned Transporter</div>
                <div className="text-sm text-gray-800">{transport.assignedTo.fullName}</div>
                <div className="text-xs text-gray-600">{transport.assignedTo.email}</div>
              </div>

              {/* Product List */}
              <div className="mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Products ({transport.products.length})</div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {transport.products.map((p, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-gray-800">
                          {p.batchId?.productId?.productName || 'Product Name Not Available'}
                        </span>
                        <span className="text-gray-600 font-semibold">Qty: {p.quantity}</span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <div>SKU: {p.batchId?.productId?.sku || 'N/A'}</div>
                        <div>Batch: {p.batchId?.batchNumber || p.batchId || 'N/A'}</div>
                        <div>Price: ₹{p.batchId?.productId?.price || 'N/A'}</div>
                        <div>Category: {p.batchId?.productId?.productCategory || 'N/A'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Information */}
              {(transport.deliverySignature || transport.deliveryNotes || transport.customerRating || transport.deliveryPhotos?.length > 0) && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-sm font-semibold text-gray-700 mb-2">Delivery Information</div>
                  {transport.deliverySignature && (
                    <div className="text-xs text-gray-600 mb-1">Signature: {transport.deliverySignature}</div>
                  )}
                  {transport.deliveryNotes && (
                    <div className="text-xs text-gray-600 mb-1">Notes: {transport.deliveryNotes}</div>
                  )}
                  {transport.actualDeliveryDate && (
                    <div className="text-xs text-gray-600 mb-1">Delivered: {new Date(transport.actualDeliveryDate).toLocaleString()}</div>
                  )}
                  {transport.deliveryPhotos && transport.deliveryPhotos.length > 0 && (
                    <div className="text-xs text-gray-600 mb-1">Photos: {transport.deliveryPhotos.length} attached</div>
                  )}
                  {transport.customerRating && (
                    <div className="text-xs text-gray-600">Rating: {'⭐'.repeat(transport.customerRating)} ({transport.customerRating}/5)</div>
                  )}
                  {transport.customerFeedback && (
                    <div className="text-xs text-gray-600 italic mt-1">"{transport.customerFeedback}"</div>
                  )}
                </div>
              )}

              {/* Return Information */}
              {transport.status === 'returned' && transport.returnReason && (
                <div className="p-3 bg-red-50 rounded-lg mt-3">
                  <div className="text-sm font-semibold text-gray-700 mb-1">Return Information</div>
                  <div className="text-xs text-gray-600">Reason: {transport.returnReason}</div>
                  {transport.returnDate && (
                    <div className="text-xs text-gray-600">Date: {new Date(transport.returnDate).toLocaleDateString()}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportExpandableCard;
