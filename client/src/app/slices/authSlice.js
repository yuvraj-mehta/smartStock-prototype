import { createSlice } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api';

const initialState = {
  loading: false,
  error: null,
  message: null,
  user: null,
  token: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    loginSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    loginFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    },

    logoutRequest(state) {
      state.loading = true;
      state.message = null;
      state.error = null;
    },
    logoutSuccess(state, action) {
      state.loading = false;
      state.message = action.payload;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    },
    logoutFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.message = null;
    },

    rehydrate: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = !!action.payload.token;
      state.loading = false;
      state.error = null;
    },

    updateUserData: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      // Update localStorage as well
      if (state.user) {
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },

    resetAuthSlice(state) {
      state.error = null;
      state.loading = false;
      state.message = null;
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
});

// Login function with backend integration
export const login = (data) => async (dispatch) => {
  dispatch(authSlice.actions.loginRequest());
  try {
    const response = await authAPI.login(data);
    const { user, token, message } = response.data;

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    dispatch(authSlice.actions.loginSuccess({
      user: user,
      token: token,
      message: message || 'Login successful'
    }));
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Login failed';
    dispatch(authSlice.actions.loginFailed(errorMessage));
  }
};

export const logout = () => async (dispatch) => {
  dispatch(authSlice.actions.logoutRequest());
  try {
    // Call backend logout endpoint
    await authAPI.logout();

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch(authSlice.actions.logoutSuccess('Logout successful'));
    dispatch(authSlice.actions.resetAuthSlice());
  } catch (error) {
    // Even if backend logout fails, clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch(authSlice.actions.logoutSuccess('Logout successful'));
    dispatch(authSlice.actions.resetAuthSlice());
  }
};

// Refresh user details function
export const refreshUserDetails = () => async (dispatch) => {
  dispatch(authSlice.actions.loginRequest()); // Reuse loading state
  try {
    const response = await authAPI.getMyDetails();
    const user = response.data.user;

    // Update localStorage with fresh user data
    localStorage.setItem('user', JSON.stringify(user));

    dispatch(authSlice.actions.updateUserData(user));
    dispatch(authSlice.actions.loginSuccess({
      user: user,
      token: localStorage.getItem('token'), // Keep existing token
      message: 'User details refreshed successfully'
    }));
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to refresh user details';
    dispatch(authSlice.actions.loginFailed(errorMessage));
  }
};

// Export the updateUserData action
export const { updateUserData } = authSlice.actions;

export default authSlice.reducer;