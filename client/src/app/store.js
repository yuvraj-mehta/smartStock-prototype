import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import productReducer from './slices/productSlice';
import userReducer from './slices/userSlice';
import inventoryReducer from './slices/inventorySlice';
import supplierReducer from './slices/supplierSlice';

import transportReducer from './slices/transportSlice';
import returnReducer from './slices/returnSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productReducer,
    users: userReducer,
    inventory: inventoryReducer,
    suppliers: supplierReducer,
    transport: transportReducer,
    returns: returnReducer,
  },
});