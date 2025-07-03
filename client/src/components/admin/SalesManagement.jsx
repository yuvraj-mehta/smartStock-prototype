import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { config } from '../../../config/config';
import './SalesManagement.css';

const SalesManagement = () => {
  const { token, user } = useSelector((state) => state.auth);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'dispatched', 'returned'
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    productId: '',
    batchId: '',
    quantity: 1,
    action: 'dispatched',
    notes: '',
    referenceItemIds: []
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

      const [salesRes, productsRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/sales/all`, { headers }),
        axios.get(`${API_BASE_URL}/product/all`, { headers })
      ]);

      if (salesRes.status === 'fulfilled') {
        setSales(salesRes.value.data || []);
      }
      if (productsRes.status === 'fulfilled') {
        setProducts(productsRes.value.data.products || []);
      }
    } catch (err) {
      setError('Failed to fetch sales data');
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

  const handleRecordSale = async (e) => {
    e.preventDefault();
    try {
      const saleData = {
        ...formData,
        warehouseId: user.assignedWarehouseId?._id || user.assignedWarehouseId,
        quantity: parseInt(formData.quantity)
      };

      const response = await axios.post(`${API_BASE_URL}/sales/record`, saleData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      alert('Sale recorded successfully!');
      setShowCreateForm(false);
      resetForm();
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record sale');
    }
  };

  const resetForm = () => {
    setFormData({
      productId: '',
      batchId: '',
      quantity: 1,
      action: 'dispatched',
      notes: '',
      referenceItemIds: []
    });
  };

  const filteredSales = sales.filter(sale => {
    const matchesFilter = filter === 'all' || sale.action === filter;
    const matchesSearch = !searchTerm ||
      sale.productId?.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.packageId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sale.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const getSaleStats = () => {
    const dispatched = sales.filter(sale => sale.action === 'dispatched').length;
    const returned = sales.filter(sale => sale.action === 'returned').length;
    const totalQuantity = sales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);

    return { dispatched, returned, total: sales.length, totalQuantity };
  };

  const stats = getSaleStats();

  if (loading) {
    return <div className="loading">Loading sales data...</div>;
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
    <div className="sales-management">
      <div className="sales-header">
        <div className="header-content">
          <h2>Sales Management</h2>
          <p>Track and manage all sales transactions</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          + Record New Sale
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card dispatched">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>{stats.dispatched}</h3>
            <p>Items Dispatched</p>
          </div>
        </div>
        <div className="stat-card returned">
          <div className="stat-icon">↩️</div>
          <div className="stat-content">
            <h3>{stats.returned}</h3>
            <p>Items Returned</p>
          </div>
        </div>
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>{stats.total}</h3>
            <p>Total Transactions</p>
          </div>
        </div>
        <div className="stat-card quantity">
          <div className="stat-icon">🔢</div>
          <div className="stat-content">
            <h3>{stats.totalQuantity}</h3>
            <p>Total Quantity</p>
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
            All Sales ({sales.length})
          </button>
          <button
            className={`filter-tab ${filter === 'dispatched' ? 'active' : ''}`}
            onClick={() => setFilter('dispatched')}
          >
            Dispatched ({stats.dispatched})
          </button>
          <button
            className={`filter-tab ${filter === 'returned' ? 'active' : ''}`}
            onClick={() => setFilter('returned')}
          >
            Returned ({stats.returned})
          </button>
        </div>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by product, package ID, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Record Sale Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Record New Sale</h3>
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
            <form onSubmit={handleRecordSale} className="sale-form">
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
                  <label>Action *</label>
                  <select
                    name="action"
                    value={formData.action}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="dispatched">Dispatched</option>
                    <option value="returned">Returned</option>
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
                  <label>Batch ID (Optional)</label>
                  <input
                    type="text"
                    name="batchId"
                    value={formData.batchId}
                    onChange={handleInputChange}
                    placeholder="Enter batch ID if applicable"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Add any additional notes..."
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
                  Record Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sales Table */}
      <div className="sales-table-container">
        <table className="sales-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Action</th>
              <th>Quantity</th>
              <th>Package ID</th>
              <th>Batch</th>
              <th>Notes</th>
              <th>Items</th>
            </tr>
          </thead>
          <tbody>
            {filteredSales.map((sale) => (
              <tr key={sale._id}>
                <td>
                  <div className="date-info">
                    <span className="date">
                      {new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}
                    </span>
                    <span className="time">
                      {new Date(sale.saleDate || sale.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="product-info">
                    <span className="product-name">
                      {sale.productId?.productName || 'Unknown Product'}
                    </span>
                    <span className="product-sku">
                      SKU: {sale.productId?.sku || 'N/A'}
                    </span>
                  </div>
                </td>
                <td>
                  <span className={`action-badge action-${sale.action}`}>
                    {sale.action}
                  </span>
                </td>
                <td className="quantity">{sale.quantity}</td>
                <td>
                  {sale.packageId ? (
                    <span className="package-id">{sale.packageId}</span>
                  ) : (
                    <span className="no-package">-</span>
                  )}
                </td>
                <td>
                  {sale.batchId?.batchNumber ? (
                    <span className="batch-number">{sale.batchId.batchNumber}</span>
                  ) : (
                    <span className="no-batch">-</span>
                  )}
                </td>
                <td>
                  <span className="notes">
                    {sale.notes || '-'}
                  </span>
                </td>
                <td>
                  <span className="item-count">
                    {sale.referenceItemIds?.length || 0} items
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredSales.length === 0 && (
        <div className="no-sales">
          <div className="empty-icon">📊</div>
          <h3>No Sales Found</h3>
          <p>
            {searchTerm || filter !== 'all'
              ? 'No sales match your current filter or search criteria.'
              : 'No sales have been recorded yet. Record your first sale to get started.'
            }
          </p>
          {(!searchTerm && filter === 'all') && (
            <button
              className="btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              Record First Sale
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SalesManagement;
