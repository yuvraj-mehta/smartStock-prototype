import { createSlice } from '@reduxjs/toolkit';
import { authAPI, userAPI } from '../../services/api';

const initialState = {
  loading: false,
  error: null,
  message: null,
  users: [],
  selectedUser: null,
  totalUsers: 0,
};

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    // Get all users
    getUsersRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    getUsersSuccess(state, action) {
      state.loading = false;
      state.users = action.payload.users || [];
      state.totalUsers = action.payload.totalUsers || action.payload.users?.length || 0;
      state.message = action.payload.message;
    },
    getUsersFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Get single user
    getUserRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    getUserSuccess(state, action) {
      state.loading = false;
      state.selectedUser = action.payload.user;
      state.message = action.payload.message;
    },
    getUserFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Create user
    createUserRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    createUserSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
      // Add new user to the existing users array
      if (action.payload.user) {
        state.users.push(action.payload.user);
        state.totalUsers += 1;
      }
    },
    createUserFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Update user
    updateUserRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    updateUserSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
      // Update user in the existing users array
      if (action.payload.user) {
        const index = state.users.findIndex(user => user._id === action.payload.user._id);
        if (index !== -1) {
          state.users[index] = action.payload.user;
        }
      }
    },
    updateUserFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Delete user
    deleteUserRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    deleteUserSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
      // Remove user from the existing users array
      if (action.payload.userId) {
        state.users = state.users.filter(user => user._id !== action.payload.userId);
        state.totalUsers -= 1;
      }
    },
    deleteUserFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Clear selected user
    clearSelectedUser(state) {
      state.selectedUser = null;
    },

    // Clear messages
    clearUserMessages(state) {
      state.error = null;
      state.message = null;
    },

    // Reset user slice
    resetUserSlice(state) {
      state.loading = false;
      state.error = null;
      state.message = null;
      state.users = [];
      state.selectedUser = null;
      state.totalUsers = 0;
    },
  },
});

// Mock action creators - replace with your new backend integration
export const getAllUsers = () => async (dispatch) => {
  dispatch(userSlice.actions.getUsersRequest());
  try {
    const response = await userAPI.getAllUsers();
    const users = response.data.users || response.data || [];

    dispatch(userSlice.actions.getUsersSuccess({
      users: users,
      totalUsers: users.length,
      message: response.data.message || 'Users fetched successfully.'
    }));
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch users';
    dispatch(userSlice.actions.getUsersFailed(errorMessage));
  }
};

export const getUserDetails = (userId) => async (dispatch) => {
  dispatch(userSlice.actions.getUserRequest());
  try {
    const response = await userAPI.getUserDetails(userId);

    dispatch(userSlice.actions.getUserSuccess({
      user: response.data.user,
      message: response.data.message || 'User details fetched successfully.'
    }));
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch user details';
    dispatch(userSlice.actions.getUserFailed(errorMessage));
  }
};

export const createUser = (userData) => async (dispatch) => {
  dispatch(userSlice.actions.createUserRequest());
  try {
    const response = await userAPI.createUser(userData);

    dispatch(userSlice.actions.createUserSuccess({
      user: response.data.user,
      message: response.data.message || 'User created successfully.'
    }));
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to create user';
    dispatch(userSlice.actions.createUserFailed(errorMessage));
  }
};

export const updateUser = (userId, userData) => async (dispatch) => {
  dispatch(userSlice.actions.updateUserRequest());
  try {
    const response = await userAPI.updateUser(userId, userData);

    dispatch(userSlice.actions.updateUserSuccess({
      user: response.data.user,
      message: response.data.message || 'User updated successfully.'
    }));
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to update user';
    dispatch(userSlice.actions.updateUserFailed(errorMessage));
  }
};

export const deleteUser = (userId) => async (dispatch) => {
  dispatch(userSlice.actions.deleteUserRequest());
  try {
    const response = await userAPI.deleteUser(userId);

    dispatch(userSlice.actions.deleteUserSuccess({
      userId: userId,
      message: response.data.message || 'User deleted successfully.'
    }));
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to delete user';
    dispatch(userSlice.actions.deleteUserFailed(errorMessage));
  }
};

export const createSupplier = (supplierData) => async (dispatch) => {
  dispatch(userSlice.actions.createUserRequest());
  try {
    const response = await userAPI.createSupplier(supplierData);

    dispatch(userSlice.actions.createUserSuccess({
      user: response.data.user || response.data.supplier,
      message: response.data.message || 'Supplier created successfully.'
    }));
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to create supplier';
    dispatch(userSlice.actions.createUserFailed(errorMessage));
  }
};

export const createTransporter = (transporterData) => async (dispatch) => {
  dispatch(userSlice.actions.createUserRequest());
  try {
    const response = await userAPI.createTransporter(transporterData);

    dispatch(userSlice.actions.createUserSuccess({
      user: response.data.user || response.data.transporter,
      message: response.data.message || 'Transporter created successfully.'
    }));
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to create transporter';
    dispatch(userSlice.actions.createUserFailed(errorMessage));
  }
};

export const updateProfile = (profileData) => async (dispatch) => {
  dispatch(userSlice.actions.updateUserRequest());
  try {
    const response = await authAPI.updateProfile(profileData);

    // Update the user in localStorage
    const updatedUser = response.data.user;
    localStorage.setItem('user', JSON.stringify(updatedUser));

    // Update auth state with the new user data
    dispatch({ type: 'auth/updateUserData', payload: updatedUser });

    dispatch(userSlice.actions.updateUserSuccess({
      user: updatedUser,
      message: response.data.message || 'Profile updated successfully.'
    }));

    return updatedUser;
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile';
    dispatch(userSlice.actions.updateUserFailed(errorMessage));
    throw error;
  }
};

export const { clearUserMessages, resetUserSlice, clearSelectedUser } = userSlice.actions;
export default userSlice.reducer;
