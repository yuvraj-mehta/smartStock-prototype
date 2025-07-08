/**
 * Custom Hook for Local Storage
 *
 * This hook provides a React-friendly way to interact with localStorage
 * with automatic state synchronization and error handling.
 *
 * @module useLocalStorage
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for localStorage with React state synchronization
 * @param {string} key - The localStorage key
 * @param {any} initialValue - Initial value if key doesn't exist
 * @param {Object} options - Hook options
 * @returns {Array} [value, setValue, removeValue, error]
 */
export const useLocalStorage = (key, initialValue, options = {}) => {
  const {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
    syncAcrossTabs = false,
  } = options;

  const [error, setError] = useState(null);

  // Get initial value from localStorage
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (err) {
      console.error(`Error reading localStorage key "${key}":`, err);
      setError(err);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists to localStorage
  const setValue = useCallback((value) => {
    try {
      setError(null);
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (valueToStore === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, serialize(valueToStore));
      }
    } catch (err) {
      console.error(`Error setting localStorage key "${key}":`, err);
      setError(err);
    }
  }, [key, storedValue, serialize]);

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      setError(null);
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (err) {
      console.error(`Error removing localStorage key "${key}":`, err);
      setError(err);
    }
  }, [key, initialValue]);

  // Sync across tabs
  useEffect(() => {
    if (!syncAcrossTabs) return;

    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== serialize(storedValue)) {
        try {
          setError(null);
          const newValue = e.newValue ? deserialize(e.newValue) : initialValue;
          setStoredValue(newValue);
        } catch (err) {
          console.error(`Error syncing localStorage key "${key}":`, err);
          setError(err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, storedValue, initialValue, serialize, deserialize, syncAcrossTabs]);

  return [storedValue, setValue, removeValue, error];
};

/**
 * Custom hook for localStorage with automatic JSON serialization
 * @param {string} key - The localStorage key
 * @param {any} initialValue - Initial value if key doesn't exist
 * @param {boolean} syncAcrossTabs - Whether to sync across tabs
 * @returns {Array} [value, setValue, removeValue, error]
 */
export const useLocalStorageState = (key, initialValue, syncAcrossTabs = false) => {
  return useLocalStorage(key, initialValue, {
    serialize: JSON.stringify,
    deserialize: JSON.parse,
    syncAcrossTabs,
  });
};

/**
 * Custom hook for localStorage with string values only
 * @param {string} key - The localStorage key
 * @param {string} initialValue - Initial value if key doesn't exist
 * @param {boolean} syncAcrossTabs - Whether to sync across tabs
 * @returns {Array} [value, setValue, removeValue, error]
 */
export const useLocalStorageString = (key, initialValue, syncAcrossTabs = false) => {
  return useLocalStorage(key, initialValue, {
    serialize: (value) => value,
    deserialize: (value) => value,
    syncAcrossTabs,
  });
};

/**
 * Custom hook for localStorage with boolean values
 * @param {string} key - The localStorage key
 * @param {boolean} initialValue - Initial value if key doesn't exist
 * @param {boolean} syncAcrossTabs - Whether to sync across tabs
 * @returns {Array} [value, setValue, removeValue, error]
 */
export const useLocalStorageBoolean = (key, initialValue, syncAcrossTabs = false) => {
  return useLocalStorage(key, initialValue, {
    serialize: (value) => value.toString(),
    deserialize: (value) => value === 'true',
    syncAcrossTabs,
  });
};

/**
 * Custom hook for localStorage with number values
 * @param {string} key - The localStorage key
 * @param {number} initialValue - Initial value if key doesn't exist
 * @param {boolean} syncAcrossTabs - Whether to sync across tabs
 * @returns {Array} [value, setValue, removeValue, error]
 */
export const useLocalStorageNumber = (key, initialValue, syncAcrossTabs = false) => {
  return useLocalStorage(key, initialValue, {
    serialize: (value) => value.toString(),
    deserialize: (value) => parseFloat(value),
    syncAcrossTabs,
  });
};

/**
 * Custom hook for localStorage with array values
 * @param {string} key - The localStorage key
 * @param {Array} initialValue - Initial value if key doesn't exist
 * @param {boolean} syncAcrossTabs - Whether to sync across tabs
 * @returns {Array} [value, setValue, removeValue, error, addItem, removeItem, updateItem]
 */
export const useLocalStorageArray = (key, initialValue = [], syncAcrossTabs = false) => {
  const [value, setValue, removeValue, error] = useLocalStorageState(key, initialValue, syncAcrossTabs);

  const addItem = useCallback((item) => {
    setValue(prev => [...prev, item]);
  }, [setValue]);

  const removeItem = useCallback((index) => {
    setValue(prev => prev.filter((_, i) => i !== index));
  }, [setValue]);

  const updateItem = useCallback((index, newItem) => {
    setValue(prev => prev.map((item, i) => i === index ? newItem : item));
  }, [setValue]);

  return [value, setValue, removeValue, error, addItem, removeItem, updateItem];
};

/**
 * Custom hook for localStorage with object values
 * @param {string} key - The localStorage key
 * @param {Object} initialValue - Initial value if key doesn't exist
 * @param {boolean} syncAcrossTabs - Whether to sync across tabs
 * @returns {Array} [value, setValue, removeValue, error, updateProperty]
 */
export const useLocalStorageObject = (key, initialValue = {}, syncAcrossTabs = false) => {
  const [value, setValue, removeValue, error] = useLocalStorageState(key, initialValue, syncAcrossTabs);

  const updateProperty = useCallback((property, newValue) => {
    setValue(prev => ({ ...prev, [property]: newValue }));
  }, [setValue]);

  return [value, setValue, removeValue, error, updateProperty];
};
