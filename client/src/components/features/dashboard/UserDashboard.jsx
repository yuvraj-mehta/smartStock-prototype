import React, { useEffect } from 'react';
import { useUsers, useUserStats, useUserFilters } from '../../../hooks/useUsers';

const UserDashboard = () => {
  const {
    users,
    selectedUser,
    loading,
    error,
    message,
    totalUsers,
    getAllUsers,
    getUserDetails,
    createUser,
    updateUser,
    deleteUser,
  } = useUsers();

  const {
    activeUsers,
    inactiveUsers,
    suspendedUsers,
    usersByRole,
    usersByShift,
    totalWages,
    averageWage,
  } = useUserStats();

  const {
    filterByRole,
    filterByStatus,
    searchUsers,
    sortUsers,
  } = useUserFilters();

  useEffect(() => {
    // Load all users when component mounts
    getAllUsers();
  }, [getAllUsers]);

  const handleCreateUser = async () => {
    const userData = {
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      password: 'password123',
      phone: '+1234567890',
      wagePerHour: 15.50,
      role: 'staff',
      shift: 'morning'
    };

    await createUser(userData);
    // Refresh users list after creation
    getAllUsers();
  };

  const handleUpdateUser = async (userId) => {
    const updateData = {
      status: 'active',
      wagePerHour: 16.00
    };

    await updateUser(userId, updateData);
    // Refresh users list after update
    getAllUsers();
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await deleteUser(userId);
      // List will be automatically updated by the reducer
    }
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="user-dashboard">
      <h1>User Dashboard</h1>

      {/* Error/Success Messages */}
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p>{totalUsers}</p>
        </div>
        <div className="stat-card">
          <h3>Active Users</h3>
          <p>{activeUsers.length}</p>
        </div>
        <div className="stat-card">
          <h3>Inactive Users</h3>
          <p>{inactiveUsers.length}</p>
        </div>
        <div className="stat-card">
          <h3>Suspended Users</h3>
          <p>{suspendedUsers.length}</p>
        </div>
        <div className="stat-card">
          <h3>Total Wages</h3>
          <p>${totalWages.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h3>Average Wage</h3>
          <p>${averageWage.toFixed(2)}/hr</p>
        </div>
      </div>

      {/* Role Distribution */}
      <div className="role-stats">
        <h3>Users by Role</h3>
        {Object.entries(usersByRole).map(([role, count]) => (
          <div key={role} className="role-stat">
            <span>{role}: {count}</span>
          </div>
        ))}
      </div>

      {/* Shift Distribution */}
      <div className="shift-stats">
        <h3>Users by Shift</h3>
        {Object.entries(usersByShift).map(([shift, count]) => (
          <div key={shift} className="shift-stat">
            <span>{shift}: {count}</span>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="actions">
        <button onClick={handleCreateUser}>Create Sample User</button>
        <button onClick={getAllUsers}>Refresh Users</button>
        <button onClick={() => console.log('Admin users:', filterByRole('admin'))}>
          Show Admin Users
        </button>
        <button onClick={() => console.log('Active users:', filterByStatus('active'))}>
          Show Active Users
        </button>
        <button onClick={() => console.log('Sorted users:', sortUsers('fullName', 'asc'))}>
          Sort by Name
        </button>
      </div>

      {/* Users List */}
      <div className="users-list">
        <h3>Users ({users.length})</h3>
        {users.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <div className="users-grid">
            {users.map(user => (
              <div key={user.id} className="user-card">
                <div className="user-info">
                  <h4>{user.fullName}</h4>
                  <p>Email: {user.email}</p>
                  <p>Role: {user.role}</p>
                  <p>Status: {user.status}</p>
                  <p>Shift: {user.shift}</p>
                  <p>Wage: ${user.wagePerHour}/hr</p>
                  <p>Hours: {user.hoursThisMonth}</p>
                  <p>Verified: {user.isVerified ? 'Yes' : 'No'}</p>
                </div>
                <div className="user-actions">
                  <button onClick={() => getUserDetails(user.id)}>
                    View Details
                  </button>
                  <button onClick={() => handleUpdateUser(user.id)}>
                    Update
                  </button>
                  <button onClick={() => handleDeleteUser(user.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected User Details */}
      {selectedUser && (
        <div className="selected-user">
          <h3>Selected User Details</h3>
          <div className="user-details">
            <p><strong>ID:</strong> {selectedUser.id}</p>
            <p><strong>Full Name:</strong> {selectedUser.fullName}</p>
            <p><strong>Email:</strong> {selectedUser.email}</p>
            <p><strong>Role:</strong> {selectedUser.role}</p>
            <p><strong>Status:</strong> {selectedUser.status}</p>
            <p><strong>Shift:</strong> {selectedUser.shift}</p>
            <p><strong>Wage per Hour:</strong> ${selectedUser.wagePerHour}</p>
            <p><strong>Hours this Month:</strong> {selectedUser.hoursThisMonth}</p>
            <p><strong>Verified:</strong> {selectedUser.isVerified ? 'Yes' : 'No'}</p>
            <p><strong>Created:</strong> {new Date(selectedUser.createdAt).toLocaleString()}</p>
            <p><strong>Updated:</strong> {new Date(selectedUser.updatedAt).toLocaleString()}</p>
            {selectedUser.lastLogin && (
              <p><strong>Last Login:</strong> {new Date(selectedUser.lastLogin).toLocaleString()}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
