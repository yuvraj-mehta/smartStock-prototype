import { createSlice } from '@reduxjs/toolkit';
import { productAPI } from '../../services/api';

const initialState = {
  loading: false,
  error: null,
  message: null,
  products: [],
  selectedProduct: null,
  totalProducts: 0,
};

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    // Get all products
    getProductsRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    getProductsSuccess(state, action) {
      state.loading = false;
      state.products = action.payload.products || [];
      state.totalProducts = action.payload.totalProducts || action.payload.products?.length || 0;
      state.message = action.payload.message;
    },
    getProductsFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Get single product
    getProductRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    getProductSuccess(state, action) {
      state.loading = false;
      state.selectedProduct = action.payload.product;
      state.message = action.payload.message;
    },
    getProductFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Create product
    createProductRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    createProductSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
      // Add new product to the existing products array
      if (action.payload.product) {
        state.products.push(action.payload.product);
        state.totalProducts += 1;
      }
    },
    createProductFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Update product
    updateProductRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    updateProductSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
      // Update product in the existing products array
      if (action.payload.product) {
        const index = state.products.findIndex(product => product._id === action.payload.product._id);
        if (index !== -1) {
          state.products[index] = action.payload.product;
        }
      }
    },
    updateProductFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Delete product
    deleteProductRequest(state) {
      state.loading = true;
      state.error = null;
      state.message = null;
    },
    deleteProductSuccess(state, action) {
      state.loading = false;
      state.message = action.payload.message;
      // Remove product from the existing products array
      if (action.payload.productId) {
        state.products = state.products.filter(product => product._id !== action.payload.productId);
        state.totalProducts -= 1;
      }
    },
    deleteProductFailed(state, action) {
      state.loading = false;
      state.error = action.payload;
    },

    // Clear selected product
    clearSelectedProduct(state) {
      state.selectedProduct = null;
    },

    // Clear messages
    clearProductMessages(state) {
      state.error = null;
      state.message = null;
    },

    // Reset product slice
    resetProductSlice(state) {
      state.loading = false;
      state.error = null;
      state.message = null;
      state.products = [];
      state.selectedProduct = null;
      state.totalProducts = 0;
    },
  },
});

// Action creators
export const getAllProducts = () => async (dispatch) => {
  dispatch(productSlice.actions.getProductsRequest());
  try {
    const response = await productAPI.getAllProducts();
    const products = response.data.products || response.data || [];

    dispatch(productSlice.actions.getProductsSuccess({
      products: products,
      totalProducts: products.length,
      message: response.data.message || 'Products fetched successfully.'
    }));
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch products';
    dispatch(productSlice.actions.getProductsFailed(errorMessage));
  }
};

export const getProductDetails = (productId) => async (dispatch) => {
  dispatch(productSlice.actions.getProductRequest());
  try {
    const response = await productAPI.getProductById(productId);

    dispatch(productSlice.actions.getProductSuccess({
      product: response.data.product,
      message: response.data.message || 'Product details fetched successfully.'
    }));
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch product details';
    dispatch(productSlice.actions.getProductFailed(errorMessage));
  }
};

export const createProduct = (productData) => async (dispatch) => {
  dispatch(productSlice.actions.createProductRequest());
  try {
    const response = await productAPI.createProduct(productData);

    dispatch(productSlice.actions.createProductSuccess({
      product: response.data.product,
      message: response.data.message || 'Product created successfully.'
    }));
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to create product';
    dispatch(productSlice.actions.createProductFailed(errorMessage));
  }
};

export const updateProduct = (productId, productData) => async (dispatch) => {
  dispatch(productSlice.actions.updateProductRequest());
  try {
    const response = await productAPI.updateProduct(productId, productData);

    dispatch(productSlice.actions.updateProductSuccess({
      product: response.data.product,
      message: response.data.message || 'Product updated successfully.'
    }));
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to update product';
    dispatch(productSlice.actions.updateProductFailed(errorMessage));
  }
};

export const deleteProduct = (productId) => async (dispatch) => {
  dispatch(productSlice.actions.deleteProductRequest());
  try {
    const response = await productAPI.deleteProduct(productId);

    dispatch(productSlice.actions.deleteProductSuccess({
      productId: productId,
      message: response.data.message || 'Product deleted successfully.'
    }));
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message || 'Failed to delete product';
    dispatch(productSlice.actions.deleteProductFailed(errorMessage));
  }
};

export const { clearProductMessages, resetProductSlice, clearSelectedProduct } = productSlice.actions;
export default productSlice.reducer;
