import React, { useEffect, useState } from 'react';
import { AlertCircle, Info, PackageOpen } from 'lucide-react';
import { useSelector } from 'react-redux';
import { getAllOrders } from '../../services/orderService';
import { getPackagesByOrderId } from '../../services/packageService';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

const NON_RESTOCK_REASONS = new Set(['defective', 'damaged', 'quality_issue']);
const RETURN_READY_ORDER_STATUSES = new Set(['delivered', 'sale_confirmed', 'returned']);

const REASON_OPTIONS = [
  { value: 'customer_request', label: 'Customer Request' },
  { value: 'wrong_item', label: 'Wrong Item' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'defective', label: 'Defective' },
  { value: 'quality_issue', label: 'Quality Issue' },
];

const fieldClass = 'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50';
const labelClass = 'block text-sm font-medium text-gray-700';

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

const ReturnInitiateModal = ({
  onClose,
  onSubmit,
  submitError = '',
  submitting = false,
  initialOrderId = '',
  initialPackageId = '',
}) => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState('');
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState('');
  const [items, setItems] = useState([]);
  const [returnedItems, setReturnedItems] = useState([]);
  const [returnReason, setReturnReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesError, setPackagesError] = useState('');
  const { returns } = useSelector(state => state.returns);
  const existingReturns = Array.isArray(returns) ? returns : [];
  const isNonRestockReason = NON_RESTOCK_REASONS.has(returnReason);
  const selectedOrderDetails = orders.find(order => order._id === selectedOrder);
  const packageReturnCount = selectedPackage
    ? existingReturns.filter(r => normalizeId(r.packageId) === selectedPackage).length
    : 0;

  useEffect(() => {
    setOrdersLoading(true);
    setOrdersError('');

    getAllOrders({ fetchAll: true, limit: 100 }).then(data => {
      const ordersArr = Array.isArray(data) ? data : (data.orders || []);
      setOrders(ordersArr);
      if (initialOrderId && ordersArr.some(order => normalizeId(order) === initialOrderId)) {
        setSelectedOrder(initialOrderId);
      }
    }).catch(() => {
      setOrders([]);
      setOrdersError('Orders could not be loaded. Return initiation needs delivered orders from the order API.');
    }).finally(() => {
      setOrdersLoading(false);
    });
  }, [initialOrderId]);

  useEffect(() => {
    if (selectedOrder) {
      setSelectedPackage('');
      setPackagesLoading(true);
      setPackagesError('');
      getPackagesByOrderId(selectedOrder).then(pkgRes => {
        const pkgs = Array.isArray(pkgRes.packages) ? pkgRes.packages : pkgRes;
        const deliveredPackages = (pkgs || []).filter(pkg => pkg.packageStatus === 'delivered');
        setPackages(deliveredPackages);
        if (initialPackageId && deliveredPackages.some(pkg => normalizeId(pkg) === initialPackageId)) {
          setSelectedPackage(initialPackageId);
        }
      }).catch(() => {
        setPackages([]);
        setPackagesError('Delivered packages could not be loaded for this order.');
      }).finally(() => {
        setPackagesLoading(false);
      });
    } else {
      setPackages([]);
      setSelectedPackage('');
      setPackagesError('');
      setPackagesLoading(false);
    }
  }, [initialPackageId, selectedOrder]);

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
    <Modal isOpen onClose={onClose} title="Initiate return" size="3xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <PackageOpen className="h-4 w-4" />
            Return prerequisites
          </div>
          Choose an order with a delivered package. Damaged, defective, and quality issue returns also require delivered item IDs,
          so orders still pending, processing, dispatched, or missing delivered package items cannot be submitted here.
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className={labelClass} htmlFor="return-order-id">Order</label>
            <select
              id="return-order-id"
              className={fieldClass}
              value={selectedOrder}
              onChange={e => setSelectedOrder(e.target.value)}
              disabled={ordersLoading}
              required
            >
              <option value="">{ordersLoading ? 'Loading orders...' : 'Select Order'}</option>
              {orders.map(o => <option key={o._id} value={o._id}>{o.orderNumber} - {o.platformOrderId}</option>)}
            </select>
            {ordersError && (
              <div className="mt-1 text-xs font-medium text-red-600">{ordersError}</div>
            )}
            {selectedOrderDetails?.orderStatus && !RETURN_READY_ORDER_STATUSES.has(selectedOrderDetails.orderStatus) && (
              <div className="mt-1 flex items-start gap-1.5 text-xs text-amber-700">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                This order is {selectedOrderDetails.orderStatus.replace(/_/g, ' ')}. A return can start only after a package is delivered.
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className={labelClass} htmlFor="return-package-id">Package</label>
            <select
              id="return-package-id"
              className={fieldClass}
              value={selectedPackage}
              onChange={e => setSelectedPackage(e.target.value)}
              disabled={!selectedOrder || packagesLoading}
              required
            >
              <option value="">
                {!selectedOrder
                  ? 'Select an order first'
                  : packagesLoading
                    ? 'Loading delivered packages...'
                    : 'Select Package'}
              </option>
              {packages.map(p => <option key={p._id} value={p._id}>{p.packageId}</option>)}
            </select>
            {packagesError && (
              <div className="mt-1 text-xs font-medium text-red-600">{packagesError}</div>
            )}
            {selectedOrder && !packagesLoading && !packagesError && packages.length === 0 && (
              <div className="mt-1 text-xs font-medium text-red-600">
                No delivered packages are available. Mark transport/package delivery complete before initiating a return.
              </div>
            )}
            {packageReturnCount > 0 && (
              <div className="mt-1 flex items-start gap-1.5 text-xs text-amber-700">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {packageReturnCount} existing return record{packageReturnCount === 1 ? '' : 's'} found for this package. Submit only the remaining returned items.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
            <label className={labelClass} htmlFor="return-reason">Return reason</label>
            <select
              id="return-reason"
              className={fieldClass}
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

          {returnReason && isNonRestockReason && (
            <div className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-800">
              This reason removes specific delivered items from restock eligibility. Select item IDs below; quantity-only entry is allowed only for stockable return reasons.
            </div>
          )}

          {items.length > 0 && returnReason && <div className="space-y-2">
            <label className={labelClass}>Returned items</label>
            <div className="space-y-3">
              {items.map((item, idx) => {
                const allocatedItemIds = Array.isArray(item.itemIds) ? item.itemIds : [];
                const selectedIds = returnedItems[idx]?.itemIds || [];

                return (
                  <div key={`${normalizeId(item.productId)}-${normalizeId(item.batchId)}-${idx}`} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <span className="flex-1 text-sm font-semibold text-gray-900">{getItemSummary(item)}</span>
                      {isNonRestockReason ? (
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">{selectedIds.length} selected</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            aria-label={`Returned quantity for ${getItemSummary(item)}`}
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={returnedItems[idx]?.quantity ?? ''}
                            onChange={e => handleQuantityChange(idx, e.target.value)}
                            className={`${fieldClass} w-24`}
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
                            <label key={normalizedItemId || itemIdx} className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
              <div className="text-xs font-medium text-gray-600">Selected delivered items: {selectedItemCount}</div>
            )}
          </div>}

          {selectedPackage && returnReason && items.length === 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This delivered package has no allocated item rows available for return entry.
            </div>
          )}

          <div className="space-y-2">
            <label className={labelClass} htmlFor="return-notes">Notes</label>
            <textarea id="return-notes" className={`${fieldClass} min-h-24 resize-y`} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes" />
          </div>
          {(error || submitError) && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {typeof (error || submitError) === 'string' ? (error || submitError) : ((error || submitError)?.message || 'An error occurred')}
            </div>
          )}
          <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="success" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit return'}</Button>
          </div>
        </form>
    </Modal>
  );
};

export default ReturnInitiateModal;
