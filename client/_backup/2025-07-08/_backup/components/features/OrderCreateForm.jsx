import React, { useState } from 'react';
import { createOrder } from '../../services/orderService';

const initialItem = { productId: '', quantity: 1 };

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="block font-semibold text-blue-700">Platform Order ID</label>
        <input
          className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={platformOrderId}
          onChange={e => setPlatformOrderId(e.target.value)}
          required
          placeholder="Enter platform order ID"
        />
      </div>
      <div className="space-y-2">
        <label className="block font-semibold text-blue-700">Items</label>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <select
                className="flex-1 px-2 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-900"
                value={item.productId}
                required
                onChange={e => handleItemChange(idx, 'productId', e.target.value)}
              >
                <option value='' disabled hidden>Select Product</option>
                {products && products.length > 0
                  ? products.map(p => <option key={p._id} value={p._id}>{p.name || p.productName || p.sku || p._id}</option>)
                  : <option value='' disabled>No products available</option>
                }
              </select>
              <input
                type='number'
                min={1}
                className="w-20 px-2 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={item.quantity}
                required
                onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
              />
              {items.length > 1 && (
                <button type='button' className="text-red-500 font-bold px-2 py-1 hover:bg-red-100 rounded" onClick={() => removeItem(idx)} title="Remove Item">&times;</button>
              )}
            </div>
          ))}
        </div>
        <button type='button' className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-semibold" onClick={addItem}>Add Item</button>
      </div>
      <div className="space-y-2">
        <label className="block font-semibold text-blue-700">Notes</label>
        <textarea
          className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          maxLength={500}
          placeholder="Optional notes (max 500 chars)"
        />
      </div>
      {error && <div className="text-red-600 font-medium">{error}</div>}
      {success && <div className="text-green-600 font-medium">{success}</div>}
      <button
        type='submit'
        disabled={loading}
        className="w-full py-2 px-4 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition-all disabled:opacity-60"
      >
        {loading ? 'Creating...' : 'Create Order'}
      </button>
    </form>
  );
}
