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
  Award,
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

  const getShiftIcon = (shift) => {
    switch (shift) {
      case 'morning':
        return '🌅';
      case 'afternoon':
        return '☀️';
      case 'night':
        return '🌙';
      default:
        return '⏰';
    }
  };

  const EditableField = ({ label, field, type = 'text', icon: Icon, placeholder, options = null }) => (
    <div className="group">
      <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
        <Icon className="w-4 h-4 mr-2 text-gray-500" />
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
              className="w-full px-4 py-3 border-2 border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all duration-200 bg-white shadow-sm"
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
              className="w-full px-4 py-3 border-2 border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all duration-200 bg-white shadow-sm"
              placeholder={placeholder}
            />
          )}
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              {userLoading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                  Saving...
                </span>
              ) : (
                'Click outside to auto-save or use buttons below'
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={userLoading}
                className="flex items-center gap-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                <Save className="w-3 h-3" />
                Save
              </button>
              <button
                onClick={handleCancel}
                disabled={userLoading}
                className="flex items-center gap-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                <X className="w-3 h-3" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-200 group-hover:shadow-md">
          <span className="text-gray-900 font-medium flex-1">
            {field === 'shift' && user[field] ? (
              `${getShiftIcon(user[field])} ${user[field].charAt(0).toUpperCase() + user[field].slice(1)}`
            ) : (
              user[field] || 'Not provided'
            )}
          </span>
          <button
            onClick={() => handleEdit(field)}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            disabled={isEditing}
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>
        </div>
      )}
    </div>
  );

  const ReadOnlyField = ({ label, value, icon: Icon, note }) => (
    <div>
      <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
        <Icon className="w-4 h-4 mr-2 text-gray-500" />
        {label}
      </label>
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
        <span className="text-gray-900 font-medium flex-1">{value}</span>
        {note && <span className="text-sm text-gray-500 italic">{note}</span>}
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-5">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-6"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <User className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <p className="text-gray-600 text-lg font-medium">Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0 bg-repeat" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}></div>
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center text-white">
            {/* Avatar */}
            <div className="relative inline-block mb-6">
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-white/20 to-white/10 p-1 backdrop-blur-sm">
                <img
                  src={user.avatar || 'https://media.istockphoto.com/id/1300845620/vector/user-icon-flat-isolated-on-white-background-user-symbol-vector-illustration.jpg?s=1024x1024&w=is&k=20&c=-mUWsTSENkugJ3qs5covpaj-bhYpxXY-v9RDpzsw504='}
                  alt="User Avatar"
                  className="w-full h-full rounded-full object-cover border-4 border-white shadow-2xl"
                />
              </div>
              <button
                className="absolute bottom-2 right-2 w-12 h-12 bg-white hover:bg-gray-50 disabled:bg-gray-200 text-gray-600 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 disabled:scale-100 disabled:cursor-not-allowed"
                onClick={() => handleEdit('avatar')}
                disabled={isEditing}
              >
                <Camera className="w-5 h-5" />
              </button>

              {/* Status Indicators */}
              <div className="absolute -top-2 -right-2 flex space-x-1">
                {user.isVerified && (
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${user.status === 'active' ? 'bg-green-500' :
                  user.status === 'inactive' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}>
                  <Shield className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>

            {/* User Info */}
            <h1 className="text-5xl font-bold mb-4">{user.fullName}</h1>
            <p className="text-xl text-white/90 mb-8">{user.email}</p>

            {/* Badges */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className={`inline-flex items-center px-6 py-3 rounded-full font-semibold text-sm ${user.role === 'admin' ? 'bg-red-500/20 text-red-100 border border-red-300/30' :
                user.role === 'staff' ? 'bg-blue-500/20 text-blue-100 border border-blue-300/30' :
                  'bg-gray-500/20 text-gray-100 border border-gray-300/30'
                }`}>
                <Award className="w-4 h-4 mr-2" />
                {user.role?.toUpperCase()}
              </div>
              <div className={`inline-flex items-center px-6 py-3 rounded-full font-semibold text-sm ${user.status === 'active' ? 'bg-green-500/20 text-green-100 border border-green-300/30' :
                user.status === 'inactive' ? 'bg-yellow-500/20 text-yellow-100 border border-yellow-300/30' :
                  'bg-red-500/20 text-red-100 border border-red-300/30'
                }`}>
                <Shield className="w-4 h-4 mr-2" />
                {user.status?.toUpperCase()}
              </div>
              {user.shift && (
                <div className="bg-purple-500/20 text-purple-100 border border-purple-300/30 inline-flex items-center px-6 py-3 rounded-full font-semibold text-sm">
                  <Clock className="w-4 h-4 mr-2" />
                  {getShiftIcon(user.shift)} {user.shift.charAt(0).toUpperCase() + user.shift.slice(1)}
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-3xl font-bold">₹{user.wagePerHour || 0}</div>
                <div className="text-sm text-white/80 mt-1">Per Hour</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-3xl font-bold">{user.hoursThisMonth || 0}</div>
                <div className="text-sm text-white/80 mt-1">Hours This Month</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-3xl font-bold">₹{((user.wagePerHour || 0) * (user.hoursThisMonth || 0)).toFixed(0)}</div>
                <div className="text-sm text-white/80 mt-1">Monthly Earnings</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                <div className="text-3xl font-bold">{user.assignedWarehouseId?.warehouseName ? '1' : '0'}</div>
                <div className="text-sm text-white/80 mt-1">Warehouses</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Messages */}
        {userMessage && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-xl mb-8 flex items-center shadow-sm">
            <CheckCircle className="w-5 h-5 mr-3 text-green-600" />
            <span className="font-medium">{userMessage}</span>
          </div>
        )}

        {userError && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl mb-8 flex items-center shadow-sm">
            <AlertCircle className="w-5 h-5 mr-3 text-red-600" />
            <span className="font-medium">{userError}</span>
          </div>
        )}

        {/* Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Editable Fields */}
          <div className="xl:col-span-2 space-y-8">
            {/* Personal Information */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <User className="w-6 h-6 mr-3 text-blue-600" />
                  Personal Information
                </h3>
              </div>
              <div className="p-6 space-y-6">
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
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Building className="w-6 h-6 mr-3 text-purple-600" />
                  Work Information
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <EditableField
                  label="Work Shift"
                  field="shift"
                  icon={Clock}
                  options={[
                    { value: 'morning', label: '🌅 Morning' },
                    { value: 'afternoon', label: '☀️ Afternoon' },
                    { value: 'night', label: '🌙 Night' },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Read-only Info */}
          <div className="space-y-8">
            {/* Employment Details */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <DollarSign className="w-6 h-6 mr-3 text-green-600" />
                  Employment
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <ReadOnlyField
                  label="Hourly Wage"
                  value={`₹${user.wagePerHour || 0}`}
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
                  value={`₹${((user.wagePerHour || 0) * (user.hoursThisMonth || 0)).toFixed(2)}`}
                  icon={DollarSign}
                  note="Calculated automatically"
                />
              </div>
            </div>

            {/* System Information */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-4 border-b border-gray-100">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Settings className="w-6 h-6 mr-3 text-gray-600" />
                  System Info
                </h3>
              </div>
              <div className="p-6 space-y-6">
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
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="p-6">
                <div className="space-y-3">
                  {/* Refresh Button */}
                  <button
                    onClick={handleRefresh}
                    disabled={userLoading}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:scale-105 hover:shadow-xl disabled:scale-100 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-5 h-5 ${userLoading ? 'animate-spin' : ''}`} />
                    {userLoading ? 'Refreshing...' : 'Refresh Profile'}
                  </button>

                  {/* Logout Button */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
                  >
                    <LogOut className="w-5 h-5" />
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
