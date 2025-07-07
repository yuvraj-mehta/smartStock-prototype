import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  loading: false,
  error: null,
  message: null,
  products: [],
};

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    fetchProductsRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    fetchProductsSuccess(state, action) {
      state.loading = false;
      state.products = action.payload.products;
      state.message = action.payload.message || 'Products fetched successfully.';
    },
    fetchProductsFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    resetProductSlice(state) {
      state.loading = false;
      state.error = null;
      state.message = null;
      state.products = [];
    },
  },
});

// Mock fetch products function - replace with your new backend integration
export const fetchProducts = () => async (dispatch) => {
  dispatch(productSlice.actions.fetchProductsRequest());
  try {
    // TODO: Replace with new backend API call
    // Mock products data for now
    const mockProducts = [
      {
        _id: '1',
        productName: 'Sample Product 1',
        sku: 'SP001',
        price: 29.99,
        quantity: 100,
        category: 'Electronics',
        isActive: true,
      },
      {
        _id: '2',
        productName: 'Sample Product 2',
        sku: 'SP002',
        price: 49.99,
        quantity: 50,
        category: 'Books',
        isActive: true,
      },
    ];

    dispatch(productSlice.actions.fetchProductsSuccess({
      products: mockProducts,
      message: 'Products fetched successfully.'
    }));
  } catch (error) {
    dispatch(productSlice.actions.fetchProductsFailed(error.message));
  }
};

export const { resetProductSlice } = productSlice.actions;
export default productSlice.reducer;
