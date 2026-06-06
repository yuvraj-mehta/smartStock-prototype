import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Building2,
  Edit3,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  Truck,
  UserRound,
  X,
} from 'lucide-react';
import { getAllUsers, createSupplier, createTransporter, updateExternalUser, clearUserMessages } from '../../../app/slices/userSlice';
import { userAPI } from '../../../services/api';
import './ExternalUserManagement.css';

const emptyFormData = {
  fullName: '',
  companyName: '',
  email: '',
  phone: '',
  address: '',
  contactPerson: '',
};

const formatRole = (role) => {
  const normalizedRole = role || 'partner';
  return normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1);
};

const formatDate = (date) => {
  if (!date) return 'Not recorded';
  return new Date(date).toLocaleDateString();
};

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
  const [formData, setFormData] = useState(emptyFormData);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const partnerDialogRef = useRef(null);
  const deleteDialogRef = useRef(null);

  useEffect(() => {
    const supplierUsers = users.filter(user => (user.role || '').toLowerCase() === 'supplier');
    const transporterUsers = users.filter(user => (user.role || '').toLowerCase() === 'transporter');
    setSuppliers(supplierUsers);
    setTransporters(transporterUsers);
  }, [users]);

  useEffect(() => {
    fetchExternalUsers();
  }, []);

  useEffect(() => {
    if (triggerAction === 'create') {
      setShowCreateForm(true);
      setCurrentUserType('supplier');
      setFormError('');
    }
  }, [triggerAction]);

  useEffect(() => {
    if (message || error) {
      dispatch(clearUserMessages());
    }
  }, [message, error, dispatch]);

  const activeRecords = activeTab === 'suppliers' ? suppliers : transporters;
  const activeRole = activeTab === 'suppliers' ? 'supplier' : 'transporter';

  const stats = useMemo(() => ({
    suppliers: suppliers.length,
    transporters: transporters.length,
    total: suppliers.length + transporters.length,
  }), [suppliers.length, transporters.length]);

  const fetchExternalUsers = async () => {
    try {
      setLocalLoading(true);
      setLocalError(null);
      const response = await userAPI.getAllExternalUsers();
      let externalUsers = response.data.externalUsers || [];
      if (!Array.isArray(externalUsers)) {
        externalUsers = [];
      }

      const supplierUsers = externalUsers.filter(user => (user.role || '').toLowerCase() === 'supplier');
      const transporterUsers = externalUsers.filter(user => (user.role || '').toLowerCase() === 'transporter');
      setSuppliers(supplierUsers);
      setTransporters(transporterUsers);
    } catch (err) {
      console.error('Fetch external users error:', err);
      setLocalError('Failed to fetch external users');
      dispatch(getAllUsers());
    } finally {
      setLocalLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormError('');
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCreateExternalUser = async (e) => {
    e.preventDefault();
    setFormError('');

    const fallbackError = editingUser
      ? 'Failed to update external user'
      : currentUserType === 'supplier'
        ? 'Failed to create supplier'
        : 'Failed to create transporter';

    try {
      const payload = { ...formData, password: `external_${Date.now()}` };
      let result;

      if (editingUser) {
        result = await dispatch(updateExternalUser(editingUser._id || editingUser.id, payload));
      } else if (currentUserType === 'supplier') {
        result = await dispatch(createSupplier(payload));
      } else if (currentUserType === 'transporter') {
        result = await dispatch(createTransporter(payload));
      }

      if (!result?.success) {
        setFormError(result?.error || fallbackError);
        return;
      }

      setShowCreateForm(false);
      setEditingUser(null);
      resetForm();
      fetchExternalUsers();
    } catch (err) {
      console.error('Error creating/updating external user:', err);
      setFormError(err.message || fallbackError);
    }
  };

  const resetForm = () => {
    setFormData(emptyFormData);
  };

  const closeForm = () => {
    setShowCreateForm(false);
    setEditingUser(null);
    setFormError('');
    resetForm();
  };

  const openCreateForm = (userType) => {
    setCurrentUserType(userType);
    setEditingUser(null);
    setFormError('');
    setShowCreateForm(true);
    resetForm();
  };

  const openEditForm = (user) => {
    setEditingUser(user);
    setFormError('');
    setFormData({
      fullName: user.fullName || '',
      companyName: user.companyName || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
      contactPerson: user.contactPerson || '',
    });
    setShowCreateForm(true);
  };

  const openDeleteDialog = (user) => {
    setDeleteTarget(user);
    setDeleteError('');
  };

  const closeDeleteDialog = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError('');
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    setDeleteError('');
    try {
      await userAPI.deleteExternalUser(deleteTarget._id || deleteTarget.id);
      await fetchExternalUsers();
      setDeleteTarget(null);
    } catch (err) {
      console.error('Error deleting external user:', err);
      setDeleteError(err?.response?.data?.message || 'Failed to delete partner.');
    } finally {
      setDeleting(false);
    }
  };

  const handleRefresh = () => {
    fetchExternalUsers();
  };

  useEffect(() => {
    if (!showCreateForm) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;

      setShowCreateForm(false);
      setEditingUser(null);
      setFormError('');
      resetForm();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showCreateForm]);

  useEffect(() => {
    if (showCreateForm) {
      partnerDialogRef.current?.focus();
    }
  }, [showCreateForm]);

  useEffect(() => {
    if (!deleteTarget) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeDeleteDialog();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    deleteDialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [deleteTarget, deleting]);

  const renderPartnerTable = (records, type) => {
    const Icon = type === 'supplier' ? Building2 : Truck;

    if (!records.length) {
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
          <Icon className="h-10 w-10 text-slate-300" />
          <h3 className="mt-4 text-base font-semibold text-slate-950">No {type}s yet</h3>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            Add contact details for {type} partners so operational teams can coordinate quickly.
          </p>
          <button
            type="button"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
            onClick={() => openCreateForm(type)}
          >
            <Plus className="h-4 w-4" />
            Add {formatRole(type)}
          </button>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Partner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Added</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record._id || record.id} className="transition hover:bg-slate-50">
                  <td className="max-w-[300px] px-4 py-4">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950" title={record.companyName}>
                          {record.companyName || 'Unnamed company'}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500" title={record.fullName}>
                          {record.fullName || 'No primary name'}
                        </p>
                        <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {formatRole(type)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">
                    <div className="space-y-2">
                      <p className="flex max-w-[260px] items-center gap-2 truncate" title={record.email}>
                        <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate">{record.email || 'No email'}</span>
                      </p>
                      <p className="flex max-w-[260px] items-center gap-2 truncate" title={record.phone}>
                        <Phone className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate">{record.phone || 'No phone'}</span>
                      </p>
                      {record.contactPerson && (
                        <p className="flex max-w-[260px] items-center gap-2 truncate" title={record.contactPerson}>
                          <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="truncate">{record.contactPerson}</span>
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="max-w-[280px] px-4 py-4 text-sm text-slate-600">
                    <span className="line-clamp-2 break-words">{record.address || 'Not recorded'}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">{formatDate(record.createdAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                        onClick={() => openEditForm(record)}
                        title={`Edit ${record.companyName || record.fullName}`}
                        aria-label={`Edit ${record.companyName || record.fullName}`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border border-red-200 bg-white p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700"
                        onClick={() => openDeleteDialog(record)}
                        title={`Delete ${record.companyName || record.fullName}`}
                        aria-label={`Delete ${record.companyName || record.fullName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  if (loading || localLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium text-slate-600">
        Loading external users...
      </div>
    );
  }

  if ((error || localError) && !suppliers.length && !transporters.length) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        <p className="font-semibold">{error || localError}</p>
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
    <div className="external-user-management">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Partner directory</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-950">External Partners</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Maintain supplier and transporter contacts for procurement, receiving, dispatch, and return coordination.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
            onClick={() => openCreateForm(activeRole)}
          >
            <Plus className="h-4 w-4" />
            Add {formatRole(activeRole)}
          </button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Partners</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{stats.total}</p>
        </div>
        <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Suppliers</p>
          <p className="mt-1 text-2xl font-semibold text-blue-800">{stats.suppliers}</p>
        </div>
        <div className="rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Transporters</p>
          <p className="mt-1 text-2xl font-semibold text-indigo-800">{stats.transporters}</p>
        </div>
      </div>

      <div className="mb-5 flex rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${activeTab === 'suppliers' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
          onClick={() => setActiveTab('suppliers')}
        >
          <Building2 className="h-4 w-4" />
          Suppliers ({suppliers.length})
        </button>
        <button
          type="button"
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${activeTab === 'transporters' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-950'}`}
          onClick={() => setActiveTab('transporters')}
        >
          <Truck className="h-4 w-4" />
          Transporters ({transporters.length})
        </button>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 px-4 py-6">
          <div
            ref={partnerDialogRef}
            className="w-full max-w-2xl rounded-lg bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="external-partner-dialog-title"
            aria-describedby="external-partner-dialog-description"
            tabIndex={-1}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <h3 id="external-partner-dialog-title" className="text-lg font-semibold text-slate-950">
                  {editingUser ? `Edit ${formatRole(editingUser.role)}` : `Add ${formatRole(currentUserType)}`}
                </h3>
                <p id="external-partner-dialog-description" className="mt-1 text-sm text-slate-500">Keep contact fields complete enough for operational handoffs.</p>
              </div>
              <button
                type="button"
                className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                onClick={closeForm}
                aria-label="Close partner form"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExternalUser} className="px-5 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Full Name *</span>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Company Name *</span>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Phone *</span>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Contact Person</span>
                  <input
                    type="text"
                    name="contactPerson"
                    value={formData.contactPerson}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Primary contact person"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Address</span>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="Business address"
                  />
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
                  className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  onClick={closeForm}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
                >
                  {editingUser ? `Update ${formatRole(editingUser.role)}` : `Add ${formatRole(currentUserType)}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div
            ref={deleteDialogRef}
            className="w-full max-w-md rounded-lg bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="external-partner-delete-title"
            aria-describedby="external-partner-delete-description"
            tabIndex={-1}
          >
            <div className="border-b border-slate-200 px-5 py-4">
              <h3 id="external-partner-delete-title" className="text-lg font-semibold text-slate-950">
                Delete partner
              </h3>
              <p id="external-partner-delete-description" className="mt-1 text-sm text-slate-500">
                This removes {deleteTarget.companyName || deleteTarget.fullName || 'this partner'} from the external partner directory.
              </p>
            </div>
            <div className="px-5 py-4">
              {deleteError && (
                <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  {deleteError}
                </div>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={closeDeleteDialog}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={handleDeleteUser}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete partner'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {renderPartnerTable(activeRecords, activeRole)}
    </div>
  );
};

export default ExternalUserManagement;
