import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { config } from '../../../../config/config';
import './AdminUserManagement.css';

const UserManagement = ({ triggerAction }) => {
  const { token } = useSelector((state) => state.auth);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: 'staff',
    wagePerHour: 0,
    shift: 'morning',
    status: 'active'
  });

  const API_BASE_URL = config.apiBaseUrl;

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle triggerAction prop
  useEffect(() => {
    if (triggerAction === 'create') {
      setShowCreateForm(true);
    }
  }, [triggerAction]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/user/all`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      // Map _id to id for consistent frontend usage
      const usersWithId = (response.data.users || []).map(user => ({
        ...user,
        id: user._id || user.id
      }));
      setUsers(usersWithId);
    } catch (err) {
      console.error('Fetch users error:', err.response?.data || err.message);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Parse numeric values
    let parsedValue = value;
    if (name === 'wagePerHour') {
      // Handle empty string or null/undefined
      if (value === '' || value === null || value === undefined) {
        parsedValue = 0;
      } else {
        parsedValue = parseFloat(value);
        // If parsing fails, set to 0
        if (isNaN(parsedValue)) {
          parsedValue = 0;
        }
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const createData = { ...formData };

      // Ensure numeric values are properly formatted
      if (createData.wagePerHour !== undefined) {
        createData.wagePerHour = parseFloat(createData.wagePerHour) || 0;
      }

      const response = await axios.post(`${API_BASE_URL}/user/create`, createData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      alert('User created successfully!');
      setShowCreateForm(false);
      setFormData({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        role: 'staff',
        wagePerHour: 0,
        shift: 'morning',
        status: 'active'
      });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const updateData = { ...formData };
      delete updateData.password; // Don't send password in update

      // Ensure numeric values are properly formatted
      if (updateData.wagePerHour !== undefined) {
        updateData.wagePerHour = parseFloat(updateData.wagePerHour) || 0;
      }

      const userId = editingUser.id || editingUser._id;

      const response = await axios.put(`${API_BASE_URL}/user/update/${userId}`, updateData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      alert('User updated successfully!');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Update error:', err.response?.data || err.message);
      alert(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      try {
        await axios.delete(`${API_BASE_URL}/user/delete/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        alert('User deleted successfully!');
        fetchUsers();
      } catch (err) {
        console.error('Delete error:', err.response?.data || err.message);
        alert(err.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      wagePerHour: user.wagePerHour || 0,
      shift: user.shift || 'morning',
      status: user.status
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setFormData({
      fullName: '',
      email: '',
      password: '',
      phone: '',
      role: 'staff',
      wagePerHour: 0,
      shift: 'morning',
      status: 'active'
    });
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={fetchUsers}>Retry</button>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="user-header">
        <h2>User Management</h2>
        <button
          className="btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          + Create New User
        </button>
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New User</h3>
              <button
                className="close-btn"
                onClick={() => setShowCreateForm(false)}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="user-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
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
                  <label>Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                  >
                    <option value="staff">Staff</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Wage Per Hour ($)</label>
                  <input
                    type="number"
                    name="wagePerHour"
                    value={formData.wagePerHour}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Shift</label>
                  <select
                    name="shift"
                    value={formData.shift}
                    onChange={handleInputChange}
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="night">Night</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit User: {editingUser.fullName}</h3>
              <button className="close-btn" onClick={cancelEdit}>
                ×
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="user-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                  >
                    <option value="staff">Staff</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Wage Per Hour ($)</label>
                  <input
                    type="number"
                    name="wagePerHour"
                    value={formData.wagePerHour}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>Shift</label>
                  <select
                    name="shift"
                    value={formData.shift}
                    onChange={handleInputChange}
                  >
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="night">Night</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={cancelEdit}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Shift</th>
              <th>Wage/Hour</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id || user._id}>
                <td>
                  <div className="user-info">
                    <img
                      src={user.avatar}
                      alt={user.fullName}
                      className="user-avatar"
                    />
                    <span>{user.fullName}</span>
                  </div>
                </td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge role-${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`status-badge status-${user.status}`}>
                    {user.status}
                  </span>
                </td>
                <td>{user.shift || 'Not Set'}</td>
                <td>${user.wagePerHour || 0}/hr</td>
                <td>
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleDateString()
                    : 'Never'
                  }
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-edit"
                      onClick={() => startEdit(user)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteUser(user.id || user._id, user.fullName)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="no-users">
          <p>No users found. Create your first user to get started.</p>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
