import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { config } from '../../../../config/config.js';
import './ReturnsManagement.css';

const ReturnsManagement = () => {
  const { token, user } = useSelector((state) => state.auth);
  const [returns, setReturns] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    productId: '',
    batchId: '',
    quantity: 1,
    reason: '',
    returnType: 'customer_request',
    refundAmount: 0,
    orderId: ''
  });

  const API_BASE_URL = config.apiBaseUrl;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [returnsRes, productsRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/return`, { headers }),
        axios.get(`${API_BASE_URL}/product/all`, { headers })
      ]);

      if (returnsRes.status === 'fulfilled') {
        setReturns(returnsRes.value.data || []);
      }
      if (productsRes.status === 'fulfilled') {
        setProducts(productsRes.value.data.products || []);
      }
    } catch (err) {
      setError('Failed to fetch returns data');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateReturn = async (e) => {
    e.preventDefault();
    try {
      const returnData = {
        ...formData,
        warehouseId: user.assignedWarehouseId?._id || user.assignedWarehouseId,
        quantity: parseInt(formData.quantity),
        refundAmount: parseFloat(formData.refundAmount) || 0,
        returnedBy: user._id
      };

      const response = await axios.post(`${API_BASE_URL}/return`, returnData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      alert('Return recorded successfully!');
      setShowCreateForm(false);
      resetForm();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record return');
    }
  };

  const resetForm = () => {
    setFormData({
      productId: '',
      batchId: '',
      quantity: 1,
      reason: '',
      returnType: 'customer_request',
      refundAmount: 0,
      orderId: ''
    });
  };

  const filteredReturns = returns.filter(returnItem => {
    const matchesFilter = filter === 'all' || returnItem.status === filter;
    const matchesSearch = !searchTerm ||
      returnItem.productId?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.returnNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      returnItem.reason?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getReturnStats = () => {
    const pending = returns.filter(r => r.status === 'pending').length;
    const received = returns.filter(r => r.status === 'received').length;
    const approved = returns.filter(r => r.status === 'approved').length;
    const refunded = returns.filter(r => r.status === 'refunded').length;
    const totalRefund = returns
      .filter(r => r.refundAmount)
      .reduce((sum, r) => sum + (r.refundAmount || 0), 0);

    return { pending, received, approved, refunded, total: returns.length, totalRefund };
  };

  const stats = getReturnStats();

  const returnTypes = [
    { value: 'defective', label: 'Defective' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'wrong_item', label: 'Wrong Item' },
    { value: 'customer_request', label: 'Customer Request' },
    { value: 'quality_issue', label: 'Quality Issue' }
  ];

  const statusOptions = ['pending', 'received', 'inspected', 'approved', 'rejected', 'refunded'];

  if (loading) {
    return <div className="loading">Loading returns data...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={fetchData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="returns-management">
      <div className="returns-header">
        <div className="header-content">
          <h2>Returns Management</h2>
          <p>Track and process product returns and refunds</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          + Process New Return
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <h3>{stats.pending}</h3>
            <p>Pending Returns</p>
          </div>
        </div>
        <div className="stat-card received">
          <div className="stat-icon">📥</div>
          <div className="stat-content">
            <h3>{stats.received}</h3>
            <p>Received Returns</p>
          </div>
        </div>
        <div className="stat-card approved">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>{stats.approved}</h3>
            <p>Approved Returns</p>
          </div>
        </div>
        <div className="stat-card refund">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>${stats.totalRefund.toFixed(2)}</h3>
            <p>Total Refunds</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="controls">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Returns ({returns.length})
          </button>
          {statusOptions.map(status => (
            <button
              key={status}
              className={`filter-tab ${filter === status ? 'active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({returns.filter(r => r.status === status).length})
            </button>
          ))}
        </div>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by product, return number, or reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Create Return Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Process New Return</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateReturn} className="return-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Product *</label>
                  <select
                    name="productId"
                    value={formData.productId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Product</option>
                    {products.map(product => (
                      <option key={product._id} value={product._id}>
                        {product.name} (SKU: {product.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Return Type *</label>
                  <select
                    name="returnType"
                    value={formData.returnType}
                    onChange={handleInputChange}
                    required
                  >
                    {returnTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Refund Amount ($)</label>
                  <input
                    type="number"
                    name="refundAmount"
                    value={formData.refundAmount}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Batch ID (Optional)</label>
                  <input
                    type="text"
                    name="batchId"
                    value={formData.batchId}
                    onChange={handleInputChange}
                    placeholder="Enter batch ID if applicable"
                  />
                </div>
                <div className="form-group">
                  <label>Order ID (Optional)</label>
                  <input
                    type="text"
                    name="orderId"
                    value={formData.orderId}
                    onChange={handleInputChange}
                    placeholder="Enter order ID if applicable"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Reason for Return *</label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows="3"
                  required
                  placeholder="Describe the reason for return..."
                />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Process Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Returns Table */}
      <div className="returns-table-container">
        <table className="returns-table">
          <thead>
            <tr>
              <th>Return #</th>
              <th>Date</th>
              <th>Product</th>
              <th>Type</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Refund</th>
              <th>Reason</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredReturns.map((returnItem) => (
              <tr key={returnItem._id}>
                <td>
                  <span className="return-number">{returnItem.returnNumber}</span>
                </td>
                <td>
                  <div className="date-info">
                    <span className="date">
                      {new Date(returnItem.createdAt).toLocaleDateString()}
                    </span>
                    <span className="time">
                      {new Date(returnItem.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="product-info">
                    <span className="product-name">
                      {returnItem.productId?.productName || 'Unknown Product'}
                    </span>
                    <span className="product-sku">
                      SKU: {returnItem.productId?.sku || 'N/A'}
                    </span>
                  </div>
                </td>
                <td>
                  <span className={`type-badge type-${returnItem.returnType}`}>
                    {returnItem.returnType?.replace('_', ' ')}
                  </span>
                </td>
                <td className="quantity">{returnItem.quantity}</td>
                <td>
                  <span className={`status-badge status-${returnItem.status}`}>
                    {returnItem.status}
                  </span>
                </td>
                <td>
                  {returnItem.refundAmount ? (
                    <span className="refund-amount">
                      ${returnItem.refundAmount.toFixed(2)}
                    </span>
                  ) : (
                    <span className="no-refund">-</span>
                  )}
                </td>
                <td>
                  <span className="reason" title={returnItem.reason}>
                    {returnItem.reason?.length > 50
                      ? `${returnItem.reason.substring(0, 50)}...`
                      : returnItem.reason
                    }
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-view">View</button>
                    {returnItem.status === 'pending' && (
                      <button className="btn-approve">Approve</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredReturns.length === 0 && (
        <div className="no-returns">
          <div className="empty-icon">📦</div>
          <h3>No Returns Found</h3>
          <p>
            {searchTerm || filter !== 'all'
              ? 'No returns match your current filter or search criteria.'
              : 'No returns have been processed yet. Process your first return to get started.'
            }
          </p>
          {(!searchTerm && filter === 'all') && (
            <button
              className="btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              Process First Return
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ReturnsManagement;
