import React, { useEffect, useState } from 'react';
import { getAllOrders, processOrder } from '../../services/orderService';
import { getPackagesByOrderId, updatePackageStatus } from '../../services/packageService';
import { assignTransport } from '../../services/transportService';
import { userAPI } from '../../services/api';

export default function OrderList({ products }) {
  const [orders, setOrders] = useState([]);
  const [orderPackages, setOrderPackages] = useState({}); // { [orderId]: packageDoc }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [packingId, setPackingId] = useState(null);
  const [packingNotes, setPackingNotes] = useState('');
  const [showPacking, setShowPacking] = useState(null); // orderId for which packing UI is shown
  const [packError, setPackError] = useState('');


  // Delivery logic (assign transport feature restored)
  const [showAssignTransport, setShowAssignTransport] = useState(null); // packageId for which assign UI is shown
  const [assignTransporterId, setAssignTransporterId] = useState('');
  const [assignTransportError, setAssignTransportError] = useState('');
  const [assigningTransport, setAssigningTransport] = useState(false);
  const [externalUsers, setExternalUsers] = useState([]);

  useEffect(() => {
    // Fetch only transporters for delivery assignment
    const fetchExternalUsers = async () => {
      try {
        const res = await userAPI.getAllExternalUsers('transporter');
        setExternalUsers(res.data?.externalUsers || res.data?.users || []);
      } catch {
        setExternalUsers([]);
      }
    };
    fetchExternalUsers();
  }, []);

  const handleShowAssignTransport = (packageId) => {
    setShowAssignTransport(packageId);
    setAssignTransporterId('');
    setAssignTransportError('');
  };

  const handleAssignTransport = async (packageId) => {
    setAssigningTransport(true);
    setAssignTransportError('');
    try {
      await assignTransport(packageId, assignTransporterId);
      await fetchOrders();
      setShowAssignTransport(null);
    } catch (err) {
      setAssignTransportError(err?.response?.data?.message || 'Failed to assign transporter');
    } finally {
      setAssigningTransport(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllOrders();
      const ordersArr = Array.isArray(data) ? data : (Array.isArray(data.orders) ? data.orders : []);
      if (!Array.isArray(ordersArr)) {
        setError('Unexpected response from server.');
        setOrders([]);
      } else {
        setOrders(ordersArr);
      }
      if (data && data.message && !ordersArr.length) {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };


  // Fetch orders and their packages
  useEffect(() => {
    const fetchAll = async () => {
      await fetchOrders();
    };
    fetchAll();
  }, []);

  // Fetch packages for all orders when orders change (transport feature removed)
  useEffect(() => {
    const fetchPackages = async () => {
      if (!orders.length) return;
      const pkgs = {};
      for (const order of orders) {
        try {
          const pkgRes = await getPackagesByOrderId(order._id);
          const packageDoc = Array.isArray(pkgRes.packages) ? pkgRes.packages[0] : (Array.isArray(pkgRes) ? pkgRes[0] : null);
          if (packageDoc && packageDoc._id) {
            pkgs[order._id] = packageDoc;
          }
        } catch { }
      }
      setOrderPackages(pkgs);
    };
    fetchPackages();
  }, [orders]);

  // Removed transporter fetching logic

  const handleProcess = async (orderId) => {
    setProcessingId(orderId);
    try {
      await processOrder(orderId);
      await fetchOrders();
    } catch {
      alert('Failed to process order');
    } finally {
      setProcessingId(null);
    }
  };

  // Packing logic
  const handleShowPacking = (orderId) => {
    setShowPacking(orderId);
    setPackingNotes('');
    setPackError('');
  };

  const handlePackOrder = async (orderId) => {
    setPackingId(orderId);
    setPackError('');
    try {
      // Get package for this order
      const pkgRes = await getPackagesByOrderId(orderId);
      const packageDoc = Array.isArray(pkgRes.packages) ? pkgRes.packages[0] : (Array.isArray(pkgRes) ? pkgRes[0] : null);
      if (!packageDoc || !packageDoc._id) {
        setPackError('No package found for this order.');
        setPackingId(null);
        return;
      }
      await updatePackageStatus(packageDoc._id, 'ready_for_dispatch', packingNotes);
      await fetchOrders();
      setShowPacking(null);
    } catch (err) {
      setPackError(err?.response?.data?.message || 'Failed to pack order');
    } finally {
      setPackingId(null);
    }
  };

  // Delivery logic removed

  // Mark in transit/delivered logic removed

  if (loading) return <div className="flex items-center justify-center min-h-[20vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mr-3"></div><span className="text-lg text-purple-700 font-semibold">Loading orders...</span></div>;
  if (error) return <div className="text-red-600 font-medium text-center py-4">{error}</div>;
  if (!Array.isArray(orders) || orders.length === 0) return <div className="text-gray-500 text-center py-8">No orders to display.</div>;

  return (
    <div className="w-full h-full overflow-x-auto">
      <table className="w-full bg-white rounded-lg shadow border border-gray-200">
        <thead className="bg-gradient-to-r from-blue-100 to-purple-100">
          <tr>
            <th className="px-4 py-2 text-left font-bold text-blue-700">Order #</th>
            <th className="px-4 py-2 text-left font-bold text-blue-700">Platform ID</th>
            <th className="px-4 py-2 text-left font-bold text-blue-700">Status</th>
            <th className="px-4 py-2 text-left font-bold text-blue-700">Items</th>
            <th className="px-4 py-2 text-left font-bold text-blue-700">Order Value</th>
            <th className="px-4 py-2 text-left font-bold text-blue-700">Created By</th>
            <th className="px-4 py-2 text-left font-bold text-blue-700">Created At</th>
            <th className="px-4 py-2 text-left font-bold text-blue-700">Notes</th>
            <th className="px-4 py-2 text-left font-bold text-blue-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order._id} className="border-b hover:bg-blue-50/40 transition">
              <td className="px-4 py-2 font-mono text-blue-900">{order.orderNumber}</td>
              <td className="px-4 py-2">{order.platformOrderId}</td>
              <td className="px-4 py-2 capitalize">
                <span className={`px-2 py-1 rounded text-xs font-semibold 
                  ${order.orderStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                  ${order.orderStatus === 'processing' ? 'bg-blue-100 text-blue-800' : ''}
                  ${order.orderStatus === 'packaged' ? 'bg-purple-100 text-purple-800' : ''}
                  ${order.orderStatus === 'delivered' ? 'bg-green-100 text-green-800' : ''}
                  ${order.orderStatus === 'returned' ? 'bg-red-100 text-red-800' : ''}
                `}>
                  {order.orderStatus}
                </span>
              </td>
              <td className="px-4 py-2">
                <ul className="list-disc pl-4">
                  {order.items.map((item, idx) => {
                    const product = products.find(p => p._id === (item.productId && item.productId._id ? item.productId._id : item.productId)) || {};
                    let productLabel = '';
                    if (typeof product === 'object' && product !== null) {
                      productLabel = product.name || product.productName || product.sku || (typeof item.productId === 'string' ? item.productId : JSON.stringify(item.productId));
                    } else {
                      productLabel = typeof product === 'string' ? product : (typeof item.productId === 'string' ? item.productId : JSON.stringify(item.productId));
                    }
                    return <li key={idx}>{productLabel} <span className="text-xs text-gray-500">x {item.quantity}</span></li>;
                  })}
                </ul>
              </td>
              {/* Order Value from related package */}
              <td className="px-4 py-2 text-green-700 font-semibold text-right">
                {orderPackages[order._id] && typeof orderPackages[order._id].totalValue === 'number'
                  ? orderPackages[order._id].totalValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
                  : '-'}
              </td>
              {/* Created By */}
              <td className="px-4 py-2 text-blue-900">
                {order.createdBy?.fullName || '-'}
              </td>
              {/* Created At */}
              <td className="px-4 py-2 text-gray-600">
                {order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
              </td>
              <td className="px-4 py-2 text-gray-700 max-w-xs truncate">{order.notes}</td>
              <td className="px-4 py-2">
                {order.orderStatus === 'pending' && (
                  <button
                    onClick={() => handleProcess(order._id)}
                    disabled={processingId === order._id}
                    className="px-3 py-1 bg-purple-600 text-white rounded shadow hover:bg-purple-700 disabled:opacity-60"
                  >
                    {processingId === order._id ? 'Processing...' : 'Process'}
                  </button>
                )}
                {/* Only show Pack button if status is exactly 'processing' */}
                {order.orderStatus === 'processing' && (
                  <>
                    <button
                      onClick={() => handleShowPacking(order._id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded shadow hover:bg-blue-700 ml-2"
                      disabled={packingId === order._id}
                    >
                      Pack
                    </button>
                    {showPacking === order._id && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                        <textarea
                          className="w-full px-2 py-1 border border-blue-200 rounded mb-2"
                          placeholder="Packing notes or special instructions"
                          value={packingNotes}
                          onChange={e => setPackingNotes(e.target.value)}
                          rows={2}
                        />
                        {packError && <div className="text-red-600 text-sm mb-1">{packError}</div>}
                        <button
                          onClick={() => handlePackOrder(order._id)}
                          className="px-3 py-1 bg-green-600 text-white rounded shadow hover:bg-green-700 mr-2"
                          disabled={packingId === order._id}
                        >
                          {packingId === order._id ? 'Packing...' : 'Confirm Pack'}
                        </button>
                        <button
                          onClick={() => setShowPacking(null)}
                          className="px-2 py-1 text-gray-500 hover:text-gray-700"
                        >Cancel</button>
                      </div>
                    )}
                  </>
                )}
                {/* Show assign transport UI for ready_for_dispatch packages, badge for others */}
                {order.orderStatus === 'packaged' && (() => {
                  const pkg = orderPackages[order._id];
                  if (!pkg) {
                    return <span className="inline-block px-3 py-1 bg-gray-200 text-gray-700 rounded shadow text-xs font-semibold ml-2">No Package</span>;
                  }
                  if (pkg.packageStatus === 'ready_for_dispatch') {
                    return <>
                      <span className="inline-block px-3 py-1 bg-purple-200 text-purple-800 rounded shadow text-xs font-semibold ml-2">Packaged</span>
                      <button
                        onClick={() => handleShowAssignTransport(pkg._id)}
                        className="px-3 py-1 bg-green-600 text-white rounded shadow hover:bg-green-700 ml-2"
                      >
                        Assign Transport
                      </button>
                      {showAssignTransport === pkg._id && (
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                          <select
                            className="w-full px-2 py-1 border border-green-200 rounded mb-2"
                            value={assignTransporterId}
                            onChange={e => setAssignTransporterId(e.target.value)}
                          >
                            <option value="">Select Transporter</option>
                            {externalUsers.map(user => (
                              <option key={user._id || user.id} value={user._id || user.id}>{user.fullName || user.name} {user.phoneNumber ? `(${user.phoneNumber})` : ''}</option>
                            ))}
                          </select>
                          {assignTransportError && <div className="text-red-600 text-sm mb-1">{assignTransportError}</div>}
                          <button
                            onClick={() => handleAssignTransport(showAssignTransport)}
                            className="px-3 py-1 bg-blue-600 text-white rounded shadow hover:bg-blue-700 mr-2"
                            disabled={assigningTransport || !assignTransporterId}
                          >
                            {assigningTransport ? 'Assigning...' : 'Confirm Assign'}
                          </button>
                          <button
                            onClick={() => setShowAssignTransport(null)}
                            className="px-2 py-1 text-gray-500 hover:text-gray-700"
                          >Cancel</button>
                        </div>
                      )}
                    </>;
                  }
                  if (pkg.packageStatus === 'dispatched') {
                    return <span className="inline-block px-3 py-1 bg-green-200 text-green-800 rounded shadow text-xs font-semibold ml-2">Dispatched</span>;
                  }
                  if (pkg.packageStatus === 'in_transit') {
                    return <span className="inline-block px-3 py-1 bg-yellow-200 text-yellow-800 rounded shadow text-xs font-semibold ml-2">In Transit</span>;
                  }
                  if (pkg.packageStatus === 'delivered') {
                    return <span className="inline-block px-3 py-1 bg-blue-200 text-blue-800 rounded shadow text-xs font-semibold ml-2">Delivered</span>;
                  }
                  if (pkg.packageStatus === 'returned') {
                    return <span className="inline-block px-3 py-1 bg-red-200 text-red-800 rounded shadow text-xs font-semibold ml-2">Returned</span>;
                  }
                  // fallback for other statuses
                  return <span className="inline-block px-3 py-1 bg-gray-200 text-gray-700 rounded shadow text-xs font-semibold ml-2">{pkg.packageStatus}</span>;
                })()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
