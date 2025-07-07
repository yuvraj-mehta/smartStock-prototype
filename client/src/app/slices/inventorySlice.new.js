import { createSlice } from '@reduxjs/toolkit';

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

    // Product inventory
    fetchProductInventoryRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    fetchProductInventorySuccess(state, action) {
      state.loading = false;
      state.productInventory = action.payload.productInventory;
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

    // Clear messages
    clearInventoryMessages(state) {
      state.error = null;
      state.message = null;
    },
  },
});

// Mock action creators - replace with your new backend integration
export const fetchInventory = () => async (dispatch) => {
  dispatch(inventorySlice.actions.fetchInventoryRequest());
  try {
    // TODO: Replace with new backend API call
    // Mock inventory data for now
    const mockInventoryProducts = [
      {
        product: {
          _id: '1',
          productName: 'Sample Product 1',
          sku: 'SP001',
          price: 29.99,
          category: 'Electronics',
        },
        batches: [
          {
            _id: 'batch1',
            batchNumber: 'B001',
            quantity: 100,
            mfgDate: '2024-01-01',
            expDate: '2024-12-31',
            status: 'active',
          },
        ],
        totalQuantity: 100,
      },
      {
        product: {
          _id: '2',
          productName: 'Sample Product 2',
          sku: 'SP002',
          price: 49.99,
          category: 'Books',
        },
        batches: [
          {
            _id: 'batch2',
            batchNumber: 'B002',
            quantity: 50,
            mfgDate: '2024-01-15',
            expDate: '2024-12-31',
            status: 'active',
          },
        ],
        totalQuantity: 50,
      },
    ];

    dispatch(inventorySlice.actions.fetchInventorySuccess({
      products: mockInventoryProducts,
      totalProducts: mockInventoryProducts.length,
      message: 'Inventory fetched successfully.'
    }));
  } catch (error) {
    dispatch(inventorySlice.actions.fetchInventoryFailed(error.message));
  }
};

export const addInventorySupply = (supplyData) => async (dispatch) => {
  dispatch(inventorySlice.actions.addInventorySupplyRequest());
  try {
    // TODO: Replace with new backend API call
    dispatch(inventorySlice.actions.addInventorySupplySuccess({
      message: 'Inventory supply added successfully.'
    }));
  } catch (error) {
    dispatch(inventorySlice.actions.addInventorySupplyFailed(error.message));
  }
};

export const markDamagedInventory = (damagedData) => async (dispatch) => {
  dispatch(inventorySlice.actions.markDamagedInventoryRequest());
  try {
    // TODO: Replace with new backend API call
    dispatch(inventorySlice.actions.markDamagedInventorySuccess({
      message: 'Inventory marked as damaged successfully.'
    }));
  } catch (error) {
    dispatch(inventorySlice.actions.markDamagedInventoryFailed(error.message));
  }
};

export const fetchProductInventory = (productId) => async (dispatch) => {
  dispatch(inventorySlice.actions.fetchProductInventoryRequest());
  try {
    // TODO: Replace with new backend API call
    // Mock product inventory data
    const mockProductInventory = {
      product: {
        _id: productId,
        productName: 'Sample Product',
        sku: 'SP001',
      },
      batches: [
        {
          _id: 'batch1',
          batchNumber: 'B001',
          quantity: 100,
          mfgDate: '2024-01-01',
          expDate: '2024-12-31',
        },
      ],
      totalQuantity: 100,
    };

    dispatch(inventorySlice.actions.fetchProductInventorySuccess({
      productInventory: mockProductInventory,
      message: 'Product inventory fetched successfully.'
    }));
  } catch (error) {
    dispatch(inventorySlice.actions.fetchProductInventoryFailed(error.message));
  }
};

export const fetchRealTimeInventoryStatus = (filters = {}) => async (dispatch) => {
  dispatch(inventorySlice.actions.fetchRealTimeStatusRequest());
  try {
    // TODO: Replace with new backend API call
    // Mock real-time inventory status
    const mockInventoryStatus = {
      totalItems: 150,
      lowStockItems: 5,
      outOfStockItems: 2,
      expiringSoon: 3,
      damagedItems: 1,
      lastUpdated: new Date().toISOString(),
    };

    dispatch(inventorySlice.actions.fetchRealTimeStatusSuccess({
      inventoryStatus: mockInventoryStatus,
      message: 'Real-time inventory status fetched successfully.'
    }));
  } catch (error) {
    dispatch(inventorySlice.actions.fetchRealTimeStatusFailed(error.message));
  }
};

export const trackBatchByNumber = (batchNumber) => async (dispatch) => {
  dispatch(inventorySlice.actions.trackBatchRequest());
  try {
    // TODO: Replace with new backend API call
    // Mock batch tracking data
    const mockBatchTracking = {
      batchNumber: batchNumber,
      product: {
        _id: '1',
        productName: 'Sample Product',
        sku: 'SP001',
      },
      quantity: 100,
      mfgDate: '2024-01-01',
      expDate: '2024-12-31',
      status: 'active',
      location: 'Warehouse A',
      supplier: 'Sample Supplier',
      history: [
        {
          action: 'received',
          date: '2024-01-01',
          quantity: 100,
          location: 'Warehouse A',
        },
      ],
    };

    dispatch(inventorySlice.actions.trackBatchSuccess({
      batchTracking: mockBatchTracking,
      message: 'Batch tracking information fetched successfully.'
    }));
  } catch (error) {
    dispatch(inventorySlice.actions.trackBatchFailed(error.message));
  }
};

export const { clearInventoryMessages } = inventorySlice.actions;
export default inventorySlice.reducer;
