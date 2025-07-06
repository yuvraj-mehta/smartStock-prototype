import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { config } from '../../../../config/config.js';
import './ProductManagement.css';

const ProductManagement = ({ triggerAction }) => {
  const { token } = useSelector((state) => state.auth);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [formData, setFormData] = useState({
    productName: '',
    productImage: '',
    unit: '',
    manufacturer: '',
    productCategory: '',
    sku: '',
    price: 0,
    quantity: 0,
    weight: 0,
    dimension: {
      length: 0,
      breadth: 0,
      height: 0
    },
    thresholdLimit: 0,
    shelfLifeDays: 0,
    isActive: true
  });

  const API_BASE_URL = config.apiBaseUrl;

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle triggerAction prop
  useEffect(() => {
    if (triggerAction === 'create') {
      setShowModal(true);
    }
  }, [triggerAction]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/product/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setProducts(response.data.products || []);
    } catch (err) {
      setError('Failed to fetch products');
      console.error('Fetch products error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;

    if (name.startsWith('dimension.')) {
      const dimensionKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        dimension: {
          ...prev.dimension,
          [dimensionKey]: type === 'number' ? parseFloat(value) || 0 : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? parseFloat(value) || 0 : value
      }));
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setShowModal(true);
    resetForm();
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setShowModal(true);
    setFormData({
      productName: product.productName || '',
      productImage: product.productImage || '',
      unit: product.unit || '',
      manufacturer: product.manufacturer || '',
      productCategory: product.productCategory || '',
      sku: product.sku || '',
      price: product.price || 0,
      quantity: product.quantity || 0,
      weight: product.weight || 0,
      dimension: product.dimension || {
        length: 0,
        breadth: 0,
        height: 0
      },
      thresholdLimit: product.thresholdLimit || 0,
      shelfLifeDays: product.shelfLifeDays || 0,
      isActive: product.isActive !== undefined ? product.isActive : true
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    resetForm();
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();

    try {
      if (editingProduct) {
        // Update existing product
        await axios.put(`${API_BASE_URL}/product/update/${editingProduct._id}`, formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        showNotification('Product updated successfully!', 'success');
      } else {
        // Create new product
        await axios.post(`${API_BASE_URL}/product/add`, formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        showNotification('Product created successfully!', 'success');
      }

      closeModal();
      fetchProducts();
    } catch (err) {
      console.error('Product operation error:', err);
      showNotification(err.response?.data?.message || `Failed to ${editingProduct ? 'update' : 'create'} product`, 'error');
    }
  };

  const handleDeleteProduct = (product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!productToDelete) return;

    try {
      await axios.delete(`${API_BASE_URL}/product/delete/${productToDelete._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      showNotification('Product deleted successfully!', 'success');
      setShowDeleteModal(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (err) {
      console.error('Delete product error:', err);
      showNotification(err.response?.data?.message || 'Failed to delete product', 'error');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setProductToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      productName: '',
      productImage: '',
      unit: '',
      manufacturer: '',
      productCategory: '',
      sku: '',
      price: 0,
      quantity: 0,
      weight: 0,
      dimension: {
        length: 0,
        breadth: 0,
        height: 0
      },
      thresholdLimit: 0,
      shelfLifeDays: 0,
      isActive: true
    });
  };

  if (loading) {
    return <div className="loading">Loading products...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={fetchProducts}>Retry</button>
      </div>
    );
  }

  return (
    <div className="product-management">
      <div className="product-header">
        <h2>Product Management</h2>
        <button
          className="btn-primary"
          onClick={openCreateModal}
        >
          + Add New Product
        </button>
      </div>

      {/* Create/Edit Product Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmitProduct} className="product-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    name="productName"
                    value={formData.productName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>SKU *</label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Product Category</label>
                  <select
                    name="productCategory"
                    value={formData.productCategory}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Category</option>
                    <option value="electronics">Electronics</option>
                    <option value="apparel">Apparel</option>
                    <option value="decor">Decor</option>
                    <option value="furniture">Furniture</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Manufacturer</label>
                  <input
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Unit *</label>
                  <input
                    type="text"
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Price *</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    step="0.01"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Product Image URL *</label>
                  <input
                    type="url"
                    name="productImage"
                    value={formData.productImage}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Threshold Limit</label>
                  <input
                    type="number"
                    name="thresholdLimit"
                    value={formData.thresholdLimit}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Shelf Life (days)</label>
                  <input
                    type="number"
                    name="shelfLifeDays"
                    value={formData.shelfLifeDays}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="isActive"
                    value={formData.isActive}
                    onChange={handleInputChange}
                  >
                    <option value={true}>Active</option>
                    <option value={false}>Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-section">
                <h4>Dimensions</h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Length</label>
                    <input
                      type="number"
                      name="dimension.length"
                      value={formData.dimension.length}
                      onChange={handleInputChange}
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Breadth</label>
                    <input
                      type="number"
                      name="dimension.breadth"
                      value={formData.dimension.breadth}
                      onChange={handleInputChange}
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Height</label>
                    <input
                      type="number"
                      name="dimension.height"
                      value={formData.dimension.height}
                      onChange={handleInputChange}
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal confirmation-modal">
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button className="close-btn" onClick={cancelDelete}>×</button>
            </div>
            <div className="modal-body">
              <div className="confirmation-content">
                <div className="confirmation-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
                <p>Are you sure you want to delete the product <strong>"{productToDelete?.productName}"</strong>?</p>
                <p className="warning-text">This action cannot be undone.</p>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={cancelDelete} className="btn-secondary">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} className="btn-danger">
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          <div className="notification-content">
            <div className="notification-icon">
              {notification.type === 'success' ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              )}
            </div>
            <span className="notification-message">{notification.message}</span>
            <button
              className="notification-close"
              onClick={() => setNotification({ show: false, message: '', type: '' })}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="products-grid">
        {products.map((product) => (
          <div key={product._id} className="product-card">
            <div className="product-image">
              <img src={product.productImage} alt={product.productName} />
            </div>
            <div className="product-info">
              <h3>{product.productName}</h3>
              <p className="product-sku">SKU: {product.sku}</p>
              <p className="product-category">Category: {product.productCategory}</p>
              <p className="product-manufacturer">Manufacturer: {product.manufacturer}</p>
              <p className="product-price">Price: ${product.price}</p>
              <p className="product-quantity">Quantity: {product.quantity} {product.unit}</p>
              <p className="product-weight">Weight: {product.weight} kg</p>
              <p className="product-dimensions">
                Dimensions: {product.dimension?.length} × {product.dimension?.breadth} × {product.dimension?.height}
              </p>
              <p className="product-threshold">Threshold: {product.thresholdLimit}</p>
              <p className="product-shelf-life">Shelf Life: {product.shelfLifeDays} days</p>
              <p className={`product-status ${product.isActive ? 'active' : 'inactive'}`}>
                Status: {product.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>
            <div className="product-actions">
              <button
                className="btn-edit"
                onClick={() => openEditModal(product)}
              >
                Edit
              </button>
              <button
                className="btn-delete"
                onClick={() => handleDeleteProduct(product)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="no-products">
          <p>No products found. Add your first product to get started.</p>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
