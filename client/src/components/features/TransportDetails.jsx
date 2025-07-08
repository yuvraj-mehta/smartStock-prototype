import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { fetchTransportById, updateTransportStatus } from '../../app/slices/transportSlice';

const TransportDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { transportDetails, loading, error } = useSelector(state => state.transport);
  const user = useSelector(state => state.auth.user);

  useEffect(() => {
    dispatch(fetchTransportById(id));
  }, [dispatch, id]);

  const handleStatusUpdate = (e) => {
    e.preventDefault();
    const status = e.target.status.value;
    const notes = e.target.notes.value;
    dispatch(updateTransportStatus({ id, status, notes }));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message || error}</div>;
  if (!transportDetails) return <div>No details found.</div>;

  return (
    <div>
      <h2>Transport Details</h2>
      <div><b>ID:</b> {transportDetails._id}</div>
      <div><b>Status:</b> {transportDetails.status}</div>
      <div><b>Type:</b> {transportDetails.transportType}</div>
      <div><b>Transporter:</b> {transportDetails.transporterId?.fullName || '-'}</div>
      <div><b>Package:</b> {transportDetails.packageId?.packageId || '-'}</div>
      <div><b>Status History:</b>
        <ul>
          {transportDetails.statusHistory?.map((h, idx) => (
            <li key={idx}>{h.status} at {new Date(h.timestamp).toLocaleString()} {h.notes && `- ${h.notes}`}</li>
          ))}
        </ul>
      </div>
      {user?.role === 'admin' ? (
        <form onSubmit={handleStatusUpdate} style={{ marginTop: 20 }}>
          <label>
            Update Status:
            <select name="status" defaultValue={transportDetails.status} required>
              <option value="dispatched">Dispatched</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
            </select>
          </label>
          <br />
          <label>
            Notes:
            <input name="notes" type="text" placeholder="Optional notes" />
          </label>
          <br />
          <button type="submit">Update Status</button>
        </form>
      ) : (
        <div style={{ marginTop: 20, color: 'gray' }}><i>Only admins can update transport status.</i></div>
      )}
    </div>
  );
};

export default TransportDetails;
