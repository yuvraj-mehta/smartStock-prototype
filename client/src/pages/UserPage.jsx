import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout, refreshUserDetails } from '../app/slices/authSlice';
import { updateProfile, resetUserSlice } from '../app/slices/userSlice';
import {
  User,
  Mail,
  Phone,
  Camera,
  Clock,
  DollarSign,
  MapPin,
  Calendar,
  Shield,
  Settings,
  LogOut,
  Edit3,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Building,
  RefreshCw,
} from 'lucide-react';

const UserPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { loading: userLoading, error: userError, message: userMessage } = useSelector((state) => state.users);
  const [isEditing, setIsEditing] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    avatar: '',
    shift: '',
  });
  const [originalData, setOriginalData] = useState({});
  const isInitializedRef = useRef(false);

  // Initialize form data only once when user is loaded and not editing
  useEffect(() => {
    if (user && !isInitializedRef.current) {
      const userData = {
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
        shift: user.shift || '',
      };
      setFormData(userData);
      setOriginalData(userData);
      isInitializedRef.current = true;
    }
    // Don't re-run this when user updates during editing
  }, [user?.id]); // Only run when user ID changes (i.e., different user)

  // Reset userSlice messages when component mounts
  useEffect(() => {
    dispatch(resetUserSlice());
  }, [dispatch]);

  // Update form data when user data changes (including after refresh)
  useEffect(() => {
    if (user) {
      const userData = {
        fullName: user.fullName || '',
        email: user.email || '',
        phone: user.phone || '',
        avatar: user.avatar || '',
        shift: user.shift || '',
      };
      setFormData(userData);
      setOriginalData(userData);
    }
  }, [user]); // Run when user data changes

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEdit = (field) => {
    setEditingField(field);
    setIsEditing(true);
    dispatch(resetUserSlice());
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
    setEditingField(null);
    dispatch(resetUserSlice());
  };

  const handleSave = async () => {
    if (!editingField) return;

    const updateData = { [editingField]: formData[editingField] };

    try {
      await dispatch(updateProfile(updateData));

      // Update the original data to reflect the successful change
      setOriginalData(prev => ({
        ...prev,
        [editingField]: formData[editingField],
      }));

      setIsEditing(false);
      setEditingField(null);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const handleKeyDown = (e, field) => {
    if (e.key === 'Escape') {
      // Revert to original value and exit edit mode
      setFormData(prev => ({
        ...prev,
        [field]: originalData[field],
      }));
      setIsEditing(false);
      setEditingField(null);
    }
  };

  const handleBlur = async (field) => {
    // Only save if the value has actually changed
    if (formData[field] !== originalData[field]) {
      const updateData = { [field]: formData[field] };

      try {
        await dispatch(updateProfile(updateData));

        // Update original data to reflect the successful change
        setOriginalData(prev => ({
          ...prev,
          [field]: formData[field],
        }));
      } catch (error) {
        // If save fails, revert to original value
        setFormData(prev => ({
          ...prev,
          [field]: originalData[field],
        }));
        console.error('Failed to update profile:', error);
      }
    }

    // Exit edit mode
    setIsEditing(false);
    setEditingField(null);
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleRefresh = async () => {
    try {
      await dispatch(refreshUserDetails());
      // Form data will be updated automatically by the useEffect watching user changes
    } catch (error) {
      console.error('Failed to refresh user details:', error);
    }
  };

  const getShiftLabel = (shift) => {
    switch (shift) {
      case 'morning':
        return 'Morning';
      case 'afternoon':
        return 'Afternoon';
      case 'night':
        return 'Night';
      default:
        return 'Unassigned';
    }
  };

  const EditableField = ({ label, field, type = 'text', icon: Icon, placeholder, options = null }) => (
    <div className="group">
      <label className="mb-2 flex items-center text-sm font-semibold text-slate-700">
        <Icon className="mr-2 h-4 w-4 text-slate-500" />
        {label}
      </label>
      {editingField === field ? (
        <div className="space-y-3">
          {options ? (
            <select
              name={field}
              value={formData[field]}
              onChange={handleInputChange}
              onBlur={() => handleBlur(field)}
              onKeyDown={(e) => handleKeyDown(e, field)}
              autoFocus
              className="w-full rounded-md border border-blue-500 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Select {label.toLowerCase()}</option>
              {options.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              name={field}
              value={formData[field]}
              onChange={handleInputChange}
              onBlur={() => handleBlur(field)}
              onKeyDown={(e) => handleKeyDown(e, field)}
              autoFocus
              className="w-full rounded-md border border-blue-500 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder={placeholder}
            />
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-slate-500">
              {userLoading ? (
                <span className="flex items-center">
                  <div className="mr-2 h-3 w-3 animate-spin rounded-full border-b-2 border-blue-600"></div>
                  Saving...
                </span>
              ) : (
                'Click outside to auto-save.'
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={userLoading}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </button>
              <button
                onClick={handleCancel}
                disabled={userLoading}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 transition hover:border-blue-200 hover:bg-white sm:flex-row sm:items-center sm:justify-between">
          <span className="min-w-0 flex-1 break-words text-sm font-medium text-slate-900">
            {field === 'shift' && user[field] ? (
              getShiftLabel(user[field])
            ) : (
              user[field] || 'Not provided'
            )}
          </span>
          <button
            onClick={() => handleEdit(field)}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isEditing}
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </button>
        </div>
      )}
    </div>
  );

  const ReadOnlyField = ({ label, value, icon: Icon, note }) => (
    <div>
      <label className="mb-2 flex items-center text-sm font-semibold text-slate-700">
        <Icon className="mr-2 h-4 w-4 text-slate-500" />
        {label}
      </label>
      <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="min-w-0 flex-1 break-words text-sm font-medium text-slate-900">{value}</span>
        {note && <span className="text-xs text-slate-500">{note}</span>}
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-5">
        <div className="relative mb-5">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"></div>
          <User className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-blue-700" />
        </div>
        <p className="text-sm font-medium text-slate-600">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="relative shrink-0">
                <img
                  src={user.avatar || 'https://media.istockphoto.com/id/1300845620/vector/user-icon-flat-isolated-on-white-background-user-symbol-vector-illustration.jpg?s=1024x1024&w=is&k=20&c=-mUWsTSENkugJ3qs5covpaj-bhYpxXY-v9RDpzsw504='}
                  alt="User Avatar"
                  className="h-20 w-20 rounded-lg border border-slate-200 object-cover"
                />
                <button
                  className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => handleEdit('avatar')}
                  disabled={isEditing}
                  aria-label="Edit avatar URL"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Account profile</p>
                <h1 className="mt-1 break-words text-2xl font-semibold text-slate-950">{user.fullName}</h1>
                <p className="mt-1 break-all text-sm text-slate-500">{user.email}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold uppercase text-blue-700 ring-1 ring-blue-200">
                    {user.role || 'user'}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase ring-1 ${user.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                    : user.status === 'inactive'
                      ? 'bg-amber-50 text-amber-700 ring-amber-200'
                      : 'bg-red-50 text-red-700 ring-red-200'
                    }`}>
                    <Shield className="h-3.5 w-3.5" />
                    {user.status || 'unknown'}
                  </span>
                  {user.isVerified && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold uppercase text-emerald-700 ring-1 ring-emerald-200">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  )}
                  {user.shift && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-700 ring-1 ring-slate-200">
                      <Clock className="h-3.5 w-3.5" />
                      {getShiftLabel(user.shift)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[560px]">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Per Hour</p>
                <p className="mt-1 truncate text-lg font-semibold text-slate-950">INR {user.wagePerHour || 0}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Hours</p>
                <p className="mt-1 truncate text-lg font-semibold text-slate-950">{user.hoursThisMonth || 0}</p>
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Earnings</p>
                <p className="mt-1 truncate text-lg font-semibold text-emerald-800">INR {((user.wagePerHour || 0) * (user.hoursThisMonth || 0)).toFixed(0)}</p>
              </div>
              <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2">
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Warehouse</p>
                <p className="mt-1 truncate text-lg font-semibold text-indigo-800">{user.assignedWarehouseId?.warehouseName ? '1' : '0'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Messages */}
        {userMessage && (
          <div className="mb-5 flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 shadow-sm">
            <CheckCircle className="mr-3 h-5 w-5 text-emerald-600" />
            <span className="font-medium">{userMessage}</span>
          </div>
        )}

        {userError && (
          <div className="mb-5 flex items-center rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800 shadow-sm">
            <AlertCircle className="mr-3 h-5 w-5 text-red-600" />
            <span className="font-medium">{userError}</span>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* Left Column - Editable Fields */}
          <div className="space-y-6 xl:col-span-2">
            {/* Personal Information */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="flex items-center text-base font-semibold text-slate-950">
                  <User className="mr-3 h-5 w-5 text-blue-700" />
                  Personal Information
                </h3>
              </div>
              <div className="space-y-5 p-5">
                <EditableField
                  label="Full Name"
                  field="fullName"
                  icon={User}
                  placeholder="Enter your full name"
                />
                <EditableField
                  label="Email Address"
                  field="email"
                  type="email"
                  icon={Mail}
                  placeholder="Enter your email address"
                />
                <EditableField
                  label="Phone Number"
                  field="phone"
                  type="tel"
                  icon={Phone}
                  placeholder="Enter your phone number"
                />
                <EditableField
                  label="Avatar URL"
                  field="avatar"
                  type="url"
                  icon={Camera}
                  placeholder="Enter avatar image URL"
                />
              </div>
            </div>

            {/* Work Information */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="flex items-center text-base font-semibold text-slate-950">
                  <Building className="mr-3 h-5 w-5 text-indigo-700" />
                  Work Information
                </h3>
              </div>
              <div className="space-y-5 p-5">
                <EditableField
                  label="Work Shift"
                  field="shift"
                  icon={Clock}
                  options={[
                    { value: 'morning', label: 'Morning' },
                    { value: 'afternoon', label: 'Afternoon' },
                    { value: 'night', label: 'Night' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Read-only Info */}
          <div className="space-y-6">
            {/* Employment Details */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="flex items-center text-base font-semibold text-slate-950">
                  <DollarSign className="mr-3 h-5 w-5 text-emerald-700" />
                  Employment
                </h3>
              </div>
              <div className="space-y-5 p-5">
                <ReadOnlyField
                  label="Hourly Wage"
                  value={`INR ${user.wagePerHour || 0}`}
                  icon={DollarSign}
                  note="Contact admin to update"
                />
                <ReadOnlyField
                  label="Hours This Month"
                  value={`${user.hoursThisMonth || 0} hours`}
                  icon={Clock}
                  note="Tracked automatically"
                />
                <ReadOnlyField
                  label="Monthly Earnings"
                  value={`INR ${((user.wagePerHour || 0) * (user.hoursThisMonth || 0)).toFixed(2)}`}
                  icon={DollarSign}
                  note="Calculated automatically"
                />
              </div>
            </div>

            {/* System Information */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <h3 className="flex items-center text-base font-semibold text-slate-950">
                  <Settings className="mr-3 h-5 w-5 text-slate-600" />
                  System Info
                </h3>
              </div>
              <div className="space-y-5 p-5">
                <ReadOnlyField
                  label="Assigned Warehouse"
                  value={user.assignedWarehouseId?.warehouseName || 'Not assigned'}
                  icon={MapPin}
                  note="Contact admin to change"
                />
                <ReadOnlyField
                  label="Account Created"
                  value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  icon={Calendar}
                />
                <ReadOnlyField
                  label="Last Login"
                  value={user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
                  icon={Clock}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="p-5">
                <div className="space-y-3">
                  {/* Refresh Button */}
                  <button
                    onClick={handleRefresh}
                    disabled={userLoading}
                    className="flex w-full items-center justify-center gap-3 rounded-md bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    <RefreshCw className={`h-5 w-5 ${userLoading ? 'animate-spin' : ''}`} />
                    {userLoading ? 'Refreshing...' : 'Refresh Profile'}
                  </button>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center gap-3 rounded-md bg-red-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPage;
