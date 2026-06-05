/**
 * Storage Utilities
 *
 * This module provides utilities for localStorage and sessionStorage operations
 * with error handling and JSON serialization/deserialization.
 *
 * @module storage
 */

import { AUTH_CONSTANTS } from '../constants';

const getLocalStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  return window.localStorage;
};

const getSessionStorage = () => {
  if (typeof window === 'undefined' || !window.sessionStorage) {
    return null;
  }

  return window.sessionStorage;
};

/**
 * Get item from localStorage
 * @param {string} key - The storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} The stored value or default value
 */
export const getStorageItem = (key, defaultValue = null) => {
  const storage = getLocalStorage();
  if (!storage) {
    return defaultValue;
  }

  try {
    const item = storage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item);
  } catch {
    const rawItem = storage.getItem(key);
    return rawItem ?? defaultValue;
  }
};

/**
 * Set item in localStorage
 * @param {string} key - The storage key
 * @param {*} value - The value to store
 * @returns {boolean} Success status
 */
export const setStorageItem = (key, value) => {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error setting item in localStorage: ${key}`, error);
    return false;
  }
};

/**
 * Remove item from localStorage
 * @param {string} key - The storage key
 * @returns {boolean} Success status
 */
export const removeStorageItem = (key) => {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing item from localStorage: ${key}`, error);
    return false;
  }
};

/**
 * Clear all items from localStorage
 * @returns {boolean} Success status
 */
export const clearStorage = () => {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage', error);
    return false;
  }
};

/**
 * Get item from sessionStorage
 * @param {string} key - The storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} The stored value or default value
 */
export const getSessionItem = (key, defaultValue = null) => {
  const storage = getSessionStorage();
  if (!storage) {
    return defaultValue;
  }

  try {
    const item = storage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item);
  } catch {
    const rawItem = storage.getItem(key);
    return rawItem ?? defaultValue;
  }
};

/**
 * Set item in sessionStorage
 * @param {string} key - The storage key
 * @param {*} value - The value to store
 * @returns {boolean} Success status
 */
export const setSessionItem = (key, value) => {
  const storage = getSessionStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error setting item in sessionStorage: ${key}`, error);
    return false;
  }
};

/**
 * Remove item from sessionStorage
 * @param {string} key - The storage key
 * @returns {boolean} Success status
 */
export const removeSessionItem = (key) => {
  const storage = getSessionStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing item from sessionStorage: ${key}`, error);
    return false;
  }
};

/**
 * Clear all items from sessionStorage
 * @returns {boolean} Success status
 */
export const clearSessionStorage = () => {
  const storage = getSessionStorage();
  if (!storage) {
    return false;
  }

  try {
    storage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing sessionStorage', error);
    return false;
  }
};

/**
 * Check if storage is available
 * @param {string} type - 'localStorage' or 'sessionStorage'
 * @returns {boolean} Storage availability
 */
export const isStorageAvailable = (type = 'localStorage') => {
  try {
    if (typeof window === 'undefined') {
      return false;
    }

    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

export const getAuthToken = () => {
  return (
    getStorageItem(AUTH_CONSTANTS.TOKEN_KEY) ||
    getStorageItem(AUTH_CONSTANTS.LEGACY_TOKEN_KEY)
  );
};

export const getAuthUser = () => {
  const user =
    getStorageItem(AUTH_CONSTANTS.USER_KEY) ||
    getStorageItem(AUTH_CONSTANTS.LEGACY_USER_KEY);

  return user && typeof user === 'object' ? user : null;
};

export const getAuthSession = () => {
  return {
    token: getAuthToken(),
    user: getAuthUser(),
  };
};

export const setAuthSession = ({ token, user }) => {
  if (token) {
    setStorageItem(AUTH_CONSTANTS.TOKEN_KEY, token);
  }

  if (user) {
    setStorageItem(AUTH_CONSTANTS.USER_KEY, user);
  }

  removeStorageItem(AUTH_CONSTANTS.LEGACY_TOKEN_KEY);
  removeStorageItem(AUTH_CONSTANTS.LEGACY_USER_KEY);
};

export const clearAuthStorage = () => {
  removeStorageItem(AUTH_CONSTANTS.TOKEN_KEY);
  removeStorageItem(AUTH_CONSTANTS.USER_KEY);
  removeStorageItem(AUTH_CONSTANTS.REFRESH_TOKEN_KEY);
  removeStorageItem(AUTH_CONSTANTS.LEGACY_TOKEN_KEY);
  removeStorageItem(AUTH_CONSTANTS.LEGACY_USER_KEY);
};
