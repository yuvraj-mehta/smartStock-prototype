import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  getAllUsers,
  getUserDetails,
  createUser,
  updateUser,
  deleteUser,
  createSupplier,
  createTransporter,
  resetUserSlice,
  clearSelectedUser
} from '../../../app/slices/userSlice';

const UserManagement = () => {
  const dispatch = useDispatch();
  const { users, selectedUser, loading, error, message, totalUsers } = useSelector(state => state.users);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    wagePerHour: 0,
    role: 'viewer',
    shift: 'morning'
  });

  useEffect(() => {
    // Fetch all users when component mounts
    dispatch(getAllUsers());
  }, [dispatch]);

  const handleCreateUser = (e) => {
    e.preventDefault();
    dispatch(createUser(formData));
    setFormData({
      fullName: '',
      email: '',
      password: '',
      phone: '',
      wagePerHour: 0,
      role: 'viewer',
      shift: 'morning'
    });
    setShowCreateForm(false);
  };

  const handleUpdateUser = (userId, updateData) => {
    dispatch(updateUser(userId, updateData));
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      dispatch(deleteUser(userId));
    }
  };

  const handleGetUserDetails = (userId) => {
    dispatch(getUserDetails(userId));
  };

  const handleCreateSupplier = (supplierData) => {
    dispatch(createSupplier(supplierData));
  };

  const handleCreateTransporter = (transporterData) => {
    dispatch(createTransporter(transporterData));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="user-management">
      <h2>User Management</h2>

      {/* Error/Success Messages */}
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}

      {/* Summary */}
      <div className="summary">
        <p>Total Users: {totalUsers}</p>
      </div>

      {/* Action Buttons */}
      <div className="actions">
        <button onClick={() => setShowCreateForm(true)}>Create User</button>
        <button onClick={() => dispatch(getAllUsers())}>Refresh Users</button>
        <button onClick={() => dispatch(resetUserSlice())}>Reset</button>
        <button onClick={() => dispatch(clearSelectedUser())}>Clear Selection</button>
      </div>

      {/* Create User Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateUser} className="create-form">
          <h3>Create New User</h3>
          <div className="form-group">
            <label>Full Name:</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Password:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Phone:</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Wage per Hour:</label>
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
            <label>Role:</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
            >
              <option value="viewer">Viewer</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="form-group">
            <label>Shift:</label>
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
          <div className="form-actions">
            <button type="submit">Create User</button>
            <button type="button" onClick={() => setShowCreateForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Users List */}
      <div className="users-list">
        <h3>Users List</h3>
        {users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Shift</th>
                <th>Wage/Hour</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.fullName}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.status}</td>
                  <td>{user.shift}</td>
                  <td>${user.wagePerHour}</td>
                  <td>
                    <button onClick={() => handleGetUserDetails(user.id)}>
                      View Details
                    </button>
                    <button onClick={() => handleUpdateUser(user.id, { status: 'active' })}>
                      Activate
                    </button>
                    <button onClick={() => handleDeleteUser(user.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Selected User Details */}
      {selectedUser && (
        <div className="user-details">
          <h3>User Details</h3>
          <div className="details-grid">
            <div><strong>ID:</strong> {selectedUser.id}</div>
            <div><strong>Full Name:</strong> {selectedUser.fullName}</div>
            <div><strong>Email:</strong> {selectedUser.email}</div>
            <div><strong>Role:</strong> {selectedUser.role}</div>
            <div><strong>Status:</strong> {selectedUser.status}</div>
            <div><strong>Shift:</strong> {selectedUser.shift}</div>
            <div><strong>Wage per Hour:</strong> ${selectedUser.wagePerHour}</div>
            <div><strong>Hours this Month:</strong> {selectedUser.hoursThisMonth}</div>
            <div><strong>Verified:</strong> {selectedUser.isVerified ? 'Yes' : 'No'}</div>
            <div><strong>Created At:</strong> {new Date(selectedUser.createdAt).toLocaleString()}</div>
            <div><strong>Updated At:</strong> {new Date(selectedUser.updatedAt).toLocaleString()}</div>
            {selectedUser.lastLogin && (
              <div><strong>Last Login:</strong> {new Date(selectedUser.lastLogin).toLocaleString()}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
