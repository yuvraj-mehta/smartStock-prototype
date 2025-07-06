import { useDispatch, useSelector } from 'react-redux';
import {
  getAllUsers,
  getUserDetails,
  createUser,
  updateUser,
  deleteUser,
  createSupplier,
  createTransporter,
  updateProfile,
  resetUserSlice,
  clearSelectedUser
} from '../app/slices/userSlice';

/**
 * Custom hook for user management operations
 * Provides access to user state and actions
 */
export const useUsers = () => {
  const dispatch = useDispatch();
  const userState = useSelector(state => state.users);

  return {
    // State
    users: userState.users,
    selectedUser: userState.selectedUser,
    loading: userState.loading,
    error: userState.error,
    message: userState.message,
    totalUsers: userState.totalUsers,

    // Actions
    getAllUsers: () => dispatch(getAllUsers()),
    getUserDetails: (userId) => dispatch(getUserDetails(userId)),
    createUser: (userData) => dispatch(createUser(userData)),
    updateUser: (userId, userData) => dispatch(updateUser(userId, userData)),
    updateProfile: (profileData) => dispatch(updateProfile(profileData)),
    deleteUser: (userId) => dispatch(deleteUser(userId)),
    createSupplier: (supplierData) => dispatch(createSupplier(supplierData)),
    createTransporter: (transporterData) => dispatch(createTransporter(transporterData)),
    resetUserSlice: () => dispatch(resetUserSlice()),
    clearSelectedUser: () => dispatch(clearSelectedUser()),
  };
};

/**
 * Custom hook for user filtering and searching
 */
export const useUserFilters = () => {
  const { users } = useUsers();

  const filterByRole = (role) => {
    return users.filter(user => user.role === role);
  };

  const filterByStatus = (status) => {
    return users.filter(user => user.status === status);
  };

  const filterByShift = (shift) => {
    return users.filter(user => user.shift === shift);
  };

  const searchUsers = (searchTerm) => {
    const term = searchTerm.toLowerCase();
    return users.filter(user =>
      user.fullName.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term)
    );
  };

  const sortUsers = (sortBy = 'fullName', order = 'asc') => {
    return [...users].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  return {
    filterByRole,
    filterByStatus,
    filterByShift,
    searchUsers,
    sortUsers,
  };
};

/**
 * Custom hook for user statistics
 */
export const useUserStats = () => {
  const { users } = useUsers();

  const getActiveUsers = () => users.filter(user => user.status === 'active');
  const getInactiveUsers = () => users.filter(user => user.status === 'inactive');
  const getSuspendedUsers = () => users.filter(user => user.status === 'suspended');

  const getUsersByRole = () => {
    return users.reduce((acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1;
      return acc;
    }, {});
  };

  const getUsersByShift = () => {
    return users.reduce((acc, user) => {
      if (user.shift) {
        acc[user.shift] = (acc[user.shift] || 0) + 1;
      }
      return acc;
    }, {});
  };

  const getTotalWages = () => {
    return users.reduce((total, user) => {
      return total + (user.wagePerHour * user.hoursThisMonth || 0);
    }, 0);
  };

  const getAverageWage = () => {
    if (users.length === 0) return 0;
    const totalWage = users.reduce((sum, user) => sum + user.wagePerHour, 0);
    return totalWage / users.length;
  };

  return {
    activeUsers: getActiveUsers(),
    inactiveUsers: getInactiveUsers(),
    suspendedUsers: getSuspendedUsers(),
    usersByRole: getUsersByRole(),
    usersByShift: getUsersByShift(),
    totalWages: getTotalWages(),
    averageWage: getAverageWage(),
    totalUsers: users.length,
  };
};
