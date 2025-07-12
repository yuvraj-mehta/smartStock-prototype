import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllTransports, updateTransportStatus } from '../../app/slices/transportSlice';


const TransportList = () => {
  const dispatch = useDispatch();
  const { transports, loading, error } = useSelector(state => state.transport);
  const user = useSelector(state => state.auth.user);
  const [statusUpdates, setStatusUpdates] = useState({});

  // Client-side features
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    dispatch(fetchAllTransports({ page: 1, limit: 1000 })); // fetch all for client-side features
  }, [dispatch]);

  // Filtering & searching
  let filtered = Array.isArray(transports) ? transports : [];
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(t =>
      t._id.toLowerCase().includes(s) ||
      (t.status && t.status.toLowerCase().includes(s)) ||
      (t.transporterId?.fullName && t.transporterId.fullName.toLowerCase().includes(s)) ||
      (t.packageId?.packageId && t.packageId.packageId.toLowerCase().includes(s)),
    );
  }
  if (statusFilter) filtered = filtered.filter(t => t.status === statusFilter);
  if (typeFilter) filtered = filtered.filter(t => t.transportType === typeFilter);

  // Pagination
  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Unique status/type for filters
  const statusOptions = Array.from(new Set((transports || []).map(t => t.status))).filter(Boolean);
  const typeOptions = Array.from(new Set((transports || []).map(t => t.transportType))).filter(Boolean);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message || error}</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 animate-fadeIn">
      <h2 className="text-3xl font-bold gradient-text mb-6">Transports</h2>

      {/* Filters & Search */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <input
          type="text"
          placeholder="Search by ID, status, transporter, package..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 min-w-[220px]"
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Statuses</option>
          {statusOptions.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
        >
          <option value="">All Types</option>
          {typeOptions.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <div className="ml-auto flex gap-2 items-center">
          <label className="text-sm text-gray-600">Rows per page:</label>
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="px-2 py-1 border border-gray-300 rounded-lg"
          >
            {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

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
            {paginated && paginated.length > 0 ? paginated.map(t => (
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
                          dispatch(fetchAllTransports({ page: 1, limit: 1000 }));
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
                        {t.status === 'dispatched' && <option value="in_transit">In Transit</option>}
                        {t.status === 'in_transit' && <option value="delivered">Delivered</option>}
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

      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-600">
          Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {total}
        </div>
        <div className="flex gap-2 items-center">
          <button
            className="px-3 py-1 rounded border border-gray-300 bg-white hover:bg-blue-50 disabled:opacity-50"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >Prev</button>
          <span className="text-sm">Page {page} of {totalPages}</span>
          <button
            className="px-3 py-1 rounded border border-gray-300 bg-white hover:bg-blue-50 disabled:opacity-50"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >Next</button>
        </div>
      </div>
    </div>
  );
};

export default TransportList;
