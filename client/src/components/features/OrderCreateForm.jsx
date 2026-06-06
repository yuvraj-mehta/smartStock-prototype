import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, PackagePlus, Plus, Trash2 } from 'lucide-react';
import { createOrder } from '../../services/orderService';

const initialItem = { productId: '', quantity: 1 };

const fieldClass = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50';
const labelClass = 'block text-sm font-medium text-gray-700';

export default function OrderCreateForm({ products, onOrderCreated }) {
  const [platformOrderId, setPlatformOrderId] = useState('');
  const [items, setItems] = useState([{ ...initialItem }]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleItemChange = (idx, field, value) => {
    setItems(items => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addItem = () => setItems([...items, { ...initialItem }]);
  const removeItem = idx => setItems(items.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await createOrder({ platformOrderId, items, notes });
      setSuccess('Order created successfully!');
      setPlatformOrderId('');
      setItems([{ ...initialItem }]);
      setNotes('');
      if (onOrderCreated) onOrderCreated();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <div className="space-y-2">
          <label className={labelClass} htmlFor="platform-order-id">Platform order ID</label>
          <input
            id="platform-order-id"
            className={fieldClass}
            value={platformOrderId}
            onChange={e => setPlatformOrderId(e.target.value)}
            required
            placeholder="SHOP-10042"
          />
        </div>

        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          <div className="mb-1 flex items-center gap-2 font-semibold text-gray-900">
            <PackagePlus className="h-4 w-4 text-blue-600" />
            Allocation preview
          </div>
          Orders start in pending state and move to packing after inventory allocation.
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <label className={labelClass}>Order items</label>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            onClick={addItem}
          >
            <Plus className="h-4 w-4" />
            Add item
          </button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="grid gap-3 rounded-md border border-gray-200 bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_120px_auto] sm:items-center">
              <select
                className={fieldClass}
                value={item.productId}
                required
                aria-label={`Product for item ${idx + 1}`}
                onChange={e => handleItemChange(idx, 'productId', e.target.value)}
              >
                <option value='' disabled hidden>Select product</option>
                {products && products.length > 0
                  ? products.map(p => <option key={p._id} value={p._id}>{p.name || p.productName || p.sku || p._id}</option>)
                  : <option value='' disabled>No products available</option>
                }
              </select>
              <input
                type='number'
                min={1}
                className={fieldClass}
                value={item.quantity}
                required
                aria-label={`Quantity for item ${idx + 1}`}
                onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
              />
              {items.length > 1 && (
                <button
                  type='button'
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100"
                  onClick={() => removeItem(idx)}
                  title="Remove item"
                  aria-label={`Remove item ${idx + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <label className={labelClass} htmlFor="order-notes">Notes</label>
        <textarea
          id="order-notes"
          className={`${fieldClass} min-h-24 resize-y`}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          maxLength={500}
          placeholder="Optional notes (max 500 chars)"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      <div className="flex justify-end border-t border-gray-200 pt-5">
        <button
          type='submit'
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <PackagePlus className="h-4 w-4" />
          {loading ? 'Creating...' : 'Create order'}
        </button>
      </div>
    </form>
  );
}
