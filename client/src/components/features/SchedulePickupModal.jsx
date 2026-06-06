import React, { useState } from 'react';
import { AlertCircle, Truck } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { scheduleReturnPickup } from '../../app/slices/returnSlice';
import { userAPI } from '../../services/api';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

const fieldClass = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50';
const labelClass = 'block text-sm font-medium text-gray-700';

const SchedulePickupModal = ({ returnId, onClose, onSuccess }) => {
  const dispatch = useDispatch();
  const [transporterId, setTransporterId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transporters, setTransporters] = useState([]);

  React.useEffect(() => {
    userAPI.getAllExternalUsers('transporter')
      .then(res => setTransporters(res.data?.externalUsers || res.data?.users || []))
      .catch(() => setTransporters([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await dispatch(scheduleReturnPickup({ returnId, data: { transporterId, notes } })).unwrap();
      onSuccess();
    } catch (err) {
      setError(err?.message || 'Failed to schedule pickup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Schedule pickup" size="medium">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <Truck className="h-4 w-4" />
            Assign a transporter for reverse pickup
          </div>
          This advances the return into the pickup scheduled state.
        </div>

          <div className="space-y-2">
            <label className={labelClass}>Transporter</label>
            <select className={fieldClass} value={transporterId} onChange={e => setTransporterId(e.target.value)} required>
              <option value="">Select Transporter</option>
              {transporters.map(t => <option key={t._id || t.id} value={t._id || t.id}>{t.fullName || t.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className={labelClass}>Notes</label>
            <textarea className={`${fieldClass} min-h-24 resize-y`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Pickup notes" />
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {typeof error === 'string' ? error : (error?.message || 'An error occurred')}
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" loading={loading} disabled={!transporterId}>
              Schedule pickup
            </Button>
          </div>
        </form>
    </Modal>
  );
};

export default SchedulePickupModal;
