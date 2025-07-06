import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  FaBoxOpen,
  FaPlus,
  FaSearch,
  FaFilter,
  FaExclamationTriangle,
  FaBarcode,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaArrowDown,
  FaArrowUp,
  FaChartBar,
  FaSyncAlt,
  FaTachometerAlt,
  FaWarehouse,
  FaClipboardList
} from 'react-icons/fa';
import {
  fetchInventory,
  addInventorySupply,
  markDamagedInventory,
  fetchRealTimeInventoryStatus,
  trackBatchByNumber,
  clearInventoryMessages
} from '../app/slices/inventorySlice';
import { fetchProducts } from '../app/slices/productSlice';
import { fetchSuppliers } from '../app/slices/supplierSlice';
import './InventoryPage.css';

const InventoryPage = () => {
  const dispatch = useDispatch();
  const {
    products,
    totalProducts,
    loading,
    error,
    message,
    realTimeStatus,
    batchTracking
  } = useSelector(state => state.inventory);
  const { user } = useSelector(state => state.auth);
  const { products: allProducts } = useSelector(state => state.products);
  const { suppliers, loading: suppliersLoading, error: suppliersError } = useSelector(state => state.suppliers);

  // Tab management
  const [activeTab, setActiveTab] = useState('overview');

  // Local state for UI
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Form states
  const [supplyForm, setSupplyForm] = useState({
    productId: '',
    supplierId: '',
    quantity: '',
    mfgDate: '',
    expDate: '',
    notes: ''
  });

  const [damagedForm, setDamagedForm] = useState({
    productId: '',
    batchId: '',
    quantity: '',
    reason: ''
  });

  // Load data on component mount
  useEffect(() => {
    dispatch(fetchInventory());
    dispatch(fetchProducts());
    dispatch(fetchRealTimeInventoryStatus());
    dispatch(fetchSuppliers());
  }, [dispatch]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (message || error) {
      const timer = setTimeout(() => {
        dispatch(clearInventoryMessages());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message, error, dispatch]);

  // Handle form submissions
  const handleAddSupply = async (e) => {
    e.preventDefault();
    await dispatch(addInventorySupply(supplyForm));
    setSupplyForm({
      productId: '',
      supplierId: '',
      quantity: '',
      mfgDate: '',
      expDate: '',
      notes: ''
    });
  };

  const handleMarkDamaged = async (e) => {
    e.preventDefault();
    await dispatch(markDamagedInventory(damagedForm));
    setDamagedForm({
      productId: '',
      batchId: '',
      quantity: '',
      reason: ''
    });
  };

  // Helper function to get batches for selected product
  const getAvailableBatches = () => {
    if (!damagedForm.productId || !products) return [];
    const selectedProduct = products.find(p => p.product._id === damagedForm.productId);
    return selectedProduct ? selectedProduct.batches.filter(batch => batch.quantity > 0) : [];
  };

  // Tab definitions
  const inventoryTabs = [
    { id: 'overview', label: 'Overview', icon: <FaTachometerAlt /> },
    { id: 'stock', label: 'Stock Management', icon: <FaWarehouse /> },
    { id: 'add-supply', label: 'Add Supply', icon: <FaPlus /> },
    { id: 'mark-damaged', label: 'Mark Damaged', icon: <FaExclamationTriangle /> },
    { id: 'batch-tracking', label: 'Batch Tracking', icon: <FaBarcode /> },
  ];

  // Calculate inventory stats
  const inventoryStats = {
    totalItems: products.reduce((sum, p) => sum + p.totalQuantity, 0),
    totalProducts: products.length,
    lowStockItems: products.filter(p => p.totalQuantity < 10).length,
    outOfStockItems: products.filter(p => p.totalQuantity === 0).length
  };

  // Filter products based on search and filters
  const filteredProducts = products.filter(item => {
    const matchesSearch = item.product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.product.productCategory === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Toggle row expansion
  const toggleRow = (productId) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(productId)) {
      newExpandedRows.delete(productId);
    } else {
      newExpandedRows.add(productId);
    }
    setExpandedRows(newExpandedRows);
  };

  // Render Overview Tab
  const renderOverviewTab = () => (
    <div className="tab-content">
      <h2><FaChartBar /> Dashboard Overview</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-value">{inventoryStats.totalItems}</div>
              <div className="stat-label">Total Items</div>
            </div>
            <FaBoxOpen className="stat-icon text-blue-500" />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-value">{inventoryStats.totalProducts}</div>
              <div className="stat-label">Product Types</div>
            </div>
            <FaChartBar className="stat-icon text-green-500" />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-value text-yellow-600">{inventoryStats.lowStockItems}</div>
              <div className="stat-label">Low Stock</div>
            </div>
            <FaExclamationTriangle className="stat-icon text-yellow-500" />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div>
              <div className="stat-value text-red-600">{inventoryStats.outOfStockItems}</div>
              <div className="stat-label">Out of Stock</div>
            </div>
            <FaTimesCircle className="stat-icon text-red-500" />
          </div>
        </div>
      </div>

      <div className="form-group">
        <button
          onClick={() => dispatch(fetchInventory())}
          className="btn btn-primary"
        >
          <FaSyncAlt />
          Refresh Data
        </button>
      </div>
    </div>
  );

  // Render Stock Management Tab
  const renderStockManagementTab = () => (
    <div className="tab-content">
      <h2><FaWarehouse /> Stock Management</h2>

      <div className="form-group">
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10"
              placeholder="Search by product name or SKU..."
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="form-select w-64"
          >
            <option value="all">All Categories</option>
            <option value="electronics">Electronics</option>
            <option value="clothing">Clothing</option>
            <option value="food">Food</option>
            <option value="books">Books</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <FaSpinner className="animate-spin text-4xl text-gray-400 mx-auto mb-4" />
          <p>Loading inventory...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 p-3 text-left">Product</th>
                <th className="border border-gray-200 p-3 text-left">SKU</th>
                <th className="border border-gray-200 p-3 text-left">Category</th>
                <th className="border border-gray-200 p-3 text-left">Total Quantity</th>
                <th className="border border-gray-200 p-3 text-left">Status</th>
                <th className="border border-gray-200 p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((item) => (
                <React.Fragment key={item.product._id}>
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-200 p-3">{item.product.productName}</td>
                    <td className="border border-gray-200 p-3">{item.product.sku}</td>
                    <td className="border border-gray-200 p-3">{item.product.productCategory}</td>
                    <td className="border border-gray-200 p-3">{item.totalQuantity}</td>
                    <td className="border border-gray-200 p-3">
                      {item.totalQuantity === 0 ? (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">Out of Stock</span>
                      ) : item.totalQuantity < 10 ? (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">Low Stock</span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">In Stock</span>
                      )}
                    </td>
                    <td className="border border-gray-200 p-3">
                      <button
                        onClick={() => toggleRow(item.product._id)}
                        className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                      >
                        <FaEye />
                        {expandedRows.has(item.product._id) ? 'Hide' : 'View'} Batches
                        {expandedRows.has(item.product._id) ? <FaArrowUp /> : <FaArrowDown />}
                      </button>
                    </td>
                  </tr>
                  {expandedRows.has(item.product._id) && (
                    <tr>
                      <td colSpan="6" className="border border-gray-200 p-4 bg-gray-50">
                        <h4 className="font-medium mb-3">Batch Details</h4>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {item.batches.map((batch) => (
                            <div key={batch.batchId} className="bg-white p-4 rounded border">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h5 className="font-medium">{batch.batchNumber}</h5>
                                  <p className="text-sm text-gray-600">Quantity: {batch.quantity}</p>
                                </div>
                                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                                  ID: {batch.batchId}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-600">MFG Date:</p>
                                  <p>{new Date(batch.mfgDate).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <p className="text-gray-600">Exp Date:</p>
                                  <p>{new Date(batch.expDate).toLocaleDateString()}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Render Add Supply Tab
  const renderAddSupplyTab = () => (
    <div className="tab-content">
      <h2><FaPlus /> Add Inventory Supply</h2>

      <div className="form-container">
        <form onSubmit={handleAddSupply}>
          <div className="form-group">
            <label className="form-label">Product</label>
            <select
              value={supplyForm.productId}
              onChange={(e) => setSupplyForm({ ...supplyForm, productId: e.target.value })}
              className="form-select"
              required
            >
              <option value="">Select Product</option>
              {allProducts.map(product => (
                <option key={product._id} value={product._id}>
                  {product.productName} ({product.sku})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Supplier</label>
            <select
              value={supplyForm.supplierId}
              onChange={(e) => setSupplyForm({ ...supplyForm, supplierId: e.target.value })}
              className="form-select"
              required
            >
              <option value="">Select Supplier</option>
              {suppliers && suppliers.length > 0 ? suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.companyName} - {supplier.fullName}
                </option>
              )) : (
                <option value="" disabled>
                  {suppliersLoading ? 'Loading suppliers...' : 'No suppliers available'}
                </option>
              )}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Quantity</label>
            <input
              type="number"
              min="1"
              value={supplyForm.quantity}
              onChange={(e) => setSupplyForm({ ...supplyForm, quantity: e.target.value })}
              className="form-input"
              placeholder="Enter quantity"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Manufacturing Date</label>
            <input
              type="date"
              value={supplyForm.mfgDate}
              onChange={(e) => setSupplyForm({ ...supplyForm, mfgDate: e.target.value })}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Expiry Date</label>
            <input
              type="date"
              value={supplyForm.expDate}
              onChange={(e) => setSupplyForm({ ...supplyForm, expDate: e.target.value })}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <textarea
              value={supplyForm.notes}
              onChange={(e) => setSupplyForm({ ...supplyForm, notes: e.target.value })}
              className="form-textarea"
              rows="3"
              placeholder="Enter any additional notes..."
            />
          </div>

          <div className="btn-group">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading && <FaSpinner className="animate-spin" />}
              Add Supply
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Render Mark Damaged Tab
  const renderMarkDamagedTab = () => (
    <div className="tab-content">
      <h2><FaExclamationTriangle /> Mark Items as Damaged</h2>

      <div className="form-container">
        <form onSubmit={handleMarkDamaged}>
          <div className="form-group">
            <label className="form-label">Product</label>
            <select
              value={damagedForm.productId}
              onChange={(e) => setDamagedForm({ ...damagedForm, productId: e.target.value, batchId: '' })}
              className="form-select"
              required
            >
              <option value="">Select Product</option>
              {products.filter(p => p.totalQuantity > 0).map(item => (
                <option key={item.product._id} value={item.product._id}>
                  {item.product.productName} ({item.product.sku}) - Available: {item.totalQuantity}
                </option>
              ))}
            </select>
          </div>

          {damagedForm.productId && (
            <div className="form-group">
              <label className="form-label">Batch</label>
              <select
                value={damagedForm.batchId}
                onChange={(e) => setDamagedForm({ ...damagedForm, batchId: e.target.value })}
                className="form-select"
                required
              >
                <option value="">Select Batch</option>
                {getAvailableBatches().map(batch => (
                  <option key={batch.batchId} value={batch.batchId}>
                    {batch.batchNumber} - Qty: {batch.quantity} - Exp: {new Date(batch.expDate).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <div className="form-help">
                Select a batch from the available inventory
              </div>
            </div>
          )}

          {damagedForm.batchId && (
            <div className="form-group">
              <label className="form-label">Quantity to Mark as Damaged</label>
              <input
                type="number"
                min="1"
                max={getAvailableBatches().find(b => b.batchId === damagedForm.batchId)?.quantity || 1}
                value={damagedForm.quantity}
                onChange={(e) => setDamagedForm({ ...damagedForm, quantity: e.target.value })}
                className="form-input"
                placeholder="Enter quantity"
                required
              />
              <div className="form-help">
                Maximum available: {getAvailableBatches().find(b => b.batchId === damagedForm.batchId)?.quantity || 0}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Reason for Damage</label>
            <textarea
              value={damagedForm.reason}
              onChange={(e) => setDamagedForm({ ...damagedForm, reason: e.target.value })}
              className="form-textarea"
              rows="3"
              placeholder="Describe the reason for marking items as damaged..."
              required
            />
          </div>

          <div className="btn-group">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-danger"
            >
              {loading && <FaSpinner className="animate-spin" />}
              Mark as Damaged
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Render Batch Tracking Tab
  const renderBatchTrackingTab = () => (
    <div className="tab-content">
      <h2><FaBarcode /> Batch Tracking</h2>

      <div className="form-container">
        <div className="form-group">
          <label className="form-label">Batch Number</label>
          <input
            type="text"
            className="form-input"
            placeholder="Enter batch number to track..."
          />
          <div className="form-help">
            Enter a batch number to view its tracking information and current status
          </div>
        </div>

        <div className="btn-group">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => alert('Batch tracking feature coming soon!')}
          >
            <FaBarcode />
            Track Batch
          </button>
        </div>

        {realTimeStatus && (
          <div className="mt-6 p-4 bg-gray-50 rounded">
            <h3 className="font-medium mb-2">Real-time Status</h3>
            <pre className="text-sm">{JSON.stringify(realTimeStatus, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'stock':
        return renderStockManagementTab();
      case 'add-supply':
        return renderAddSupplyTab();
      case 'mark-damaged':
        return renderMarkDamagedTab();
      case 'batch-tracking':
        return renderBatchTrackingTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <h1>
          <FaBoxOpen />
          Inventory Management
        </h1>
        <p>Manage your inventory, track stock levels, and add new supplies | User: {user?.fullName} | Role: {user?.role}</p>
      </div>

      {(message || error) && (
        <div className={`message ${message ? 'message-success' : 'message-error'}`}>
          {message || error}
        </div>
      )}

      <div className="inventory-navigation">
        {inventoryTabs.map((tab) => (
          <button
            key={tab.id}
            className={`inventory-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="inventory-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default InventoryPage;
