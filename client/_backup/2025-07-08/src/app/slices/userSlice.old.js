import { createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { config } from '../../../config/config.js';
import { updateUserData } from './authSlice.js';

const API_BASE_URL = config.apiBaseUrl;

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
      // Map _id to id for consistent frontend usage
      const users = action.payload.users.map(user => ({
        ...user,
        id: user._id || user.id,
      }));
      state.users = users;
      state.totalUsers = action.payload.totalUsers;
      state.message = action.payload.message;
    },
    getUsersFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.users = [];
      state.totalUsers = 0;
    },

    // Get single user
    getUserRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    getUserSuccess(state, action) {
      state.loading = false;
      const user = action.payload.user;
      // Map _id to id for consistent frontend usage
      state.selectedUser = { ...user, id: user._id || user.id };
      state.message = action.payload.message;
    },
    getUserFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.selectedUser = null;
    },

    // Create user
    createUserRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    createUserSuccess(state, action) {
      state.loading = false;
      const user = action.payload.user;
      // Map _id to id for consistent frontend usage
      const userWithId = { ...user, id: user._id || user.id };
      state.users.push(userWithId);
      state.totalUsers += 1;
      state.message = action.payload.message;
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
      const updatedUser = action.payload.user;
      // Map _id to id for consistent frontend usage
      const userWithId = { ...updatedUser, id: updatedUser._id || updatedUser.id };
      const index = state.users.findIndex(user => (user.id === userWithId.id || user._id === userWithId.id));
      if (index !== -1) {
        state.users[index] = userWithId;
      }
      if (state.selectedUser && (state.selectedUser.id === userWithId.id || state.selectedUser._id === userWithId.id)) {
        state.selectedUser = userWithId;
      }
      state.message = action.payload.message;
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
      const deletedUserId = action.payload.userId;
      state.users = state.users.filter(user => user.id !== deletedUserId && user._id !== deletedUserId);
      state.totalUsers -= 1;
      if (state.selectedUser && (state.selectedUser.id === deletedUserId || state.selectedUser._id === deletedUserId)) {
        state.selectedUser = null;
      }
      state.message = action.payload.message;
    },
    deleteUserFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Update current user profile
    updateProfileRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    updateProfileSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
    },
    updateProfileFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Reset slice
    resetUserSlice(state) {
      state.loading = false;
      state.error = null;
      state.message = null;
      state.selectedUser = null;
    },

    // Clear selected user
    clearSelectedUser(state) {
      state.selectedUser = null;
    },
  },
});

// Async action creators
export const getAllUsers = () => async (dispatch, getState) => {
  dispatch(userSlice.actions.getUsersRequest());
  try {
    const token = getState().auth.token || localStorage.getItem('token');
    const res = await axios.get(`${API_BASE_URL}/user/all`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    dispatch(userSlice.actions.getUsersSuccess(res.data));
  } catch (error) {
    dispatch(userSlice.actions.getUsersFailed(error.response?.data?.message || error.message));
  }
};

export const getUserDetails = (userId) => async (dispatch, getState) => {
  dispatch(userSlice.actions.getUserRequest());
  try {
    const token = getState().auth.token || localStorage.getItem('token');
    const res = await axios.get(`${API_BASE_URL}/user/${userId}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    dispatch(userSlice.actions.getUserSuccess(res.data));
  } catch (error) {
    dispatch(userSlice.actions.getUserFailed(error.response?.data?.message || error.message));
  }
};

export const createUser = (userData) => async (dispatch, getState) => {
  dispatch(userSlice.actions.createUserRequest());
  try {
    const token = getState().auth.token || localStorage.getItem('token');
    const res = await axios.post(`${API_BASE_URL}/user/create`, userData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    dispatch(userSlice.actions.createUserSuccess(res.data));
  } catch (error) {
    dispatch(userSlice.actions.createUserFailed(error.response?.data?.message || error.message));
  }
};

export const updateUser = (userId, userData) => async (dispatch, getState) => {
  dispatch(userSlice.actions.updateUserRequest());
  try {
    const token = getState().auth.token || localStorage.getItem('token');
    const res = await axios.put(`${API_BASE_URL}/user/update/${userId}`, userData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    dispatch(userSlice.actions.updateUserSuccess(res.data));
  } catch (error) {
    dispatch(userSlice.actions.updateUserFailed(error.response?.data?.message || error.message));
  }
};

export const deleteUser = (userId) => async (dispatch, getState) => {
  dispatch(userSlice.actions.deleteUserRequest());
  try {
    const token = getState().auth.token || localStorage.getItem('token');
    const res = await axios.delete(`${API_BASE_URL}/user/delete/${userId}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    dispatch(userSlice.actions.deleteUserSuccess({
      ...res.data,
      userId: userId,
    }));
  } catch (error) {
    dispatch(userSlice.actions.deleteUserFailed(error.response?.data?.message || error.message));
  }
};

export const createSupplier = (supplierData) => async (dispatch, getState) => {
  dispatch(userSlice.actions.createUserRequest());
  try {
    const token = getState().auth.token || localStorage.getItem('token');
    const res = await axios.post(`${API_BASE_URL}/user/create-supplier`, supplierData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    dispatch(userSlice.actions.createUserSuccess(res.data));
  } catch (error) {
    dispatch(userSlice.actions.createUserFailed(error.response?.data?.message || error.message));
  }
};

export const createTransporter = (transporterData) => async (dispatch, getState) => {
  dispatch(userSlice.actions.createUserRequest());
  try {
    const token = getState().auth.token || localStorage.getItem('token');
    const res = await axios.post(`${API_BASE_URL}/user/create-transporter`, transporterData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    dispatch(userSlice.actions.createUserSuccess(res.data));
  } catch (error) {
    dispatch(userSlice.actions.createUserFailed(error.response?.data?.message || error.message));
  }
};

export const updateProfile = (profileData) => async (dispatch, getState) => {
  dispatch(userSlice.actions.updateProfileRequest());
  try {
    const token = getState().auth.token || localStorage.getItem('token');
    const res = await axios.put(`${API_BASE_URL}/auth/update-profile`, profileData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    dispatch(userSlice.actions.updateProfileSuccess(res.data));

    // Update the auth state with the new user data
    if (res.data.user) {
      dispatch(updateUserData(res.data.user));
    }

    return res.data;
  } catch (error) {
    dispatch(userSlice.actions.updateProfileFailed(error.response?.data?.message || error.message));
    throw error;
  }
};

// Export actions for direct use
export const { resetUserSlice, clearSelectedUser } = userSlice.actions;

export default userSlice.reducer;