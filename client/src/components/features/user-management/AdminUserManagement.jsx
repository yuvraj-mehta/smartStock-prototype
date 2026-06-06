import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit3,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  UserRound,
  X,
  XCircle,
} from 'lucide-react';
import { getAllUsers, createUser, updateUser, deleteUser, clearUserMessages } from '../../../app/slices/userSlice';
import './AdminUserManagement.css';

const emptyFormData = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  role: 'staff',
  wagePerHour: 0,
  shift: 'morning',
  status: 'active',
};

const fieldClassName = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const secondaryButtonClassName = 'inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50';
const primaryButtonClassName = 'inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50';

const roleStyles = {
  admin: 'bg-violet-50 text-violet-700 ring-violet-200',
  staff: 'bg-blue-50 text-blue-700 ring-blue-200',
  viewer: 'bg-slate-100 text-slate-700 ring-slate-200',
};

const statusStyles = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-200',
  suspended: 'bg-amber-50 text-amber-700 ring-amber-200',
};

const statusIcons = {
  active: CheckCircle2,
  inactive: XCircle,
  suspended: AlertTriangle,
};

const getUserId = (user) => user?._id || user?.id;

const formatLabel = (value, fallback = 'Not set') => {
  if (!value) return fallback;
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
};

const formatDate = (date) => {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString();
};

const formatWage = (value) => (
  Number(value || 0).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  })
);

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
};

const resetUserForm = () => ({ ...emptyFormData });

const validateUserForm = (data, isEditing) => {
  if (!String(data.fullName || '').trim()) {
    return 'Full name is required.';
  }

  if (!String(data.email || '').trim()) {
    return 'Email is required.';
  }

  if (!isEditing && !String(data.password || '').trim()) {
    return 'Password is required.';
  }

  if (!String(data.phone || '').trim()) {
    return 'Phone is required.';
  }

  return '';
};

const buildUserPayload = (data, isEditing) => {
  const payload = {
    ...data,
    fullName: String(data.fullName || '').trim(),
    email: String(data.email || '').trim(),
    phone: String(data.phone || '').trim(),
    wagePerHour: Number(data.wagePerHour) || 0,
  };

  if (isEditing) {
    delete payload.password;
  }

  return payload;
};

const AdminUserManagement = ({ triggerAction }) => {
  const dispatch = useDispatch();
  const { users = [], loading, error, message } = useSelector((state) => state.users);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState(resetUserForm);

  useEffect(() => {
    dispatch(getAllUsers());
  }, [dispatch]);

  useEffect(() => {
    if (triggerAction === 'create') {
      setEditingUser(null);
      setFormError('');
      setFormData(resetUserForm());
      setShowCreateForm(true);
    }
  }, [triggerAction]);

  useEffect(() => {
    if (message) {
      dispatch(clearUserMessages());
    }
  }, [message, dispatch]);

  const stats = useMemo(() => {
    const active = users.filter(user => user.status === 'active').length;
    const staff = users.filter(user => user.role === 'staff').length;
    const viewers = users.filter(user => user.role === 'viewer').length;

    return {
      total: users.length,
      active,
      attention: users.length - active,
      staff,
      viewers,
    };
  }, [users]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormError('');

    setFormData(prev => ({
      ...prev,
      [name]: name === 'wagePerHour' ? parseFloat(value) || 0 : value,
    }));
  };

  const closeForm = () => {
    setShowCreateForm(false);
    setEditingUser(null);
    setFormError('');
    setFormData(resetUserForm());
  };

  const openCreateForm = () => {
    setEditingUser(null);
    setFormError('');
    setFormData(resetUserForm());
    setShowCreateForm(true);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    const validationError = validateUserForm(formData, false);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      await dispatch(createUser(buildUserPayload(formData, false)));
      closeForm();
    } catch (err) {
      console.error('Create user error:', err);
      setFormError(err.message || 'Failed to create user.');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();

    const validationError = validateUserForm(formData, true);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    try {
      await dispatch(updateUser(getUserId(editingUser), buildUserPayload(formData, true)));
      closeForm();
    } catch (err) {
      console.error('Update user error:', err);
      setFormError(err.message || 'Failed to update user.');
    }
  };

  const requestDeleteUser = (user) => {
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await dispatch(deleteUser(getUserId(userToDelete)));
      setUserToDelete(null);
    } catch (err) {
      console.error('Delete user error:', err);
    }
  };

  const startEdit = (user) => {
    setShowCreateForm(false);
    setFormError('');
    setEditingUser(user);
    setFormData({
      fullName: user.fullName || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'staff',
      wagePerHour: user.wagePerHour || 0,
      shift: user.shift || 'morning',
      status: user.status || 'active',
    });
  };

  const handleRefresh = () => {
    dispatch(getAllUsers());
  };

  const dismissError = () => {
    dispatch(clearUserMessages());
  };

  const renderStatusBadge = (status) => {
    const normalizedStatus = status || 'inactive';
    const StatusIcon = statusIcons[normalizedStatus] || XCircle;

    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyles[normalizedStatus] || statusStyles.inactive}`}>
        <StatusIcon className="h-3.5 w-3.5" />
        {formatLabel(normalizedStatus)}
      </span>
    );
  };

  const renderUserForm = () => {
    const isEditing = Boolean(editingUser);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 px-4 py-6">
        <div className="admin-users-modal-panel w-full max-w-3xl rounded-lg bg-white shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">{isEditing ? 'Edit User' : 'Add User'}</h3>
              <p className="mt-1 text-sm text-slate-500">
                Keep internal access, wage, shift, and account status current for warehouse operations.
              </p>
            </div>
            <button
              type="button"
              className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              onClick={closeForm}
              aria-label="Close user form"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={isEditing ? handleUpdateUser : handleCreateUser} className="px-5 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Full Name *</span>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className={fieldClassName}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Email *</span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={fieldClassName}
                  required
                />
              </label>
              {!isEditing && (
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Password *</span>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={fieldClassName}
                    required
                  />
                </label>
              )}
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Phone *</span>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={fieldClassName}
                  required
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Role</span>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className={fieldClassName}
                >
                  <option value="staff">Staff</option>
                  <option value="viewer">Viewer</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Wage Per Hour</span>
                <input
                  type="number"
                  name="wagePerHour"
                  value={formData.wagePerHour}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className={fieldClassName}
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Shift</span>
                <select
                  name="shift"
                  value={formData.shift}
                  onChange={handleInputChange}
                  className={fieldClassName}
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="night">Night</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Status</span>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className={fieldClassName}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </label>
            </div>

            {formError && (
              <div role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {formError}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                className={secondaryButtonClassName}
                onClick={closeForm}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={primaryButtonClassName}
                disabled={loading}
              >
                {isEditing ? 'Update User' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading && !users.length && !showCreateForm && !editingUser) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-slate-200 bg-white p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        <p className="mt-4 text-sm font-medium text-slate-600">Loading users...</p>
      </div>
    );
  }

  if (error && !users.length) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        <AlertTriangle className="h-7 w-7 text-red-700" />
        <div>
          <h2 className="text-base font-semibold text-red-950">User management unavailable</h2>
          <p className="mt-1 font-medium">{error}</p>
        </div>
        <button
          type="button"
          className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
          onClick={handleRefresh}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="admin-users-root">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Access administration</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">User Management</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Manage internal staff and viewer accounts, access status, shift assignments, and hourly wage settings.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className={secondaryButtonClassName}
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            className={primaryButtonClassName}
            onClick={openCreateForm}
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Users</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{stats.total}</p>
        </div>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Active</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-800">{stats.active}</p>
        </div>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Needs Review</p>
          <p className="mt-1 text-2xl font-semibold text-amber-800">{stats.attention}</p>
        </div>
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Staff / Viewers</p>
          <p className="mt-1 text-2xl font-semibold text-blue-800">{stats.staff} / {stats.viewers}</p>
        </div>
      </div>

      {error && users.length > 0 && (
        <div role="alert" className="mb-5 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold text-red-950">Latest user operation failed</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            onClick={dismissError}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="admin-users-table-scroll overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Shift</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Wage/Hour</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Last Login</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const role = user.role || 'viewer';

                return (
                  <tr key={getUserId(user)} className="transition hover:bg-slate-50">
                    <td className="max-w-[280px] px-4 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="admin-users-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-sm font-bold text-blue-700 ring-1 ring-blue-100">
                          {getInitials(user.fullName)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950" title={user.fullName}>
                            {user.fullName || 'Unnamed user'}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">
                            <UserRound className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{getUserId(user) || 'No user id'}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[280px] px-4 py-4 text-sm text-slate-600">
                      <p className="truncate" title={user.email}>{user.email || 'No email'}</p>
                      <p className="mt-1 truncate text-xs text-slate-500" title={user.phone}>{user.phone || 'No phone'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${roleStyles[role] || roleStyles.viewer}`}>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {formatLabel(role)}
                      </span>
                    </td>
                    <td className="px-4 py-4">{renderStatusBadge(user.status)}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{formatLabel(user.shift)}</td>
                    <td className="px-4 py-4 text-right text-sm font-semibold text-slate-950">{formatWage(user.wagePerHour)}/hr</td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {formatDate(user.lastLogin)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                          onClick={() => startEdit(user)}
                          title={`Edit ${user.fullName || 'user'}`}
                          aria-label={`Edit ${user.fullName || 'user'}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                          onClick={() => requestDeleteUser(user)}
                          title={`Delete ${user.fullName || 'user'}`}
                          aria-label={`Delete ${user.fullName || 'user'}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <Users className="h-10 w-10 text-slate-300" />
            <h3 className="mt-4 text-base font-semibold text-slate-950">No users found</h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              Add the first staff or viewer account so team members can access the warehouse console.
            </p>
            <button
              type="button"
              className={`${primaryButtonClassName} mt-5`}
              onClick={openCreateForm}
            >
              <UserPlus className="h-4 w-4" />
              Add User
            </button>
          </div>
        )}
      </div>

      {(showCreateForm || editingUser) && renderUserForm()}

      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-200">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">Delete user</h3>
                  <p className="mt-1 text-sm text-slate-500">This action cannot be undone.</p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                onClick={() => setUserToDelete(null)}
                aria-label="Close delete confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-5">
              <p className="text-sm text-slate-600">
                Delete <span className="font-semibold text-slate-950">{userToDelete.fullName || 'this user'}</span> and revoke their access to the admin workspace?
              </p>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className={secondaryButtonClassName}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;
