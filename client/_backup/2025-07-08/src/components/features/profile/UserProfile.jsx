import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { updateProfile, resetUserSlice } from '../../../app/slices/userSlice';
import { User, Mail, Phone, Camera, Clock, Edit3, CheckCircle, AlertCircle } from 'lucide-react';

const UserProfilePage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { loading, error, message } = useSelector((state) => state.users);

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
  }, [user]);

  // Reset userSlice messages when component mounts
  useEffect(() => {
    dispatch(resetUserSlice());
  }, [dispatch]);

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
        await dispatch(updateProfile(updateData)).unwrap();

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
    <div className="space-y-2">
      <label className="flex items-center text-sm font-medium text-gray-700">
        <Icon className="w-4 h-4 mr-2" />
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
              className="w-full px-3 py-2 border border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={placeholder}
            />
          )}

          <div className="text-xs text-gray-500">
            {loading ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                Saving...
              </span>
            ) : (
              'Click outside to save changes or press Escape to cancel'
            )}
          </div>
        </div>
      ) : (
        <div
          className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer transition-colors"
          onClick={() => handleEdit(field)}
        >
          <span className="text-gray-900">
            {field === 'shift' && user[field] ? (
              `${getShiftIcon(user[field])} ${user[field].charAt(0).toUpperCase() + user[field].slice(1)}`
            ) : (
              user[field] || 'Not provided'
            )}
          </span>
          <Edit3 className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <img
              src={user.avatar || 'https://via.placeholder.com/150'}
              alt="User Avatar"
              className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
            />
            <button
              className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 shadow-lg"
              onClick={() => handleEdit('avatar')}
              disabled={isEditing}
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">{user.fullName}</h1>
          <p className="text-gray-600 mt-2">{user.email}</p>
          <div className="flex items-center justify-center space-x-4 mt-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {user.role?.toUpperCase()}
            </span>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${user.status === 'active'
              ? 'bg-green-100 text-green-800'
              : user.status === 'inactive'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
              }`}>
              {user.status?.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md mb-6 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md mb-6 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {/* Profile Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              label="Work Shift"
              field="shift"
              icon={Clock}
              options={[
                { value: 'morning', label: '🌅 Morning' },
                { value: 'afternoon', label: '☀️ Afternoon' },
                { value: 'night', label: '🌙 Night' },
              ]}
            />

            <div className="md:col-span-2">
              <EditableField
                label="Avatar URL"
                field="avatar"
                type="url"
                icon={Camera}
                placeholder="Enter avatar image URL"
              />
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Employment Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">${user.wagePerHour || 0}</div>
              <div className="text-sm text-gray-600">Hourly Rate</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{user.hoursThisMonth || 0}</div>
              <div className="text-sm text-gray-600">Hours This Month</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                ${((user.wagePerHour || 0) * (user.hoursThisMonth || 0)).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Monthly Earnings</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;
