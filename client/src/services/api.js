/**
 * API Service
 * 
 * This module provides API functions for backend communication
 */

import axios from 'axios';
import { API_CONFIG } from '../constants';

// Create axios instance
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authentication token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token invalid, redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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
  getAllExternalUsers: (role) => api.get('/user/external/all' + (role ? `?role=${role}` : '')),
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

// Dashboard API functions
export const dashboardAPI = {
  getInventory: () => api.get('/inventory/all'),
  getAIDashboard: (warehouseId) => api.get(`/ai/dashboard${warehouseId ? `?warehouseId=${warehouseId}` : ''}`),
  getAIInsights: (warehouseId) => api.get(`/ai/insights/intelligent${warehouseId ? `?warehouseId=${warehouseId}` : ''}`),
};

export default api;
