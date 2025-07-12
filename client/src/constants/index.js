/**
 * Application Constants
 *
 * This module contains all application-wide constants including API endpoints,
 * configuration values, and shared constants.
 *
 * @module constants
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL, // Only use env variable
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// Authentication Constants
export const AUTH_CONSTANTS = {
  TOKEN_KEY: 'smartstock_token',
  REFRESH_TOKEN_KEY: 'smartstock_refresh_token',
  USER_KEY: 'smartstock_user',
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
};

// Route Constants
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  ADMIN: '/admin',
  INVENTORY: '/inventory',
  PRODUCTS: '/products',
  USERS: '/users',
  ORDERS: '/orders',
  PROFILE: '/profile',
  TRANSPORT: '/transport',
  AI_ASSISTANT: '/ai-assistant',
  UNAUTHORIZED: '/unauthorized',
  NOT_FOUND: '*',
};

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  EXTERNAL: 'external',
};

// Product Categories
export const PRODUCT_CATEGORIES = {
  ELECTRONICS: 'electronics',
  CLOTHING: 'clothing',
  HOME_GARDEN: 'home_garden',
  SPORTS: 'sports',
  BOOKS: 'books',
  HEALTH: 'health',
  AUTOMOTIVE: 'automotive',
  FOOD: 'food',
  OTHER: 'other',
};

// Inventory Status
export const INVENTORY_STATUS = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock',
  DISCONTINUED: 'discontinued',
};

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
};

// UI Constants
export const UI_CONSTANTS = {
  DEBOUNCE_DELAY: 300,
  PAGINATION_LIMIT: 20,
  TOAST_DURATION: 3500,
  MODAL_ANIMATION_DURATION: 200,
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied. You do not have permission to access this resource.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Successfully logged in!',
  LOGOUT_SUCCESS: 'Successfully logged out!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  ITEM_CREATED: 'Item created successfully!',
  ITEM_UPDATED: 'Item updated successfully!',
  ITEM_DELETED: 'Item deleted successfully!',
};

// Validation Constants
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_REGEX: /^\+?[\d\s-()]+$/,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};

// Theme Constants
export const THEME = {
  COLORS: {
    PRIMARY: '#2563EB',
    SECONDARY: '#64748B',
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    ERROR: '#EF4444',
    INFO: '#3B82F6',
  },
  BREAKPOINTS: {
    SM: '640px',
    MD: '768px',
    LG: '1024px',
    XL: '1280px',
    '2XL': '1536px',
  },
};

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_AI_ASSISTANT: import.meta.env.VITE_ENABLE_AI_ASSISTANT === 'true',
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_NOTIFICATIONS: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true',
  ENABLE_DARK_MODE: import.meta.env.VITE_ENABLE_DARK_MODE === 'true',
};