import { createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { config } from "../../../config/config.js";

const API_BASE_URL = config.apiBaseUrl;

const initialState = {
  loading: false,
  error: null,
  message: null,
  suppliers: [], // Array of supplier objects
};

const supplierSlice = createSlice({
  name: "supplier",
  initialState,
  reducers: {
    // Fetch suppliers
    fetchSuppliersRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    fetchSuppliersSuccess(state, action) {
      state.loading = false;
      state.suppliers = action.payload.externalUsers;
      state.message = action.payload.message;
    },
    fetchSuppliersFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Clear messages
    clearSupplierMessages(state) {
      state.error = null;
      state.message = null;
    },

    // Reset supplier slice
    resetSupplierSlice(state) {
      state.loading = false;
      state.error = null;
      state.message = null;
      state.suppliers = [];
    },
  },
});

// Action creators (thunks)
export const fetchSuppliers = () => async (dispatch, getState) => {
  dispatch(supplierSlice.actions.fetchSuppliersRequest());
  try {
    const token = getState().auth.token || localStorage.getItem("token");
    const res = await axios.get(`${API_BASE_URL}/user/external/all?role=supplier`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    dispatch(supplierSlice.actions.fetchSuppliersSuccess(res.data));
  } catch (error) {
    dispatch(supplierSlice.actions.fetchSuppliersFailed(
      error.response?.data?.message || error.message
    ));
  }
};

export const { clearSupplierMessages, resetSupplierSlice } = supplierSlice.actions;
export default supplierSlice.reducer;
