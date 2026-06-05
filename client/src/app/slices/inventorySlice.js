import { createSlice } from '@reduxjs/toolkit';
import { inventoryAPI } from '../../services/api';

const getErrorMessage = (error, fallback) => (
  error.response?.data?.message || error.message || fallback
);

const toNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const normalizeRealTimeInventoryStatus = (payload = {}) => {
  const source = payload.inventoryStatus ?? payload;
  const items = Array.isArray(source)
    ? source
    : Array.isArray(source?.items)
      ? source.items
      : [];

  const totalInStock = typeof source?.totalInStock === 'number'
    ? source.totalInStock
    : items.reduce((sum, item) => sum + toNumber(item.inStock ?? item.totalQuantity), 0);

  const lowStockItems = typeof source?.lowStockItems === 'number'
    ? source.lowStockItems
    : items.filter((item) => {
      const inStock = toNumber(item.inStock ?? item.totalQuantity);
      const threshold = toNumber(item.thresholdLimit);
      return item.stockStatus === 'low' || (inStock > 0 && threshold > 0 && inStock <= threshold);
    }).length;

  const outOfStockItems = typeof source?.outOfStockItems === 'number'
    ? source.outOfStockItems
    : items.filter((item) => (
      item.stockStatus === 'out_of_stock' || toNumber(item.inStock ?? item.totalQuantity) === 0
    )).length;

  return {
    ...(Array.isArray(source) ? {} : source),
    timestamp: payload.timestamp ?? source?.timestamp ?? null,
    items,
    totalInStock,
    lowStockItems,
    outOfStockItems,
  };
};

const initialState = {
  loading: false,
  error: null,
  message: null,
  products: [], // Array of inventory products grouped by product with batches
  totalProducts: 0,
  realTimeStatus: null,
  batchTracking: null,
  productInventory: null, // For specific product inventory
  // Add new totals
  totalInventoryValue: 0,
  totalDamagedValue: 0,
  totalSoldValue: 0,
};

const inventorySlice = createSlice({
  name: 'inventory',
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
      state.products = action.payload.products || [];
      state.totalProducts = action.payload.totalProducts || action.payload.products?.length || 0;
      state.message = action.payload.message;
      // Add new totals from backend
      state.totalInventoryValue = action.payload.totalInventoryValue || 0;
      state.totalDamagedValue = action.payload.totalDamagedValue || 0;
      state.totalSoldValue = action.payload.totalSoldValue || 0;
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
      state.realTimeStatus = normalizeRealTimeInventoryStatus(action.payload);
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
      state.totalInventoryValue = 0;
      state.totalDamagedValue = 0;
      state.totalSoldValue = 0;
    },

    // Clear messages
    clearInventoryMessages(state) {
      state.error = null;
      state.message = null;
    },
  },
});

// Action creators (thunks)
export const fetchInventory = () => async (dispatch) => {
  dispatch(inventorySlice.actions.fetchInventoryRequest());
  try {
    const res = await inventoryAPI.getAllInventory();
    dispatch(inventorySlice.actions.fetchInventorySuccess(res.data));
    return res.data;
  } catch (error) {
    dispatch(inventorySlice.actions.fetchInventoryFailed(
      getErrorMessage(error, 'Failed to fetch inventory.'),
    ));
    return null;
  }
};

export const addInventorySupply = (supplyData) => async (dispatch) => {
  dispatch(inventorySlice.actions.addInventorySupplyRequest());
  try {
    const res = await inventoryAPI.addSupply(supplyData);
    dispatch(inventorySlice.actions.addInventorySupplySuccess(res.data));
    // Refresh inventory after adding supply
    await dispatch(fetchInventory());
    await dispatch(fetchRealTimeInventoryStatus());
    return res.data;
  } catch (error) {
    dispatch(inventorySlice.actions.addInventorySupplyFailed(
      getErrorMessage(error, 'Failed to add inventory supply.'),
    ));
    return null;
  }
};

export const markDamagedInventory = (damageData) => async (dispatch) => {
  dispatch(inventorySlice.actions.markDamagedInventoryRequest());
  try {
    const res = await inventoryAPI.markDamaged(damageData);
    dispatch(inventorySlice.actions.markDamagedInventorySuccess(res.data));
    // Refresh inventory after marking damaged
    await dispatch(fetchInventory());
    await dispatch(fetchRealTimeInventoryStatus());
    return res.data;
  } catch (error) {
    dispatch(inventorySlice.actions.markDamagedInventoryFailed(
      getErrorMessage(error, 'Failed to mark inventory as damaged.'),
    ));
    return null;
  }
};

export const fetchProductInventory = (productId) => async (dispatch) => {
  dispatch(inventorySlice.actions.fetchProductInventoryRequest());
  try {
    const res = await inventoryAPI.getProductInventory(productId);
    dispatch(inventorySlice.actions.fetchProductInventorySuccess(res.data));
    return res.data;
  } catch (error) {
    dispatch(inventorySlice.actions.fetchProductInventoryFailed(
      getErrorMessage(error, 'Failed to fetch product inventory.'),
    ));
    return null;
  }
};

export const fetchRealTimeInventoryStatus = (filters = {}) => async (dispatch) => {
  dispatch(inventorySlice.actions.fetchRealTimeStatusRequest());
  try {
    const res = await inventoryAPI.getRealTimeStatus(filters);
    dispatch(inventorySlice.actions.fetchRealTimeStatusSuccess(res.data));
    return res.data;
  } catch (error) {
    dispatch(inventorySlice.actions.fetchRealTimeStatusFailed(
      getErrorMessage(error, 'Failed to fetch real-time inventory status.'),
    ));
    return null;
  }
};

export const trackBatchByNumber = (batchNumber) => async (dispatch) => {
  dispatch(inventorySlice.actions.trackBatchRequest());
  try {
    const res = await inventoryAPI.trackBatchByNumber(batchNumber);
    dispatch(inventorySlice.actions.trackBatchSuccess(res.data));
    return res.data;
  } catch (error) {
    dispatch(inventorySlice.actions.trackBatchFailed(
      getErrorMessage(error, 'Failed to track batch.'),
    ));
    return null;
  }
};

export const { clearInventoryMessages, resetInventorySlice } = inventorySlice.actions;
export default inventorySlice.reducer;
