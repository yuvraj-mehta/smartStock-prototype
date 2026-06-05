import { createSlice } from '@reduxjs/toolkit';
import { userAPI } from '../../services/api';

const getErrorMessage = (error, fallback) => (
  error.response?.data?.message || error.message || fallback
);

const initialState = {
  loading: false,
  error: null,
  message: null,
  suppliers: [], // Array of supplier objects
};

const supplierSlice = createSlice({
  name: 'supplier',
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
      state.suppliers = action.payload.externalUsers || [];
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
export const fetchSuppliers = () => async (dispatch) => {
  dispatch(supplierSlice.actions.fetchSuppliersRequest());
  try {
    const res = await userAPI.getAllExternalUsers('supplier');
    dispatch(supplierSlice.actions.fetchSuppliersSuccess(res.data));
    return res.data;
  } catch (error) {
    dispatch(supplierSlice.actions.fetchSuppliersFailed(
      getErrorMessage(error, 'Failed to fetch suppliers.'),
    ));
    return null;
  }
};

export const { clearSupplierMessages, resetSupplierSlice } = supplierSlice.actions;
export default supplierSlice.reducer;
