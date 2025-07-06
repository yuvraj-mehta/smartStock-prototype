import { createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { config } from "../../../config/config.js";

const API_BASE_URL = config.apiBaseUrl;

const initialState = {
  loading: false,
  error: null,
  message: null,
  products: [], // Array of inventory products grouped by product with batches
  totalProducts: 0,
  realTimeStatus: null,
  batchTracking: null,
  productInventory: null, // For specific product inventory
};

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    // View all inventory
    fetchInventoryRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    fetchInventorySuccess(state, action) {
      state.loading = false;
      state.products = action.payload.products;
      state.totalProducts = action.payload.totalProducts;
      state.message = action.payload.message;
    },
    fetchInventoryFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Add inventory supply
    addInventorySupplyRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    addInventorySupplySuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
    },
    addInventorySupplyFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Mark damaged inventory
    markDamagedInventoryRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    markDamagedInventorySuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
    },
    markDamagedInventoryFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Get inventory by product
    fetchProductInventoryRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    fetchProductInventorySuccess(state, action) {
      state.loading = false;
      state.productInventory = action.payload.data;
      state.message = action.payload.message;
    },
    fetchProductInventoryFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Real-time inventory status
    fetchRealTimeStatusRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    fetchRealTimeStatusSuccess(state, action) {
      state.loading = false;
      state.realTimeStatus = action.payload.inventoryStatus;
      state.message = action.payload.message;
    },
    fetchRealTimeStatusFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Track batch by number
    trackBatchRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    trackBatchSuccess(state, action) {
      state.loading = false;
      state.batchTracking = action.payload.batchTracking;
      state.message = action.payload.message;
    },
    trackBatchFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Reset inventory slice
    resetInventorySlice(state) {
      state.loading = false;
      state.error = null;
      state.message = null;
      state.products = [];
      state.totalProducts = 0;
      state.realTimeStatus = null;
      state.batchTracking = null;
      state.productInventory = null;
    },

    // Clear messages
    clearInventoryMessages(state) {
      state.error = null;
      state.message = null;
    },
  },
});

// Action creators (thunks)
export const fetchInventory = () => async (dispatch, getState) => {
  dispatch(inventorySlice.actions.fetchInventoryRequest());
  try {
    const token = getState().auth.token || localStorage.getItem("token");
    const res = await axios.get(`${API_BASE_URL}/inventory/all`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    dispatch(inventorySlice.actions.fetchInventorySuccess(res.data));
  } catch (error) {
    dispatch(inventorySlice.actions.fetchInventoryFailed(
      error.response?.data?.message || error.message
    ));
  }
};

export const addInventorySupply = (supplyData) => async (dispatch, getState) => {
  dispatch(inventorySlice.actions.addInventorySupplyRequest());
  try {
    const token = getState().auth.token || localStorage.getItem("token");
    const res = await axios.post(`${API_BASE_URL}/inventory/add-supply`, supplyData, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
        "Content-Type": "application/json",
      },
    });
    dispatch(inventorySlice.actions.addInventorySupplySuccess(res.data));
    // Refresh inventory after adding supply
    dispatch(fetchInventory());
  } catch (error) {
    dispatch(inventorySlice.actions.addInventorySupplyFailed(
      error.response?.data?.message || error.message
    ));
  }
};

export const markDamagedInventory = (damageData) => async (dispatch, getState) => {
  dispatch(inventorySlice.actions.markDamagedInventoryRequest());
  try {
    const token = getState().auth.token || localStorage.getItem("token");
    const res = await axios.post(`${API_BASE_URL}/inventory/mark-damaged`, damageData, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
        "Content-Type": "application/json",
      },
    });
    dispatch(inventorySlice.actions.markDamagedInventorySuccess(res.data));
    // Refresh inventory after marking damaged
    dispatch(fetchInventory());
  } catch (error) {
    dispatch(inventorySlice.actions.markDamagedInventoryFailed(
      error.response?.data?.message || error.message
    ));
  }
};

export const fetchProductInventory = (productId) => async (dispatch, getState) => {
  dispatch(inventorySlice.actions.fetchProductInventoryRequest());
  try {
    const token = getState().auth.token || localStorage.getItem("token");
    const res = await axios.get(`${API_BASE_URL}/inventory/product/${productId}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    dispatch(inventorySlice.actions.fetchProductInventorySuccess(res.data));
  } catch (error) {
    dispatch(inventorySlice.actions.fetchProductInventoryFailed(
      error.response?.data?.message || error.message
    ));
  }
};

export const fetchRealTimeInventoryStatus = (filters = {}) => async (dispatch, getState) => {
  dispatch(inventorySlice.actions.fetchRealTimeStatusRequest());
  try {
    const token = getState().auth.token || localStorage.getItem("token");
    const queryParams = new URLSearchParams();
    if (filters.warehouseId) queryParams.append('warehouseId', filters.warehouseId);
    if (filters.productId) queryParams.append('productId', filters.productId);

    const res = await axios.get(`${API_BASE_URL}/inventory/real-time?${queryParams}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    dispatch(inventorySlice.actions.fetchRealTimeStatusSuccess(res.data));
  } catch (error) {
    dispatch(inventorySlice.actions.fetchRealTimeStatusFailed(
      error.response?.data?.message || error.message
    ));
  }
};

export const trackBatchByNumber = (batchNumber) => async (dispatch, getState) => {
  dispatch(inventorySlice.actions.trackBatchRequest());
  try {
    const token = getState().auth.token || localStorage.getItem("token");
    const res = await axios.get(`${API_BASE_URL}/inventory/batch/track/${batchNumber}`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
    });
    dispatch(inventorySlice.actions.trackBatchSuccess(res.data));
  } catch (error) {
    dispatch(inventorySlice.actions.trackBatchFailed(
      error.response?.data?.message || error.message
    ));
  }
};

export const { clearInventoryMessages, resetInventorySlice } = inventorySlice.actions;
export default inventorySlice.reducer;
