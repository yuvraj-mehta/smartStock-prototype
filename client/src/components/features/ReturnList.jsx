import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllReturns, initiateReturn, scheduleReturnPickup, markReturnPickedUp, processReturn } from '../../app/slices/returnSlice';
import ReturnInitiateModal from './ReturnInitiateModal';
import SchedulePickupModal from './SchedulePickupModal';
import MarkPickedUpModal from './MarkPickedUpModal';
import ProcessReturnModal from './ProcessReturnModal';

const ReturnList = () => {
  const dispatch = useDispatch();
  const { returns, loading, error } = useSelector(state => state.returns);
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

  useEffect(() => {
    const params = { page, limit };
    if (status) params.status = status;
    dispatch(fetchAllReturns(params)).then(res => {
      if (res.payload && typeof res.payload.totalPages === 'number') setTotalPages(res.payload.totalPages);
      if (res.payload && typeof res.payload.total === 'number') setTotal(res.payload.total);
    });
  }, [dispatch, page, limit, status]);


  const handleInitiateReturn = async (data) => {
    setModalLoading(true);
    setModalError('');
    try {
      await dispatch(initiateReturn(data)).unwrap();
      setShowInitiate(false);
    } catch (err) {
      setModalError(err || 'Failed to initiate return');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[98vw] mx-auto p-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-3xl font-bold gradient-text">Returns</h2>
        <div className="flex gap-2 items-center">
          <select className="border rounded px-2 py-1" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            <option value="initiated">Initiated</option>
            <option value="pickup_scheduled">Pickup Scheduled</option>
            <option value="picked_up">Picked Up</option>
            <option value="received">Received</option>
            <option value="processed">Processed</option>
          </select>
          <select className="border rounded px-2 py-1" value={limit} onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}>
            {[10, 20, 50, 100].map(l => <option key={l} value={l}>{l} / page</option>)}
          </select>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
            onClick={() => setShowInitiate(true)}
          >Initiate Return</button>
        </div>
      </div>
      {showInitiate && (
        <ReturnInitiateModal
          onClose={() => setShowInitiate(false)}
          onSubmit={handleInitiateReturn}
        />
      )}
      {pickupModalId && (
        <SchedulePickupModal
          returnId={pickupModalId}
          onClose={() => setPickupModalId(null)}
          onSuccess={() => {
            setPickupModalId(null);
            dispatch(fetchAllReturns());
          }}
        />
      )}
      {pickedUpModalId && (
        <MarkPickedUpModal
          returnId={pickedUpModalId}
          onClose={() => setPickedUpModalId(null)}
          onSuccess={() => {
            setPickedUpModalId(null);
            dispatch(fetchAllReturns());
          }}
        />
      )}
      {processModalId && (
        <ProcessReturnModal
          returnId={processModalId}
          onClose={() => setProcessModalId(null)}
          onSuccess={() => {
            setProcessModalId(null);
            dispatch(fetchAllReturns());
          }}
        />
      )}
      {error && <div className="text-red-600 text-center py-2 font-semibold">{typeof error === 'string' ? error : (error?.message || 'An error occurred')}</div>}
      {loading && <div className="text-blue-600 text-center py-2 font-semibold">Loading...</div>}
      <div className="overflow-x-auto rounded-xl shadow-lg bg-white mb-4 border border-blue-100">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gradient-to-r from-blue-50 to-purple-100">
            <tr>
              <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Return #</th>
              <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Package</th>
              <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Reason</th>
              <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Items</th>
              <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Transporter</th>
              <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Warehouse</th>
              <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Processed By</th>
              <th className="px-6 py-3 text-left font-bold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {returns && returns.length > 0 ? returns.map(r => (
              <tr key={r._id} className="hover:bg-blue-50/60 transition hover:scale-[1.01] border-b border-blue-50 last:border-0">
                <td className="px-6 py-3 font-mono text-xs text-blue-900 whitespace-nowrap max-w-[180px] overflow-hidden text-ellipsis">
                  <a href="#" className="text-blue-700 underline break-all" title={r._id}>{r._id.slice(0, 8)}...{r._id.slice(-4)}</a>
                </td>
                <td className="px-6 py-3 whitespace-nowrap max-w-[180px] overflow-hidden text-ellipsis" title={r.packageId?.packageId || r.packageId}>
                  {r.packageId?.packageId || r.packageId}
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded text-xs font-semibold 
                    ${r.returnStatus === 'initiated' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${r.returnStatus === 'pickup_scheduled' ? 'bg-blue-100 text-blue-800' : ''}
                    ${r.returnStatus === 'picked_up' ? 'bg-purple-100 text-purple-800' : ''}
                    ${r.returnStatus === 'received' ? 'bg-green-100 text-green-800' : ''}
                    ${r.returnStatus === 'processed' ? 'bg-gray-200 text-gray-700' : ''}
                  `}>
                    {r.returnStatus.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </td>
                <td className="px-6 py-3 whitespace-nowrap capitalize">{r.returnReason?.replace('_', ' ')}</td>
                <td className="px-6 py-3 whitespace-nowrap max-w-[220px] overflow-x-auto">
                  <ul className="list-disc pl-4">
                    {Array.isArray(r.returnedItems) && r.returnedItems.map((item, idx) => (
                      <li key={idx} className="truncate" title={`${item.productId?.productName || item.productId} (Batch: ${item.batchId?.batchNumber || item.batchId}) x ${item.quantity}`}>
                        <span className="font-medium text-gray-700">{item.productId?.productName || item.productId}</span>
                        <span className="text-gray-400"> (Batch: {item.batchId?.batchNumber || item.batchId})</span>
                        <span className="text-gray-600"> × {item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-6 py-3 whitespace-nowrap max-w-[140px] overflow-hidden text-ellipsis" title={r.transportId?.transporterId?.fullName || r.transportId?.transporterId?.name || '-'}>
                  {r.transportId?.transporterId?.fullName || r.transportId?.transporterId?.name || '-'}
                </td>
                <td className="px-6 py-3 whitespace-nowrap max-w-[140px] overflow-hidden text-ellipsis" title={typeof r.warehouseId === 'object' ? (r.warehouseId?.warehouseName || r.warehouseId?._id) : (r.warehouseId || '-') }>
                  {typeof r.warehouseId === 'object' ? (r.warehouseId?.warehouseName || r.warehouseId?._id) : (r.warehouseId || '-')}
                </td>
                <td className="px-6 py-3 whitespace-nowrap max-w-[140px] overflow-hidden text-ellipsis" title={r.processedBy?.fullName || '-'}>
                  {r.processedBy?.fullName || '-'}
                </td>
                <td className="px-6 py-3 whitespace-nowrap">
                  {r.returnStatus === 'initiated' && (
                    <button
                      className="bg-blue-500 text-white px-3 py-1 rounded shadow hover:bg-blue-600"
                      onClick={() => setPickupModalId(r._id)}
                    >Schedule Pickup</button>
                  )}
                  {r.returnStatus === 'pickup_scheduled' && (
                    <button
                      className="bg-purple-600 text-white px-3 py-1 rounded shadow hover:bg-purple-700"
                      onClick={() => setPickedUpModalId(r._id)}
                    >Mark Picked Up</button>
                  )}
                  {r.returnStatus === 'picked_up' && (
                    <button
                      className="bg-green-600 text-white px-3 py-1 rounded shadow hover:bg-green-700"
                      onClick={() => setProcessModalId(r._id)}
                    >Process at Warehouse</button>
                  )}
                </td>
              </tr>
            )) : <tr><td colSpan="9" className="text-center py-8 text-gray-400">No returns found.</td></tr>}
          </tbody>
        </table>
      </div>
      {modalError && <div className="text-red-600 text-center py-2 font-semibold">{typeof modalError === 'string' ? modalError : (modalError?.message || 'An error occurred')}</div>}
      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4">
        <div className="text-gray-600 text-sm">Total: {total}</div>
        <div className="flex gap-2 items-center">
          <button
            className="px-3 py-1 rounded border bg-white disabled:opacity-50"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >Prev</button>
          <span className="text-gray-700">Page {page} of {totalPages}</span>
          <button
            className="px-3 py-1 rounded border bg-white disabled:opacity-50"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >Next</button>
        </div>
      </div>
    </div>
  );
};

export default ReturnList;
