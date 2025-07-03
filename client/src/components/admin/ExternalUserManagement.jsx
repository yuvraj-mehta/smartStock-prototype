import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { config } from '../../../config/config';
import './ExternalUserManagement.css';

const ExternalUserManagement = () => {
  const { token } = useSelector((state) => state.auth);
  const [suppliers, setSuppliers] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('suppliers');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentUserType, setCurrentUserType] = useState('supplier');
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    password: '',
    phone: ''
  });

  const API_BASE_URL = config.apiBaseUrl;

  useEffect(() => {
    // Since there's no direct endpoint to fetch external users,
    // we'll initialize with empty arrays and show create functionality
    setLoading(false);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateExternalUser = async (e) => {
    e.preventDefault();
    try {
      const endpoint = currentUserType === 'supplier'
        ? `${API_BASE_URL}/user/create-supplier`
        : `${API_BASE_URL}/user/create-transporter`;

      const response = await axios.post(endpoint, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      alert(`${currentUserType.charAt(0).toUpperCase() + currentUserType.slice(1)} created successfully!`);
      setShowCreateForm(false);
      resetForm();

      // Add to local state since we don't have a fetch endpoint
      const newUser = {
        id: Date.now(),
        ...formData,
        role: currentUserType,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      if (currentUserType === 'supplier') {
        setSuppliers(prev => [...prev, newUser]);
      } else {
        setTransporters(prev => [...prev, newUser]);
      }
    } catch (err) {
      alert(err.response?.data?.message || `Failed to create ${currentUserType}`);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      companyName: '',
      email: '',
      password: '',
      phone: ''
    });
  };

  const openCreateForm = (userType) => {
    setCurrentUserType(userType);
    setShowCreateForm(true);
    resetForm();
  };

  if (loading) {
    return <div className="loading">Loading external users...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={() => setError(null)}>Retry</button>
      </div>
    );
  }

  return (
    <div className="external-user-management">
      <div className="external-header">
        <h2>External User Management</h2>
        <p>Manage suppliers and transporters for your warehouse</p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab ${activeTab === 'suppliers' ? 'active' : ''}`}
          onClick={() => setActiveTab('suppliers')}
        >
          <span className="tab-icon">🏭</span>
          Suppliers ({suppliers.length})
        </button>
        <button
          className={`tab ${activeTab === 'transporters' ? 'active' : ''}`}
          onClick={() => setActiveTab('transporters')}
        >
          <span className="tab-icon">🚛</span>
          Transporters ({transporters.length})
        </button>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        {activeTab === 'suppliers' && (
          <button
            className="btn-primary"
            onClick={() => openCreateForm('supplier')}
          >
            + Add New Supplier
          </button>
        )}
        {activeTab === 'transporters' && (
          <button
            className="btn-primary"
            onClick={() => openCreateForm('transporter')}
          >
            + Add New Transporter
          </button>
        )}
      </div>

      {/* Create External User Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New {currentUserType.charAt(0).toUpperCase() + currentUserType.slice(1)}</h3>
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
            <form onSubmit={handleCreateExternalUser} className="external-user-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Company Name *</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength="6"
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
                  Create {currentUserType.charAt(0).toUpperCase() + currentUserType.slice(1)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="tab-content">
        {activeTab === 'suppliers' && (
          <div className="suppliers-section">
            {suppliers.length > 0 ? (
              <div className="external-users-grid">
                {suppliers.map((supplier) => (
                  <div key={supplier.id} className="external-user-card">
                    <div className="user-card-header">
                      <div className="user-info">
                        <h3>{supplier.fullName}</h3>
                        <p className="company-name">{supplier.companyName}</p>
                      </div>
                      <span className="user-type-badge supplier">Supplier</span>
                    </div>
                    <div className="user-details">
                      <div className="detail-item">
                        <span className="detail-label">Email:</span>
                        <span className="detail-value">{supplier.email}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Phone:</span>
                        <span className="detail-value">{supplier.phone}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Status:</span>
                        <span className={`status-badge status-${supplier.status}`}>
                          {supplier.status}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Created:</span>
                        <span className="detail-value">
                          {new Date(supplier.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="user-actions">
                      <button className="btn-contact">Contact</button>
                      <button className="btn-manage">Manage</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🏭</div>
                <h3>No Suppliers Yet</h3>
                <p>Create your first supplier to start managing your supply chain.</p>
                <button
                  className="btn-primary"
                  onClick={() => openCreateForm('supplier')}
                >
                  Add First Supplier
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'transporters' && (
          <div className="transporters-section">
            {transporters.length > 0 ? (
              <div className="external-users-grid">
                {transporters.map((transporter) => (
                  <div key={transporter.id} className="external-user-card">
                    <div className="user-card-header">
                      <div className="user-info">
                        <h3>{transporter.fullName}</h3>
                        <p className="company-name">{transporter.companyName}</p>
                      </div>
                      <span className="user-type-badge transporter">Transporter</span>
                    </div>
                    <div className="user-details">
                      <div className="detail-item">
                        <span className="detail-label">Email:</span>
                        <span className="detail-value">{transporter.email}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Phone:</span>
                        <span className="detail-value">{transporter.phone}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Status:</span>
                        <span className={`status-badge status-${transporter.status}`}>
                          {transporter.status}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Created:</span>
                        <span className="detail-value">
                          {new Date(transporter.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="user-actions">
                      <button className="btn-contact">Contact</button>
                      <button className="btn-manage">Manage</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🚛</div>
                <h3>No Transporters Yet</h3>
                <p>Create your first transporter to manage deliveries and logistics.</p>
                <button
                  className="btn-primary"
                  onClick={() => openCreateForm('transporter')}
                >
                  Add First Transporter
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Information Cards */}
      <div className="info-cards">
        <div className="info-card">
          <h4>💡 About Suppliers</h4>
          <p>Suppliers can log in to the system to add inventory supplies directly to your warehouse. They have access to inventory management features.</p>
        </div>
        <div className="info-card">
          <h4>🚛 About Transporters</h4>
          <p>Transporters can update the status of shipments and deliveries. They have access to transport management features.</p>
        </div>
      </div>
    </div>
  );
};

export default ExternalUserManagement;
