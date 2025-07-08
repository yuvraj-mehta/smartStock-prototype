import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { processReturn } from '../../app/slices/returnSlice';

const ProcessReturnModal = ({ returnId, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await dispatch(processReturn({ returnId, data: { notes } })).unwrap();
      onSuccess();
    } catch (err) {
      setError(err?.message || 'Failed to process return');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md relative animate-fadeIn">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl" onClick={onClose}>&times;</button>
        <h3 className="text-xl font-bold mb-4 text-green-700">Process Return at Warehouse</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block font-medium mb-1">Notes (optional)</label>
            <input className="border rounded px-2 py-1 w-full" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Processing notes" />
          </div>
          {error && <div className="text-red-600 text-center py-2 font-semibold">{typeof error === 'string' ? error : (error?.message || 'An error occurred')}</div>}
          {loading && <div className="text-blue-600 text-center py-2 font-semibold">Loading...</div>}
          <div className="flex gap-2 mt-4">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700" disabled={loading}>{loading ? 'Processing...' : 'Process Return'}</button>
            <button type="button" className="px-4 py-2 text-gray-500 hover:text-gray-700" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProcessReturnModal;
