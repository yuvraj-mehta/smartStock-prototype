import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { config } from '../../config/config';
import './SalesPage.css';

const SalesPage = () => {
  const { token, user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('sales');
  const [sales, setSales] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [formData, setFormData] = useState({
    items: [{ productId: '', quantity: 1, unitPrice: 0 }],
    customerInfo: {
      name: '',
      email: '',
      phone: ''
    },
    paymentMethod: 'cash'
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

      const [salesRes, returnsRes, productsRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/sales/all`, { headers }),
        axios.get(`${API_BASE_URL}/return/all`, { headers }),
        axios.get(`${API_BASE_URL}/product/all`, { headers })
      ]);

      if (salesRes.status === 'fulfilled') {
        setSales(salesRes.value.data.sales || []);
      }

      if (returnsRes.status === 'fulfilled') {
        setReturns(returnsRes.value.data.returns || []);
      }

      if (productsRes.status === 'fulfilled') {
        setProducts(productsRes.value.data.products || []);
      }

    } catch (err) {
      setError('Failed to fetch data');
      console.error('Fetch data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleItemChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: 1, unitPrice: 0 }]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleRecordSale = async (e) => {
    e.preventDefault();

    // Validate form
    if (formData.items.some(item => !item.productId || item.quantity <= 0)) {
      alert('Please fill all item details');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/sales/record`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      alert('Sale recorded successfully!');
      setShowRecordForm(false);
      setFormData({
        items: [{ productId: '', quantity: 1, unitPrice: 0 }],
        customerInfo: { name: '', email: '', phone: '' },
        paymentMethod: 'cash'
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record sale');
    }
  };

  const filterData = (data, type) => {
    let filtered = data;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        return (
          (item.customerInfo?.name?.toLowerCase().includes(searchLower)) ||
          (item.orderNumber?.toLowerCase().includes(searchLower)) ||
          (item._id?.toLowerCase().includes(searchLower))
        );
      });
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(item =>
        new Date(item.createdAt) >= filterDate
      );
    }

    return filtered;
  };

  const getSalesStats = () => {
    const totalSales = sales.length;
    const totalReturns = returns.length;
    const totalRevenue = sales.reduce((sum, sale) => {
      return sum + (sale.items?.reduce((itemSum, item) =>
        itemSum + (item.quantity * item.unitPrice), 0) || 0);
    }, 0);
    const returnRate = totalSales > 0 ? ((totalReturns / totalSales) * 100).toFixed(1) : 0;

    return { totalSales, totalReturns, totalRevenue, returnRate };
  };

  const stats = getSalesStats();

  if (loading) {
    return (
      <div className="sales-page-loading">
        <div className="loading-spinner"></div>
        <p>Loading sales data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sales-page-error">
        <h3>Error Loading Data</h3>
        <p>{error}</p>
        <button onClick={fetchData} className="retry-btn">Retry</button>
      </div>
    );
  }

  return (
    <div className="sales-page">
      <div className="sales-header">
        <h1>Sales & Returns Management</h1>
        <p>Track sales performance and manage returns</p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card revenue">
          <div className="stat-icon">💰</div>
          <div className="stat-details">
            <h3>${stats.totalRevenue.toFixed(2)}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
        <div className="stat-card sales">
          <div className="stat-icon">📈</div>
          <div className="stat-details">
            <h3>{stats.totalSales}</h3>
            <p>Total Sales</p>
          </div>
        </div>
        <div className="stat-card returns">
          <div className="stat-icon">↩️</div>
          <div className="stat-details">
            <h3>{stats.totalReturns}</h3>
            <p>Total Returns</p>
          </div>
        </div>
        <div className="stat-card rate">
          <div className="stat-icon">📊</div>
          <div className="stat-details">
            <h3>{stats.returnRate}%</h3>
            <p>Return Rate</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab ${activeTab === 'sales' ? 'active' : ''}`}
          onClick={() => setActiveTab('sales')}
        >
          💰 Sales ({sales.length})
        </button>
        <button
          className={`tab ${activeTab === 'returns' ? 'active' : ''}`}
          onClick={() => setActiveTab('returns')}
        >
          ↩️ Returns ({returns.length})
        </button>
      </div>

      {/* Controls */}
      <div className="controls-section">
        <div className="search-filters">
          <input
            type="text"
            placeholder="Search by customer name, order number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="date-filter"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
          </select>
        </div>

        {(user?.role === 'admin' || user?.role === 'staff') && activeTab === 'sales' && (
          <button
            className="btn-primary"
            onClick={() => setShowRecordForm(true)}
          >
            + Record New Sale
          </button>
        )}
      </div>

      {/* Record Sale Modal */}
      {showRecordForm && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <h3>Record New Sale</h3>
              <button
                className="close-btn"
                onClick={() => setShowRecordForm(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleRecordSale} className="sale-form">
              <div className="customer-section">
                <h4>Customer Information</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Customer Name</label>
                    <input
                      type="text"
                      name="customerInfo.name"
                      value={formData.customerInfo.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="customerInfo.email"
                      value={formData.customerInfo.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      name="customerInfo.phone"
                      value={formData.customerInfo.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              <div className="items-section">
                <div className="items-header">
                  <h4>Items</h4>
                  <button type="button" onClick={addItem} className="btn-add-item">
                    + Add Item
                  </button>
                </div>

                {formData.items.map((item, index) => (
                  <div key={index} className="item-row">
                    <div className="form-group">
                      <label>Product</label>
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                        required
                      >
                        <option value="">Select Product</option>
                        {products.map(product => (
                          <option key={product._id} value={product._id}>
                            {product.name} - ${product.price}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value))}
                        min="1"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Unit Price ($)</label>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="btn-remove-item"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="payment-section">
                <div className="form-group">
                  <label>Payment Method</label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                  >
                    <option value="cash">Cash</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="debit_card">Debit Card</option>
                    <option value="digital_wallet">Digital Wallet</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowRecordForm(false)}>
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

      {/* Content */}
      <div className="content-section">
        {activeTab === 'sales' && (
          <div className="sales-list">
            {filterData(sales, 'sales').length > 0 ? (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Total Amount</th>
                      <th>Payment Method</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterData(sales, 'sales').map((sale) => (
                      <tr key={sale._id}>
                        <td className="order-id">{sale._id.slice(-8)}</td>
                        <td>
                          <div className="customer-info">
                            <div className="name">{sale.customerInfo?.name || 'N/A'}</div>
                            <div className="email">{sale.customerInfo?.email || ''}</div>
                          </div>
                        </td>
                        <td>
                          <div className="items-summary">
                            {sale.items?.length || 0} item(s)
                          </div>
                        </td>
                        <td className="amount">
                          ${sale.items?.reduce((sum, item) =>
                            sum + (item.quantity * item.unitPrice), 0).toFixed(2) || '0.00'}
                        </td>
                        <td>
                          <span className="payment-method">
                            {sale.paymentMethod?.replace('_', ' ') || 'N/A'}
                          </span>
                        </td>
                        <td>{new Date(sale.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-view">View</button>
                            <button className="btn-print">Print</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">💰</div>
                <h3>No Sales Found</h3>
                <p>No sales match your current filters.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'returns' && (
          <div className="returns-list">
            {filterData(returns, 'returns').length > 0 ? (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Return ID</th>
                      <th>Original Order</th>
                      <th>Customer</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterData(returns, 'returns').map((returnItem) => (
                      <tr key={returnItem._id}>
                        <td className="return-id">{returnItem._id.slice(-8)}</td>
                        <td>{returnItem.orderId?.slice(-8) || 'N/A'}</td>
                        <td>
                          <div className="customer-info">
                            <div className="name">{returnItem.customerInfo?.name || 'N/A'}</div>
                          </div>
                        </td>
                        <td>{returnItem.reason || 'Not specified'}</td>
                        <td>
                          <span className={`status-badge status-${returnItem.status}`}>
                            {returnItem.status || 'pending'}
                          </span>
                        </td>
                        <td>{new Date(returnItem.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-view">View</button>
                            <button className="btn-process">Process</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">↩️</div>
                <h3>No Returns Found</h3>
                <p>No returns match your current filters.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesPage;
