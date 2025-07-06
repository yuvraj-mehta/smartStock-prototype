import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  FaBoxOpen,
  FaPlus,
  FaSearch,
  FaFilter,
  FaExclamationTriangle,
  FaExclamationCircle,
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
  const [batchTrackingForm, setBatchTrackingForm] = useState({
    batchNumber: ''
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

  // Helper function to get batches for selected product
  const getAvailableBatches = () => {
    if (!damagedForm.productId || !products) return [];
    const selectedProduct = products.find(p => p.product._id === damagedForm.productId);
    return selectedProduct ? selectedProduct.batches.filter(batch => batch.quantity > 0) : [];
  };

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

  const handleBatchTracking = async (e) => {
    e.preventDefault();
    await dispatch(trackBatchByNumber(batchTrackingForm.batchNumber));
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

  // Calculate inventory stats
  const inventoryStats = {
    totalItems: products.reduce((sum, p) => sum + p.totalQuantity, 0),
    totalProducts: products.length,
    lowStockItems: products.filter(p => p.totalQuantity < 10).length,
    outOfStockItems: products.filter(p => p.totalQuantity === 0).length,
    damagedItems: products.reduce((sum, p) => {
      return sum + (p.batches || []).reduce((batchSum, batch) => {
        return batchSum + (batch.damagedQuantity || 0);
      }, 0);
    }, 0)
  };

  // Define tabs
  const inventoryTabs = [
    { id: 'overview', label: 'Overview', icon: FaTachometerAlt },
    { id: 'stock', label: 'Stock Management', icon: FaBoxOpen },
    { id: 'add-supply', label: 'Add Supply', icon: FaPlus },
    { id: 'mark-damaged', label: 'Mark Damaged', icon: FaExclamationTriangle },
    { id: 'tracking', label: 'Batch Tracking', icon: FaBarcode },
  ];

  // Render Overview Tab
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Items</p>
              <p className="text-2xl font-bold text-blue-600">
                {inventoryStats.totalItems.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <FaBoxOpen className="text-white text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Product Types</p>
              <p className="text-2xl font-bold text-green-600">
                {inventoryStats.totalProducts.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <FaChartBar className="text-white text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Low Stock</p>
              <p className="text-2xl font-bold text-amber-600">
                {inventoryStats.lowStockItems.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-amber-500 rounded-lg">
              <FaExclamationTriangle className="text-white text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">
                {inventoryStats.outOfStockItems.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-red-500 rounded-lg">
              <FaTimesCircle className="text-white text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Damaged Items</p>
              <p className="text-2xl font-bold text-orange-600">
                {inventoryStats.damagedItems.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-orange-500 rounded-lg">
              <FaExclamationCircle className="text-white text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500 rounded-lg">
            <FaClipboardList className="text-white text-lg" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => setActiveTab('add-supply')}
            className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
          >
            <div className="p-2 bg-blue-500 rounded-lg">
              <FaPlus className="text-white text-lg" />
            </div>
            <div className="text-left">
              <span className="text-blue-800 font-medium block">Add New Supply</span>
              <span className="text-blue-600 text-sm">Restock inventory items</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('mark-damaged')}
            className="flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
          >
            <div className="p-2 bg-red-500 rounded-lg">
              <FaExclamationTriangle className="text-white text-lg" />
            </div>
            <div className="text-left">
              <span className="text-red-800 font-medium block">Mark Damaged</span>
              <span className="text-red-600 text-sm">Report damaged items</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('tracking')}
            className="flex items-center gap-3 p-4 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
          >
            <div className="p-2 bg-amber-500 rounded-lg">
              <FaBarcode className="text-white text-lg" />
            </div>
            <div className="text-left">
              <span className="text-amber-800 font-medium block">Track Batch</span>
              <span className="text-amber-600 text-sm">Monitor batch status</span>
            </div>
          </button>
        </div>
      </div>

      {/* Inventory Summary */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-indigo-500 rounded-lg">
            <FaWarehouse className="text-white text-lg" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Recent Inventory Overview</h3>
        </div>
        <div className="space-y-3">
          {products.slice(0, 5).map(item => (
            <div key={item.product._id} className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-500 rounded-lg">
                  <FaBoxOpen className="text-white text-sm" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{item.product.productName}</p>
                  <p className="text-sm text-gray-600 font-mono">{item.product.sku}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{item.totalQuantity.toLocaleString()}<span className="text-sm font-normal text-gray-600 ml-1">units</span></p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${item.totalQuantity === 0 ? 'bg-red-100 text-red-800' :
                  item.totalQuantity < 10 ? 'bg-amber-100 text-amber-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                  {item.totalQuantity === 0 ? 'Out of Stock' :
                    item.totalQuantity < 10 ? 'Low Stock' : 'In Stock'}
                </span>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setActiveTab('stock')}
          className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 px-4 rounded-lg transition-colors font-medium"
        >
          View Complete Inventory →
        </button>
      </div>
    </div>
  );

  // Render Stock Management Tab
  const renderStockTab = () => (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500 rounded-lg">
            <FaSearch className="text-white text-lg" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Search & Filter Products</h3>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-80">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FaFilter className="text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              {/* Add category options based on your data */}
            </select>
          </div>
          <button
            onClick={() => dispatch(fetchInventory())}
            className="flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
          >
            <FaSyncAlt className="text-sm" />
            Refresh
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((item, index) => (
                <React.Fragment key={item.product._id}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg">
                          <FaBoxOpen className="text-white text-sm" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {item.product.productName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {item.batches.length} batch{item.batches.length !== 1 ? 'es' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                        {item.product.sku}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700 bg-blue-50 px-3 py-1 rounded border">
                        {item.product.productCategory}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {item.totalQuantity.toLocaleString()}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">units</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.totalQuantity === 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <FaTimesCircle className="mr-1" />
                          Out of Stock
                        </span>
                      ) : item.totalQuantity < 10 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          <FaExclamationTriangle className="mr-1" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <FaCheckCircle className="mr-1" />
                          In Stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => toggleRow(item.product._id)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded transition-colors"
                      >
                        <FaEye />
                        {expandedRows.has(item.product._id) ? 'Hide' : 'View'} Batches
                        {expandedRows.has(item.product._id) ? <FaArrowUp /> : <FaArrowDown />}
                      </button>
                    </td>
                  </tr>
                  {expandedRows.has(item.product._id) && (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 bg-gray-50">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500 rounded-lg">
                              <FaBarcode className="text-white text-sm" />
                            </div>
                            <h4 className="font-medium text-gray-900">Batch Details</h4>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {item.batches.map((batch) => (
                              <div key={batch.batchId} className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h5 className="font-medium text-gray-900">{batch.batchNumber}</h5>
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">Quantity:</span>
                                      <span className="font-semibold text-blue-600 ml-1">{batch.quantity}</span>
                                    </p>
                                  </div>
                                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                    ID: {batch.batchId}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-gray-600 font-medium">Supplier:</p>
                                    <p className="font-medium text-gray-900 bg-gray-50 px-2 py-1 rounded">
                                      {batch.supplier?.fullName || 'N/A'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-gray-600 font-medium">Expiry Date:</p>
                                    <p className="font-medium text-gray-900 bg-gray-50 px-2 py-1 rounded">
                                      {new Date(batch.expDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );  // Render Add Supply Tab
  const renderAddSupplyTab = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500 rounded-lg">
            <FaPlus className="text-white text-lg" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Add Inventory Supply</h3>
        </div>
        <form onSubmit={handleAddSupply} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
              <select
                value={supplyForm.productId}
                onChange={(e) => setSupplyForm({ ...supplyForm, productId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Supplier</label>
              <select
                value={supplyForm.supplierId}
                onChange={(e) => setSupplyForm({ ...supplyForm, supplierId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
            <input
              type="number"
              min="1"
              value={supplyForm.quantity}
              onChange={(e) => setSupplyForm({ ...supplyForm, quantity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter quantity"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Manufacturing Date</label>
              <input
                type="date"
                value={supplyForm.mfgDate}
                onChange={(e) => setSupplyForm({ ...supplyForm, mfgDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
              <input
                type="date"
                value={supplyForm.expDate}
                onChange={(e) => setSupplyForm({ ...supplyForm, expDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
            <textarea
              value={supplyForm.notes}
              onChange={(e) => setSupplyForm({ ...supplyForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows="3"
              placeholder="Enter any additional notes..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setSupplyForm({ productId: '', supplierId: '', quantity: '', mfgDate: '', expDate: '', notes: '' });
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <FaSpinner className="animate-spin" />}
              <FaPlus className="text-sm" />
              Add Supply
            </button>
          </div>
        </form>
      </div>
    </div>
  );  // Render Mark Damaged Tab
  const renderMarkDamagedTab = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-red-500 rounded-lg">
            <FaExclamationTriangle className="text-white text-lg" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Mark Items as Damaged</h3>
        </div>
        <form onSubmit={handleMarkDamaged} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
            <select
              value={damagedForm.productId}
              onChange={(e) => setDamagedForm({ ...damagedForm, productId: e.target.value, batchId: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Batch</label>
              <select
                value={damagedForm.batchId}
                onChange={(e) => setDamagedForm({ ...damagedForm, batchId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              >
                <option value="">Select Batch</option>
                {getAvailableBatches().map(batch => (
                  <option key={batch.batchId} value={batch.batchId}>
                    {batch.batchNumber} - Qty: {batch.quantity} - Exp: {new Date(batch.expDate).toLocaleDateString()}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select a batch from the available inventory
              </p>
            </div>
          )}

          {damagedForm.batchId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity to Mark as Damaged</label>
              <input
                type="number"
                min="1"
                max={getAvailableBatches().find(b => b.batchId === damagedForm.batchId)?.quantity || 1}
                value={damagedForm.quantity}
                onChange={(e) => setDamagedForm({ ...damagedForm, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Enter quantity"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum available: {getAvailableBatches().find(b => b.batchId === damagedForm.batchId)?.quantity || 0}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason for Damage</label>
            <textarea
              value={damagedForm.reason}
              onChange={(e) => setDamagedForm({ ...damagedForm, reason: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              rows="3"
              placeholder="Describe the reason for marking items as damaged..."
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setDamagedForm({ productId: '', batchId: '', quantity: '', reason: '' });
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <FaSpinner className="animate-spin" />}
              <FaExclamationTriangle className="text-sm" />
              Mark as Damaged
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Render Batch Tracking Tab
  const renderTrackingTab = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-500 rounded-lg">
            <FaBarcode className="text-white text-lg" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">Track Batch Information</h3>
        </div>
        <form onSubmit={handleBatchTracking} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Method</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Batch Number</label>
                <input
                  type="text"
                  value={batchTrackingForm.batchNumber}
                  onChange={(e) => setBatchTrackingForm({ batchNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="e.g., BATCH-1751219198613"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the exact batch number to track
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quick Select from Recent</label>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setBatchTrackingForm({ batchNumber: e.target.value });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Select from recent batches</option>
                  {products.slice(0, 10).flatMap(item =>
                    item.batches.slice(0, 2).map(batch => (
                      <option key={batch.batchId} value={batch.batchNumber}>
                        {batch.batchNumber} - {item.product.productName}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Or select from recently added batches
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setBatchTrackingForm({ batchNumber: '' });
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={loading || !batchTrackingForm.batchNumber}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <FaSpinner className="animate-spin" />}
              <FaBarcode className="text-sm" />
              Track Batch
            </button>
          </div>
        </form>
      </div>

      {/* Batch Tracking Results */}
      {batchTracking && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-500 rounded-lg">
              <FaCheckCircle className="text-white text-lg" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Batch Tracking Results</h3>
          </div>

          {/* Basic Information Card */}
          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <FaBoxOpen className="text-blue-500" />
                Basic Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border">
                    <span className="font-medium text-gray-700">Batch Number:</span>
                    <span className="font-semibold text-blue-800 bg-blue-100 px-2 py-1 rounded font-mono text-sm">
                      {batchTracking.batchInfo?.batchNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                    <span className="font-medium text-gray-700">Product:</span>
                    <span className="font-semibold text-gray-800">
                      {batchTracking.batchInfo?.product?.productName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border">
                    <span className="font-medium text-gray-700">SKU:</span>
                    <span className="font-semibold text-purple-800 font-mono text-sm">
                      {batchTracking.batchInfo?.product?.sku}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border">
                    <span className="font-medium text-gray-700">Original Qty:</span>
                    <span className="font-semibold text-green-800">
                      {batchTracking.batchInfo?.originalQuantity?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg border">
                    <span className="font-medium text-gray-700">Current Qty:</span>
                    <span className="font-semibold text-emerald-800">
                      {batchTracking.batchInfo?.currentQuantity?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border">
                    <span className="font-medium text-gray-700">Items Used:</span>
                    <span className="font-semibold text-orange-800">
                      {((batchTracking.batchInfo?.originalQuantity || 0) - (batchTracking.batchInfo?.currentQuantity || 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dates and Status */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <FaWarehouse className="text-indigo-500" />
                Dates & Location
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border">
                    <span className="font-medium text-gray-700">Received Date:</span>
                    <span className="font-semibold text-blue-800">
                      {batchTracking.batchInfo?.receivedAt ? new Date(batchTracking.batchInfo.receivedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg border">
                    <span className="font-medium text-gray-700">Mfg Date:</span>
                    <span className="font-semibold text-purple-800">
                      {batchTracking.batchInfo?.mfgDate ? new Date(batchTracking.batchInfo.mfgDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg border">
                    <span className="font-medium text-gray-700">Exp Date:</span>
                    <span className="font-semibold text-orange-800">
                      {batchTracking.batchInfo?.expDate ? new Date(batchTracking.batchInfo.expDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg border">
                    <span className="font-medium text-gray-700">Warehouse:</span>
                    <span className="font-semibold text-indigo-800">
                      {batchTracking.batchInfo?.warehouse?.warehouseName || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-teal-50 rounded-lg border">
                    <span className="font-medium text-gray-700">Supplier:</span>
                    <span className="font-semibold text-teal-800">
                      {batchTracking.batchInfo?.supplier?.fullName || batchTracking.batchInfo?.supplier?.companyName || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                    <span className="font-medium text-gray-700">Status:</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${(batchTracking.batchInfo?.currentQuantity || 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                      {(batchTracking.batchInfo?.currentQuantity || 0) > 0 ? 'Available' : 'Depleted'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Item Status Breakdown */}
            {batchTracking.itemsBreakdown && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <FaChartBar className="text-purple-500" />
                  Item Status Breakdown
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(batchTracking.itemsBreakdown.statusCounts || {}).map(([status, count]) => (
                    <div key={status} className="text-center p-3 bg-gray-50 rounded-lg border">
                      <p className="text-lg font-bold text-gray-900">{count}</p>
                      <p className="text-xs font-medium text-gray-600 capitalize">
                        {status.replace('_', ' ')}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-center text-sm text-gray-600">
                  Total Items: <span className="font-semibold">{batchTracking.itemsBreakdown.total}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Real-time Status */}
      {realTimeStatus && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mt-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-500 rounded-lg">
              <FaTachometerAlt className="text-white text-lg" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Current Inventory Overview</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
              <div className="p-2 bg-green-500 rounded-lg mx-auto w-fit mb-2">
                <FaCheckCircle className="text-white text-lg" />
              </div>
              <p className="text-xl font-bold text-green-700">{realTimeStatus.totalInStock}</p>
              <p className="text-sm font-medium text-green-600">Items in Stock</p>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-center">
              <div className="p-2 bg-amber-500 rounded-lg mx-auto w-fit mb-2">
                <FaExclamationTriangle className="text-white text-lg" />
              </div>
              <p className="text-xl font-bold text-amber-700">{realTimeStatus.lowStockItems}</p>
              <p className="text-sm font-medium text-amber-600">Low Stock Items</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
              <div className="p-2 bg-red-500 rounded-lg mx-auto w-fit mb-2">
                <FaTimesCircle className="text-white text-lg" />
              </div>
              <p className="text-xl font-bold text-red-700">{realTimeStatus.outOfStockItems}</p>
              <p className="text-sm font-medium text-red-600">Out of Stock</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'stock':
        return renderStockTab();
      case 'add-supply':
        return renderAddSupplyTab();
      case 'mark-damaged':
        return renderMarkDamagedTab();
      case 'tracking':
        return renderTrackingTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simplified Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <FaBoxOpen className="text-2xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  Inventory Management
                </h1>
                <p className="text-blue-100 mt-1">
                  Welcome, <span className="font-semibold">{user?.fullName}</span>
                </p>
                <p className="text-blue-200 text-sm">
                  <FaWarehouse className="inline mr-1" />
                  {user?.assignedWarehouseId?.warehouseName || 'Not Assigned'}
                </p>
              </div>
            </div>
            {(user?.role === 'admin' || user?.role === 'staff') && (
              <button
                onClick={() => dispatch(fetchInventory())}
                className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
              >
                <FaSyncAlt className="text-sm" />
                Refresh Data
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Simplified Messages */}
      {(message || error) && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <FaCheckCircle className="text-green-600" />
                <span>{message}</span>
              </div>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <FaTimesCircle className="text-red-600" />
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Simplified Tab Navigation */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-center">
            <div className="flex bg-gray-100 rounded-lg p-1 my-4">
              {inventoryTabs.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-white'
                      }`}
                  >
                    <IconComponent className="text-sm" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Simplified Content Container */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
            </div>
            <p className="mt-4 text-gray-600">Loading inventory data...</p>
          </div>
        ) : (
          <div className="animate-fadeIn">
            {renderTabContent()}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryPage;
