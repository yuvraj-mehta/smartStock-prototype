import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { getAllOrders } from '../../services/orderService';
import { getPackagesByOrderId } from '../../services/packageService';

const NON_RESTOCK_REASONS = new Set(['defective', 'damaged', 'quality_issue']);

const REASON_OPTIONS = [
  { value: 'customer_request', label: 'Customer Request' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'defective', label: 'Defective' },
  { value: 'quality_issue', label: 'Quality Issue' },
];

const normalizeId = value => {
  const id = value?._id || value?.id || value;
  return id ? String(id) : '';
};

const uniqueIds = ids => [...new Set(ids.map(normalizeId).filter(Boolean))];

const getAllocatedItemIds = item => (
  Array.isArray(item?.itemIds) ? uniqueIds(item.itemIds) : []
);

const getItemLabel = (itemId, idx) => {
  if (itemId && typeof itemId === 'object') {
    return itemId.serialNumber || `Item ${idx + 1} (${normalizeId(itemId).slice(-6)})`;
  }

  const normalizedId = normalizeId(itemId);
  return normalizedId ? `Item ${idx + 1} (${normalizedId.slice(-6)})` : `Item ${idx + 1}`;
};

const ReturnInitiateModal = ({ onClose, onSubmit }) => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [items, setItems] = useState([]);
  const [returnedItems, setReturnedItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const { returns } = useSelector(state => state.returns);
  const isNonRestockReason = NON_RESTOCK_REASONS.has(returnReason);

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
        quantity: '',
        itemIds: [],
      })) || []);
    } else {
      setItems([]);
      setReturnedItems([]);
    }
  }, [selectedPackage, packages]);

  const handleReasonChange = value => {
    const modeChanged = NON_RESTOCK_REASONS.has(returnReason) !== NON_RESTOCK_REASONS.has(value);
    setReturnReason(value);
    setError('');

    if (modeChanged) {
      setReturnedItems(currentItems => currentItems.map(item => ({
        ...item,
        quantity: '',
        itemIds: [],
      })));
    }
  };

  const handleQuantityChange = (idx, value) => {
    const maxQuantity = Number(items[idx]?.quantity) || 0;
    const quantity = value === '' ? '' : Math.min(Math.max(Number(value), 0), maxQuantity);

    setReturnedItems(currentItems => currentItems.map((item, i) => (
      i === idx ? { ...item, quantity, itemIds: [] } : item
    )));
  };

  const handleItemIdToggle = (idx, itemId) => {
    const normalizedItemId = normalizeId(itemId);

    setReturnedItems(currentItems => currentItems.map((item, i) => {
      if (i !== idx) return item;

      const selectedIds = new Set(item.itemIds || []);
      if (selectedIds.has(normalizedItemId)) {
        selectedIds.delete(normalizedItemId);
      } else {
        selectedIds.add(normalizedItemId);
      }

      const itemIds = [...selectedIds];
      return { ...item, itemIds, quantity: itemIds.length };
    }));
  };

  const buildReturnedItemsPayload = () => returnedItems.map((item, idx) => {
    const allocatedItemIds = new Set(getAllocatedItemIds(items[idx]));
    const selectedItemIds = uniqueIds(item.itemIds || []).filter(itemId => allocatedItemIds.has(itemId));
    const quantity = isNonRestockReason ? selectedItemIds.length : Number(item.quantity);

    return {
      productId: item.productId,
      batchId: item.batchId,
      quantity,
      disposition: isNonRestockReason ? returnReason : 'restock',
      ...(isNonRestockReason ? { itemIds: selectedItemIds } : {}),
    };
  }).filter(item => Number(item.quantity) > 0);

  const selectedItemCount = returnedItems.reduce((sum, item) => (
    sum + (Array.isArray(item.itemIds) ? item.itemIds.length : 0)
  ), 0);

  const hasAllocatedItemIds = items.some(item => getAllocatedItemIds(item).length > 0);

  const getItemSummary = item => {
    const productName = item.productId?.productName || item.productId?.sku || normalizeId(item.productId);
    const batchName = item.batchId?.batchNumber || normalizeId(item.batchId);
    return `${productName} (Batch: ${batchName})`;
  };

  const handleSubmit = e => {
    e.preventDefault();
    setError('');
    if (!selectedPackage || !returnReason) {
      setError('Please select a package and provide a reason.');
      return;
    }
    if (packageHasReturn) {
      setError('A return has already been initiated for this package.');
      return;
    }
    if (isNonRestockReason && !hasAllocatedItemIds) {
      setError('This package does not include delivered item IDs for a non-restock return.');
      return;
    }

    const filtered = buildReturnedItemsPayload();
    if (!filtered.length) {
      setError(isNonRestockReason
        ? 'Select at least one delivered item for this return reason.'
        : 'Enter a return quantity for at least one item.');
      return;
    }

    onSubmit({
      packageId: selectedPackage,
      returnedItems: filtered,
      returnReason,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-fadeIn">
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
          <div className="mb-3">
            <label className="block font-medium mb-1">Return Reason</label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={returnReason}
              onChange={e => handleReasonChange(e.target.value)}
              required
            >
              <option value="">Select Reason</option>
              {REASON_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {items.length > 0 && returnReason && <div className="mb-3">
            <label className="block font-medium mb-1">Returned Items</label>
            <div className="space-y-3">
              {items.map((item, idx) => {
                const allocatedItemIds = Array.isArray(item.itemIds) ? item.itemIds : [];
                const selectedIds = returnedItems[idx]?.itemIds || [];

                return (
                  <div key={`${normalizeId(item.productId)}-${normalizeId(item.batchId)}-${idx}`} className="border rounded p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <span className="flex-1 text-sm font-medium">{getItemSummary(item)}</span>
                      {isNonRestockReason ? (
                        <span className="text-xs text-gray-500">{selectedIds.length} selected</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={returnedItems[idx]?.quantity ?? ''}
                            onChange={e => handleQuantityChange(idx, e.target.value)}
                            className="border rounded px-2 py-1 w-20"
                            placeholder={`0/${item.quantity}`}
                          />
                          <span className="text-xs text-gray-500">/ {item.quantity}</span>
                        </div>
                      )}
                    </div>
                    {isNonRestockReason && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {allocatedItemIds.length > 0 ? allocatedItemIds.map((itemId, itemIdx) => {
                          const normalizedItemId = normalizeId(itemId);
                          return (
                            <label key={normalizedItemId || itemIdx} className="flex items-center gap-2 text-sm border rounded px-2 py-1">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(normalizedItemId)}
                                onChange={() => handleItemIdToggle(idx, itemId)}
                              />
                              <span>{getItemLabel(itemId, itemIdx)}</span>
                            </label>
                          );
                        }) : (
                          <div className="text-xs text-red-600 sm:col-span-2">
                            No delivered item IDs are available for this item.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {isNonRestockReason && selectedItemCount > 0 && (
              <div className="text-xs text-gray-600 mt-2">Selected delivered items: {selectedItemCount}</div>
            )}
          </div>}
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
