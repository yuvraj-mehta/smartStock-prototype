import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllTransports, updateTransportStatus } from '../../app/slices/transportSlice';

const TransportList = () => {
  const dispatch = useDispatch();
  const { transports, loading, error, totalPages, currentPage } = useSelector(state => state.transport);
  const user = useSelector(state => state.auth.user);
  const [statusUpdates, setStatusUpdates] = useState({}); // { [id]: {status, notes} }

  useEffect(() => {
    dispatch(fetchAllTransports({ page: 1, limit: 10 }));
  }, [dispatch]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message || error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 animate-fadeIn">
      <h2 className="text-3xl font-bold gradient-text mb-6">Transports</h2>
      <div className="overflow-x-auto rounded-lg shadow-lg glass-card">
        <table className="min-w-full text-sm text-gray-800">
          <thead className="bg-gradient-to-r from-blue-100 to-purple-100">
            <tr>
              <th className="px-4 py-2 text-left font-bold">ID</th>
              <th className="px-4 py-2 text-left font-bold">Status</th>
              <th className="px-4 py-2 text-left font-bold">Type</th>
              <th className="px-4 py-2 text-left font-bold">Transporter</th>
              <th className="px-4 py-2 text-left font-bold">Package</th>
              <th className="px-4 py-2 text-left font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transports && transports.length > 0 ? transports.map(t => (
              <tr key={t._id} className="hover:bg-blue-50/60 transition hover-lift">
                <td className="px-4 py-2 font-mono text-xs text-blue-900">{t._id}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold 
                    ${t.status === 'dispatched' ? 'bg-green-100 text-green-800' : ''}
                    ${t.status === 'in_transit' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${t.status === 'delivered' ? 'bg-blue-100 text-blue-800' : ''}
                  `}>{t.status}</span>
                </td>
                <td className="px-4 py-2 capitalize">{t.transportType}</td>
                <td className="px-4 py-2">{t.transporterId?.fullName || '-'}</td>
                <td className="px-4 py-2">{t.packageId?.packageId || '-'}</td>
                <td className="px-4 py-2">
                  <a href={`/transports/${t._id}`} className="text-blue-600 hover:underline mr-2">View</a>
                  {user?.role === 'admin' && (
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        const status = statusUpdates[t._id]?.status || t.status;
                        const notes = statusUpdates[t._id]?.notes || '';
                        dispatch(updateTransportStatus({ id: t._id, status, notes })).then(() => {
                          // Refetch all transports after update to get fresh status
                          dispatch(fetchAllTransports({ page: 1, limit: 10 }));
                        });
                      }}
                      className="inline-flex items-center space-x-2"
                    >
                      <select
                        value={statusUpdates[t._id]?.status || t.status}
                        onChange={e => setStatusUpdates(s => ({ ...s, [t._id]: { ...s[t._id], status: e.target.value } }))}
                        className="border rounded px-2 py-1"
                        disabled={t.status === 'delivered'}
                      >
                        {/* Only allow valid transitions */}
                        {t.status === 'dispatched' && <option value="in_transit">In Transit</option>}
                        {t.status === 'in_transit' && <option value="delivered">Delivered</option>}
                        {/* Show current status as disabled option for clarity */}
                        <option value={t.status} disabled>{t.status.charAt(0).toUpperCase() + t.status.slice(1)}</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Notes"
                        value={statusUpdates[t._id]?.notes || ''}
                        onChange={e => setStatusUpdates(s => ({ ...s, [t._id]: { ...s[t._id], notes: e.target.value } }))}
                        className="border rounded px-2 py-1"
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                        disabled={
                          (t.status === 'delivered') ||
                          (t.status === 'dispatched' && (statusUpdates[t._id]?.status !== 'in_transit')) ||
                          (t.status === 'in_transit' && (statusUpdates[t._id]?.status !== 'delivered'))
                        }
                      >Update</button>
                    </form>
                  )}
                </td>
              </tr>
            )) : <tr><td colSpan="6" className="text-center py-8 text-gray-400">No transports found.</td></tr>}
          </tbody>
        </table>
      </div>
      {/* Pagination controls can be added here */}
    </div>
  );
};

export default TransportList;
