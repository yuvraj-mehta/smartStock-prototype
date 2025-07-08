import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllReturns, initiateReturn } from '../../app/slices/returnSlice';
import { getAllOrders } from '../../services/orderService';
import { getPackagesByOrderId } from '../../services/packageService';

const ReturnInitiateModal = ({ onClose, onSubmit }) => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [items, setItems] = useState([]);
  const [returnedItems, setReturnedItems] = useState([]);
  const REASON_OPTIONS = [
    { value: 'defective', label: 'Defective' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'wrong_item', label: 'Wrong Item' },
    { value: 'quality_issue', label: 'Quality Issue' },
    { value: 'customer_request', label: 'Customer Request' },
  ];
  const [returnReason, setReturnReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const { returns } = useSelector(state => state.returns);

  // Prevent duplicate return initiation for a package
  const packageHasReturn = selectedPackage && returns.some(r => r.packageId === selectedPackage || r.packageId?._id === selectedPackage);

  useEffect(() => {
    getAllOrders().then(data => {
      setOrders(Array.isArray(data) ? data : (data.orders || []));
    });
  }, []);

  useEffect(() => {
    if (selectedOrder) {
      getPackagesByOrderId(selectedOrder).then(pkgRes => {
        const pkgs = Array.isArray(pkgRes.packages) ? pkgRes.packages : pkgRes;
        setPackages(pkgs || []);
      });
    } else {
      setPackages([]);
      setSelectedPackage('');
    }
  }, [selectedOrder]);

  useEffect(() => {
    if (selectedPackage) {
      const pkg = packages.find(p => p._id === selectedPackage);
      setItems(pkg?.allocatedItems || []);
      setReturnedItems(pkg?.allocatedItems?.map(item => ({
        productId: item.productId?._id || item.productId,
        batchId: item.batchId?._id || item.batchId,
        quantity: 0,
      })) || []);
    } else {
      setItems([]);
      setReturnedItems([]);
    }
  }, [selectedPackage, packages]);

  const handleReturnedItemChange = (idx, field, value) => {
    setReturnedItems(items => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleSubmit = e => {
    e.preventDefault();
    setError('');
    const filtered = returnedItems.filter(i => Number(i.quantity) > 0);
    if (!selectedPackage || !filtered.length || !returnReason) {
      setError('Please select a package, add at least one returned item, and provide a reason.');
      return;
    }
    if (packageHasReturn) {
      setError('A return has already been initiated for this package.');
      return;
    }
    onSubmit({
      packageId: selectedPackage,
      returnedItems: filtered.map(i => ({
        productId: i.productId,
        batchId: i.batchId,
        quantity: Number(i.quantity),
      })),
      returnReason,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-lg relative animate-fadeIn">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl" onClick={onClose}>&times;</button>
        <h3 className="text-2xl font-bold mb-4 text-blue-700">Initiate Return</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block font-medium mb-1">Order</label>
            <select className="border rounded px-2 py-1 w-full" value={selectedOrder} onChange={e => setSelectedOrder(e.target.value)} required>
              <option value="">Select Order</option>
              {orders.map(o => <option key={o._id} value={o._id}>{o.orderNumber} - {o.platformOrderId}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="block font-medium mb-1">Package</label>
            <select className="border rounded px-2 py-1 w-full" value={selectedPackage} onChange={e => setSelectedPackage(e.target.value)} required>
              <option value="">Select Package</option>
              {packages.map(p => <option key={p._id} value={p._id}>{p.packageId}</option>)}
            </select>
            {packageHasReturn && <div className="text-red-600 text-xs mt-1">A return has already been initiated for this package.</div>}
          </div>
          {items.length > 0 && <div className="mb-3">
            <label className="block font-medium mb-1">Returned Items</label>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="flex-1 text-sm">{item.productId?.productName || item.productId} (Batch: {item.batchId?.batchNumber || item.batchId})</span>
                  <input
                    type="number"
                    min="0"
                    max={item.quantity}
                    value={returnedItems[idx]?.quantity || ''}
                    onChange={e => handleReturnedItemChange(idx, 'quantity', e.target.value)}
                    className="border rounded px-2 py-1 w-20"
                    placeholder={`0/${item.quantity}`}
                  />
                  <span className="text-xs text-gray-500">/ {item.quantity}</span>
                </div>
              ))}
            </div>
          </div>}
          <div className="mb-3">
            <label className="block font-medium mb-1">Return Reason</label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={returnReason}
              onChange={e => setReturnReason(e.target.value)}
              required
            >
              <option value="">Select Reason</option>
              {REASON_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="block font-medium mb-1">Notes (optional)</label>
            <input className="border rounded px-2 py-1 w-full" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes" />
          </div>
          {error && <div className="text-red-600 text-center py-2 font-semibold">{typeof error === 'string' ? error : (error?.message || 'An error occurred')}</div>}
          <div className="flex gap-2 mt-4">
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700">Submit</button>
            <button type="button" className="px-4 py-2 text-gray-500 hover:text-gray-700" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReturnInitiateModal;
