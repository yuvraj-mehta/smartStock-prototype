import { createSlice } from '@reduxjs/toolkit';
import { authAPI } from '../../services/api';
import {
  clearAuthStorage,
  getAuthSession,
  setAuthSession,
} from '../../utils/storage';

const initialState = {
  loading: false,
  isBootstrapping: true,
  error: null,
  message: null,
  user: null,
  token: null,
  isAuthenticated: false,
};

const isValidUser = (user) => {
  return Boolean(user && typeof user === 'object' && (user.id || user._id || user.email));
};

const isValidSession = ({ token, user } = {}) => {
  return Boolean(token && isValidUser(user));
};

const getErrorMessage = (error, fallback) => {
  return error.response?.data?.message || error.message || fallback;
};

const getAuthPayload = (responseData = {}) => {
  return {
    token: responseData.token || responseData.accessToken || null,
    user: responseData.user || responseData.data?.user || null,
    message: responseData.message,
  };
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authBootstrapComplete(state, action) {
      const { token = null, user = null } = action.payload || {};
      const hasSession = isValidSession({ token, user });

      state.loading = false;
      state.isBootstrapping = false;
      state.error = null;
      state.message = null;
      state.user = hasSession ? user : null;
      state.token = hasSession ? token : null;
      state.isAuthenticated = hasSession;
    },
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
      state.isBootstrapping = false;
    },
    loginFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.isBootstrapping = false;
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
      state.isBootstrapping = false;
    },
    logoutFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.message = null;
      state.isBootstrapping = false;
    },

    rehydrate: (state, action) => {
      const { token = null, user = null } = action.payload || {};
      const hasSession = isValidSession({ token, user });

      state.user = hasSession ? user : null;
      state.token = hasSession ? token : null;
      state.isAuthenticated = hasSession;
      state.isBootstrapping = false;
      state.loading = false;
      state.error = null;
    },

    updateUserData: (state, action) => {
      state.user = { ...state.user, ...action.payload };

      if (state.token && isValidUser(state.user)) {
        setAuthSession({ token: state.token, user: state.user });
      }
    },

    refreshUserRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },

    refreshUserFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
      state.message = null;
    },

    resetAuthSlice(state) {
      state.error = null;
      state.loading = false;
      state.isBootstrapping = false;
      state.message = null;
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
  },
});

export const bootstrapAuth = () => (dispatch) => {
  const session = getAuthSession();

  if (isValidSession(session)) {
    setAuthSession(session);
    dispatch(authSlice.actions.rehydrate(session));
    return;
  }

  clearAuthStorage();
  dispatch(authSlice.actions.authBootstrapComplete());
};

// Login function with backend integration
export const login = (data) => async (dispatch) => {
  dispatch(authSlice.actions.loginRequest());
  try {
    const response = await authAPI.login(data);
    const { user, token, message } = getAuthPayload(response.data);

    if (!isValidSession({ token, user })) {
      throw new Error('Login response did not include a valid user session.');
    }

    setAuthSession({ token, user });

    dispatch(authSlice.actions.loginSuccess({
      user: user,
      token: token,
      message: message || 'Login successful',
    }));
  } catch (error) {
    clearAuthStorage();
    const errorMessage = getErrorMessage(error, 'Login failed');
    dispatch(authSlice.actions.loginFailed(errorMessage));
  }
};

export const logout = () => async (dispatch) => {
  dispatch(authSlice.actions.logoutRequest());
  try {
    await authAPI.logout();
    dispatch(authSlice.actions.logoutSuccess('Logout successful'));
  } catch {
    dispatch(authSlice.actions.logoutSuccess('Logout successful'));
  } finally {
    clearAuthStorage();
  }
};

// Refresh user details function
export const refreshUserDetails = () => async (dispatch) => {
  dispatch(authSlice.actions.refreshUserRequest());
  try {
    const response = await authAPI.getMyDetails();
    const user = response.data.user;
    const token = getAuthSession().token;

    if (!token || !isValidUser(user)) {
      throw new Error('Unable to refresh the current user session.');
    }

    setAuthSession({ token, user });

    dispatch(authSlice.actions.updateUserData(user));
    dispatch(authSlice.actions.loginSuccess({
      user: user,
      token,
      message: 'User details refreshed successfully',
    }));
  } catch (error) {
    const errorMessage = getErrorMessage(error, 'Failed to refresh user details');

    if (error.response?.status === 401) {
      clearAuthStorage();
      dispatch(authSlice.actions.loginFailed(errorMessage));
      return;
    }

    dispatch(authSlice.actions.refreshUserFailed(errorMessage));
  }
};

// Export the updateUserData action
export const { rehydrate, updateUserData } = authSlice.actions;

export default authSlice.reducer;
