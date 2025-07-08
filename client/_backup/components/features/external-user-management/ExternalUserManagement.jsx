import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { getAllUsers, createSupplier, createTransporter, updateUser, deleteUser, clearUserMessages } from '../../../app/slices/userSlice';
import { userAPI } from '../../../services/api';
import './ExternalUserManagement.css';

const ExternalUserManagement = ({ triggerAction }) => {
  const dispatch = useDispatch();
  const { users, loading, error, message } = useSelector((state) => state.users);
  const [suppliers, setSuppliers] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
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

  // Filter users to get suppliers and transporters
  useEffect(() => {
    const supplierUsers = users.filter(user => (user.role || '').toLowerCase() === 'supplier');
    const transporterUsers = users.filter(user => (user.role || '').toLowerCase() === 'transporter');
    setSuppliers(supplierUsers);
    setTransporters(transporterUsers);
  }, [users]);

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

  // Handle success/error messages
  useEffect(() => {
    if (message) {
      dispatch(clearUserMessages());
    }
    if (error) {
      dispatch(clearUserMessages());
    }
  }, [message, error, dispatch]);

  const fetchExternalUsers = async () => {
    try {
      setLocalLoading(true);
      setLocalError(null);
      // Fetch external users from backend
      const response = await userAPI.getAllExternalUsers();
      console.log('External users API response:', response.data);
      let externalUsers = response.data.externalUsers || [];
      if (!Array.isArray(externalUsers)) {
        externalUsers = [];
      }
      // Separate suppliers and transporters
      const supplierUsers = externalUsers.filter(user => (user.role || '').toLowerCase() === 'supplier');
      const transporterUsers = externalUsers.filter(user => (user.role || '').toLowerCase() === 'transporter');
      setSuppliers(supplierUsers);
      setTransporters(transporterUsers);
    } catch (err) {
      console.error('Fetch external users error:', err);
      setLocalError('Failed to fetch external users');
      // Fallback to getting all users and filtering
      dispatch(getAllUsers());
    } finally {
      setLocalLoading(false);
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
      const payload = { ...formData, password: `external_${Date.now()}` };
      console.log('Creating external user payload:', payload);
      if (editingUser) {
        // Update existing user
        await dispatch(updateUser(editingUser._id || editingUser.id, payload));
      } else {
        // Create new user
        if (currentUserType === 'supplier') {
          await dispatch(createSupplier(payload));
        } else if (currentUserType === 'transporter') {
          await dispatch(createTransporter(payload));
        }
      }
      setShowCreateForm(false);
      setEditingUser(null);
      resetForm();
      fetchExternalUsers();
    } catch (err) {
      console.error('Error creating/updating external user:', err);
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
      // Use the correct API for external users (suppliers/transporters)
      await userAPI.deleteExternalUser(user._id || user.id);
      fetchExternalUsers();
    } catch (err) {
      console.error('Error deleting external user:', err);
    }
  };

  const handleRefresh = () => {
    fetchExternalUsers();
  };

  if (loading || localLoading) {
    return <div className="loading">Loading external users...</div>;
  }

  if ((error || localError) && !suppliers.length && !transporters.length) {
    return (
      <div className="error">
        <p>{error || localError}</p>
        <button onClick={handleRefresh}>Retry</button>
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
                  <div key={supplier._id || supplier.id} className="external-user-card">
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
                  <div key={transporter._id || transporter.id} className="external-user-card">
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
