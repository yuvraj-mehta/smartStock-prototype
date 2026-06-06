import React, { useState } from 'react';
import { AlertCircle, ClipboardCheck } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { processReturn } from '../../app/slices/returnSlice';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

const fieldClass = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50';
const labelClass = 'block text-sm font-medium text-gray-700';

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
    <Modal isOpen onClose={onClose} title="Process return at warehouse" size="medium">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-md border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <ClipboardCheck className="h-4 w-4" />
            Complete warehouse processing
          </div>
          Approved restock quantities will be handled by the return lifecycle.
        </div>

          <div className="space-y-2">
            <label className={labelClass}>Notes</label>
            <textarea className={`${fieldClass} min-h-24 resize-y`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Processing notes" />
          </div>
          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {typeof error === 'string' ? error : (error?.message || 'An error occurred')}
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="success" loading={loading}>Process return</Button>
          </div>
        </form>
    </Modal>
  );
};

export default ProcessReturnModal;
