/**
 * API Service
 *
 * This module exposes backend API groups using the shared HTTP client.
 */

import httpClient from './httpClient';

const api = httpClient;

// Auth API functions
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.get('/auth/logout'),
  getMyDetails: () => api.get('/user/me'),
  updateProfile: (profileData) => api.put('/auth/update-profile', profileData),
  changePassword: (passwordData) => api.post('/auth/change-password', passwordData),
};

// User API functions
export const userAPI = {
  getAllUsers: () => api.get('/user/all'),
  getUserDetails: (userId) => api.get(`/user/${userId}`),
  createUser: (userData) => api.post('/user/create', userData),
  updateUser: (userId, userData) => api.put(`/user/update/${userId}`, userData),
  deleteUser: (userId) => api.delete(`/user/delete/${userId}`),
  createSupplier: (supplierData) => api.post('/user/create-supplier', supplierData),
  createTransporter: (transporterData) => api.post('/user/create-transporter', transporterData),
  getAllExternalUsers: (role) => api.get(`/user/external/all${  role ? `?role=${role}` : ''}`),
  updateExternalUser: (userId, userData) => api.put(`/user/external/update/${userId}`, userData),
  deleteExternalUser: (userId) => api.delete(`/user/external/delete/${userId}`),
};

// Product API functions
export const productAPI = {
  getAllProducts: () => api.get('/product/all'),
  getProductById: (productId) => api.get(`/product/${productId}`),
  createProduct: (productData) => api.post('/product/add', productData),
  updateProduct: (productId, productData) => api.put(`/product/update/${productId}`, productData),
  deleteProduct: (productId) => api.delete(`/product/delete/${productId}`),
};

// Inventory API functions
export const inventoryAPI = {
  getAllInventory: () => api.get('/inventory/all'),
  addSupply: (supplyData) => api.post('/inventory/add-supply', supplyData),
  markDamaged: (damageData) => api.post('/inventory/mark-damaged', damageData),
  getProductInventory: (productId) => api.get(`/inventory/product/${encodeURIComponent(productId)}`),
  getRealTimeStatus: (filters = {}) => api.get('/inventory/real-time', { params: filters }),
  trackBatchByNumber: (batchNumber) => api.get(`/inventory/batch/track/${encodeURIComponent(batchNumber)}`),
};

// AI API functions
export const aiAPI = {
  getDashboard: (warehouseId) => api.get(`/ai/dashboard${warehouseId ? `?warehouseId=${warehouseId}` : ''}`),
  generateDemandForecast: (forecastParams) => api.post('/ai/forecast/demand', forecastParams),
};

// Dashboard API functions
export const dashboardAPI = {
  getInventory: inventoryAPI.getAllInventory,
  getAIDashboard: aiAPI.getDashboard,
  getAIInsights: (warehouseId) => api.get(`/ai/insights/intelligent${warehouseId ? `?warehouseId=${warehouseId}` : ''}`),
};

export default api;
