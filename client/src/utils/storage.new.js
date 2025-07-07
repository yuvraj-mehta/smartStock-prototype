/**
 * Storage Utilities
 *
 * This module provides utilities for localStorage and sessionStorage operations
 * with error handling and JSON serialization/deserialization.
 *
 * @module storage
 */

/**
 * Get item from localStorage
 * @param {string} key - The storage key
 * @param {*} defaultValue - Default value if key doesn't exist
 * @returns {*} The stored value or default value
 */
export const getStorageItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error(`Error getting item from localStorage: ${key}`, error);
    return defaultValue;
  }
};

/**
 * Set item in localStorage
 * @param {string} key - The storage key
 * @param {*} value - The value to store
 * @returns {boolean} Success status
 */
export const setStorageItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
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
  try {
    localStorage.removeItem(key);
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
  try {
    localStorage.clear();
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
  try {
    const item = sessionStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (error) {
    console.error(`Error getting item from sessionStorage: ${key}`, error);
    return defaultValue;
  }
};

/**
 * Set item in sessionStorage
 * @param {string} key - The storage key
 * @param {*} value - The value to store
 * @returns {boolean} Success status
 */
export const setSessionItem = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
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
  try {
    sessionStorage.removeItem(key);
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
  try {
    sessionStorage.clear();
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
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
};
