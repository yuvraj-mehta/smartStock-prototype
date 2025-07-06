import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { config } from '../../../../config/config.js';
import './ExternalUserManagement.css';

const ExternalUserManagement = ({ triggerAction }) => {
  const { token } = useSelector((state) => state.auth);
  const [suppliers, setSuppliers] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('suppliers');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentUserType, setCurrentUserType] = useState('supplier');
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    address: '',
    contactPerson: ''
  });

  const API_BASE_URL = config.apiBaseUrl;

  useEffect(() => {
    fetchExternalUsers();
  }, []);

  // Handle triggerAction prop
  useEffect(() => {
    if (triggerAction === 'create') {
      setShowCreateForm(true);
      setCurrentUserType('supplier'); // Default to supplier for external user creation
    }
  }, [triggerAction]);

  const fetchExternalUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/user/external/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data && response.data.externalUsers) {
        const allUsers = response.data.externalUsers;
        setSuppliers(allUsers.filter(user => user.role === 'supplier'));
        setTransporters(allUsers.filter(user => user.role === 'transporter'));
      }
    } catch (err) {
      console.error('Error fetching external users:', err);
      setError('Failed to fetch external users');
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

  const handleCreateExternalUser = async (e) => {
    e.preventDefault();

    try {
      if (editingUser) {
        // Update existing user
        const response = await axios.put(`${API_BASE_URL}/user/external/update/${editingUser.id}`, formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        alert(`${editingUser.role.charAt(0).toUpperCase() + editingUser.role.slice(1)} updated successfully!`);
      } else {
        // Create new user
        const endpoint = currentUserType === 'supplier'
          ? `${API_BASE_URL}/user/create-supplier`
          : `${API_BASE_URL}/user/create-transporter`;

        // Create the payload with a generated password (required by backend but not used for login)
        const payload = {
          ...formData,
          password: `contact_${Date.now()}`, // Generated password since these are contact records
        };

        const response = await axios.post(endpoint, payload, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        alert(`${currentUserType.charAt(0).toUpperCase() + currentUserType.slice(1)} contact added successfully!`);
      }

      setShowCreateForm(false);
      setEditingUser(null);
      resetForm();

      // Refresh the external users list
      fetchExternalUsers();

    } catch (err) {
      console.error('Error creating/updating external user:', err);
      const action = editingUser ? 'update' : 'add';
      const userType = editingUser ? editingUser.role : currentUserType;
      alert(err.response?.data?.message || `Failed to ${action} ${userType} contact`);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      companyName: '',
      email: '',
      phone: '',
      address: '',
      contactPerson: ''
    });
  };

  const openCreateForm = (userType) => {
    setCurrentUserType(userType);
    setEditingUser(null);
    setShowCreateForm(true);
    resetForm();
  };

  const openEditForm = (user) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName || '',
      companyName: user.companyName || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      contactPerson: user.contactPerson || ''
    });
    setShowCreateForm(true);
  };

  const handleDeleteUser = async (user) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${user.fullName} (${user.companyName})? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_BASE_URL}/user/external/delete/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      alert(`${user.role.charAt(0).toUpperCase() + user.role.slice(1)} deleted successfully!`);
      fetchExternalUsers();
    } catch (err) {
      console.error('Error deleting external user:', err);
      alert(err.response?.data?.message || `Failed to delete ${user.role}`);
    }
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
        <h2>External Partner Management</h2>
        <p>Manage your suppliers and transporters contact information</p>
        <div className="notice-banner">
          <span className="notice-icon">ℹ️</span>
          <span className="notice-text">
            This section stores contact information for your business partners.
            System access features for suppliers and transporters will be added in future updates.
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab ${activeTab === 'suppliers' ? 'active' : ''}`}
          onClick={() => setActiveTab('suppliers')}
        >
          <span className="tab-icon">🏭</span>
          Supplier Contacts ({suppliers.length})
        </button>
        <button
          className={`tab ${activeTab === 'transporters' ? 'active' : ''}`}
          onClick={() => setActiveTab('transporters')}
        >
          <span className="tab-icon">🚛</span>
          Transporter Contacts ({transporters.length})
        </button>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        {activeTab === 'suppliers' && (
          <button
            className="btn-primary"
            onClick={() => openCreateForm('supplier')}
          >
            + Add Supplier Contact
          </button>
        )}
        {activeTab === 'transporters' && (
          <button
            className="btn-primary"
            onClick={() => openCreateForm('transporter')}
          >
            + Add Transporter Contact
          </button>
        )}
      </div>

      {/* Create External User Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>
                {editingUser
                  ? `Edit ${editingUser.role.charAt(0).toUpperCase() + editingUser.role.slice(1)}`
                  : `Create New ${currentUserType.charAt(0).toUpperCase() + currentUserType.slice(1)}`
                }
              </h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingUser(null);
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
              <div className="form-row">
                <div className="form-group">
                  <label>Contact Person</label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    placeholder="Primary contact person"
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Business address"
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => {
                  setShowCreateForm(false);
                  setEditingUser(null);
                  resetForm();
                }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser
                    ? `Update ${editingUser.role.charAt(0).toUpperCase() + editingUser.role.slice(1)}`
                    : `Add ${currentUserType.charAt(0).toUpperCase() + currentUserType.slice(1)}`
                  }
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
                        <span className="detail-label">
                          📧 Email
                        </span>
                        <span className="detail-value">{supplier.email}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">
                          📱 Phone
                        </span>
                        <span className="detail-value">{supplier.phone}</span>
                      </div>
                      {supplier.contactPerson && (
                        <div className="detail-item">
                          <span className="detail-label">
                            👤 Contact Person
                          </span>
                          <span className="detail-value">{supplier.contactPerson}</span>
                        </div>
                      )}
                      {supplier.address && (
                        <div className="detail-item">
                          <span className="detail-label">
                            📍 Address
                          </span>
                          <span className="detail-value">{supplier.address}</span>
                        </div>
                      )}
                      <div className="detail-item">
                        <span className="detail-label">
                          📋 Type
                        </span>
                        <span className="status-badge status-contact">
                          Contact Record
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">
                          📅 Added
                        </span>
                        <span className="detail-value">
                          {new Date(supplier.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="user-actions">
                      <button className="btn-manage" onClick={() => openEditForm(supplier)}>✏️ Edit</button>
                      <button className="btn-delete" onClick={() => handleDeleteUser(supplier)}>🗑️ Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🏭</div>
                <h3>No Suppliers Yet</h3>
                <p>Add supplier contact information to build your partner directory.</p>
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
                        <span className="detail-label">
                          📧 Email
                        </span>
                        <span className="detail-value">{transporter.email}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">
                          📱 Phone
                        </span>
                        <span className="detail-value">{transporter.phone}</span>
                      </div>
                      {transporter.contactPerson && (
                        <div className="detail-item">
                          <span className="detail-label">
                            👤 Contact Person
                          </span>
                          <span className="detail-value">{transporter.contactPerson}</span>
                        </div>
                      )}
                      {transporter.address && (
                        <div className="detail-item">
                          <span className="detail-label">
                            📍 Address
                          </span>
                          <span className="detail-value">{transporter.address}</span>
                        </div>
                      )}
                      <div className="detail-item">
                        <span className="detail-label">
                          📋 Type
                        </span>
                        <span className="status-badge status-contact">
                          Contact Record
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">
                          📅 Added
                        </span>
                        <span className="detail-value">
                          {new Date(transporter.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="user-actions">
                      <button className="btn-manage" onClick={() => openEditForm(transporter)}>✏️ Edit</button>
                      <button className="btn-delete" onClick={() => handleDeleteUser(transporter)}>🗑️ Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🚛</div>
                <h3>No Transporters Yet</h3>
                <p>Add transporter contact information for logistics management.</p>
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
          <p>Store contact information for your suppliers. This helps you track and manage your supply chain partners. Features for supplier collaboration will be added in future updates.</p>
        </div>
        <div className="info-card">
          <h4>🚛 About Transporters</h4>
          <p>Maintain a directory of transportation partners for logistics management. Contact details help streamline delivery coordination. Advanced transporter features coming soon.</p>
        </div>
      </div>
    </div>
  );
};

export default ExternalUserManagement;
