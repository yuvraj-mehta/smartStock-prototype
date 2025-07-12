import { createSlice } from '@reduxjs/toolkit';

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

// Mock action creators - replace with your new backend integration
export const fetchSuppliers = () => async (dispatch) => {
  dispatch(supplierSlice.actions.fetchSuppliersRequest());
  try {
    // TODO: Replace with new backend API call
    // Mock suppliers data for now
    const mockSuppliers = [
      {
        _id: '1',
        fullName: 'ABC Suppliers',
        companyName: 'ABC Supply Co.',
        email: 'contact@abcsupply.com',
        phone: '1234567890',
        address: '123 Supply St, City, State',
        role: 'supplier',
        contactPerson: 'John Smith',
        status: 'active',
      },
      {
        _id: '2',
        fullName: 'XYZ Distributors',
        companyName: 'XYZ Distribution Ltd.',
        email: 'info@xyzdist.com',
        phone: '0987654321',
        address: '456 Distribution Ave, City, State',
        role: 'supplier',
        contactPerson: 'Jane Doe',
        status: 'active',
      },
    ];

    dispatch(supplierSlice.actions.fetchSuppliersSuccess({
      externalUsers: mockSuppliers,
      message: 'Suppliers fetched successfully.'
    }));
  } catch (error) {
    dispatch(supplierSlice.actions.fetchSuppliersFailed(error.message));
  }
};

export const { clearSupplierMessages, resetSupplierSlice } = supplierSlice.actions;
export default supplierSlice.reducer;
