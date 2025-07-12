

import { createSlice } from '@reduxjs/toolkit';
import axios from 'axios';
import { config } from '../../../config/config.js';

const API_BASE_URL = config.apiBaseUrl;

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

export const fetchProducts = () => async (dispatch, getState) => {
  dispatch(productSlice.actions.fetchProductsRequest());
  try {
    const token = getState().auth.token || localStorage.getItem('token');
    const res = await axios.get(`${API_BASE_URL}/product/all`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
      },
      withCredentials: true,
    });
    dispatch(productSlice.actions.fetchProductsSuccess(res.data));
  } catch (error) {
    dispatch(productSlice.actions.fetchProductsFailed(error.response?.data?.message || error.message));
  }
};

export const { resetProductSlice } = productSlice.actions;

export default productSlice.reducer;
