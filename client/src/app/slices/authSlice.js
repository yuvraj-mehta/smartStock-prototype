import { createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { config } from "../../../config/config.js";

const API_BASE_URL = config.apiBaseUrl;

const initialState = {
  loading: false,
  error: null,
  message: null,
  user: null,
  token: null,
  isAuthenticated: false,
}

const authSlice = createSlice({
  name: "auth",
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
        localStorage.setItem("user", JSON.stringify(state.user));
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
  }
})


export const login = (data) => async (dispatch) => {
  dispatch(authSlice.actions.loginRequest());
  try {
    const res = await axios.post(`${API_BASE_URL}/auth/login`, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    // Store token in localStorage
    if (res.data.token) {
      localStorage.setItem("token", res.data.token);
    }
    if (res.data.user) {
      localStorage.setItem("user", JSON.stringify(res.data.user));
    }
    dispatch(authSlice.actions.loginSuccess(res.data));
    console.log(initialState);

  } catch (error) {
    dispatch(authSlice.actions.loginFailed(error.response?.data?.message || error.message));
  }
};

export const logout = () => async (dispatch, getState) => {
  dispatch(authSlice.actions.logoutRequest());
  try {
    const token = getState().auth.token || localStorage.getItem("token");
    const res = await axios.get(`${API_BASE_URL}/auth/logout`, {
      withCredentials: true,
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    // Clear localStorage
    console.log(res);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    dispatch(authSlice.actions.logoutSuccess(res.data.message));
    dispatch(authSlice.actions.resetAuthSlice());
  } catch (error) {
    dispatch(authSlice.actions.logoutFailed(error.response?.data?.message || error.message));
  }
};

// Export the updateUserData action
export const { updateUserData } = authSlice.actions;

export default authSlice.reducer;