import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllTransports } from '../../app/slices/transportSlice';

const TransportList = () => {
  const dispatch = useDispatch();
  const { transports, loading, error, totalPages, currentPage } = useSelector(state => state.transport);

  useEffect(() => {
    dispatch(fetchAllTransports({ page: 1, limit: 10 }));
  }, [dispatch]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message || error}</div>;

  return (
    <div>
      <h2>Transports</h2>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Type</th>
            <th>Transporter</th>
            <th>Package</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {transports && transports.length > 0 ? transports.map(t => (
            <tr key={t._id}>
              <td>{t._id}</td>
              <td>{t.status}</td>
              <td>{t.transportType}</td>
              <td>{t.transporterId?.fullName || '-'}</td>
              <td>{t.packageId?.packageId || '-'}</td>
              <td>
                <a href={`/transports/${t._id}`}>View</a>
              </td>
            </tr>
          )) : <tr><td colSpan="6">No transports found.</td></tr>}
        </tbody>
      </table>
      {/* Pagination controls can be added here */}
    </div>
  );
};

export default TransportList;
