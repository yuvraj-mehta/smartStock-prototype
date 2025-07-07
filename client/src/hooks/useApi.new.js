/**
 * Custom Hook for API Calls
 *
 * This hook provides a standardized way to make API calls with loading states,
 * error handling, and caching capabilities.
 *
 * @module useApi
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Simple debounce utility
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Simple error handler
 */
const handleError = (error, context = '') => {
  console.error(context, error);
  return {
    message: error.message || 'Something went wrong',
    code: error.code || 'UNKNOWN_ERROR',
    context,
  };
};

/**
 * Custom hook for making API calls
 * @param {Function} apiFunction - The API function to call
 * @param {Object} options - Hook options
 * @returns {Object} API state and methods
 */
export const useApi = (apiFunction, options = {}) => {
  const {
    immediate = false,
    onSuccess = null,
    onError = null,
    dependencies = [],
    debounceMs = 0,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiFunction(...args);

      setData(result.data || result);
      setLastFetch(new Date());

      if (onSuccess) {
        onSuccess(result.data || result);
      }

      return result.data || result;
    } catch (err) {
      const parsedError = handleError(err, `API call failed: ${apiFunction.name}`);
      setError(parsedError);

      if (onError) {
        onError(parsedError);
      }

      throw parsedError;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, onSuccess, onError]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
    setLastFetch(null);
  }, []);

  const refresh = useCallback(() => {
    if (lastFetch) {
      execute();
    }
  }, [execute, lastFetch]);

  // Debounced execute function
  const debouncedExecute = useCallback(
    debounceMs > 0 ? debounce(execute, debounceMs) : execute,
    [execute, debounceMs],
  );

  // Auto-execute on mount if immediate is true
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute, ...dependencies]);

  return {
    data,
    loading,
    error,
    execute: debouncedExecute,
    reset,
    refresh,
    lastFetch,
  };
};

/**
 * Custom hook for paginated API calls
 * @param {Function} apiFunction - The API function to call
 * @param {Object} options - Hook options
 * @returns {Object} API state and methods
 */
export const usePaginatedApi = (apiFunction, options = {}) => {
  const {
    pageSize = 10,
    initialPage = 1,
    immediate = false,
    onSuccess = null,
    onError = null,
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  const fetchPage = useCallback(async (page = currentPage, size = pageSize) => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiFunction({ page, limit: size });
      const responseData = result.data || result;

      setData(responseData.items || responseData.data || []);
      setCurrentPage(page);
      setTotalPages(responseData.totalPages || 0);
      setTotalItems(responseData.total || responseData.totalItems || 0);
      setHasNextPage(page < (responseData.totalPages || 0));
      setHasPrevPage(page > 1);

      if (onSuccess) {
        onSuccess(responseData);
      }

      return responseData;
    } catch (err) {
      const parsedError = handleError(err, 'Paginated API call failed');
      setError(parsedError);

      if (onError) {
        onError(parsedError);
      }

      throw parsedError;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, currentPage, pageSize, onSuccess, onError]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      fetchPage(currentPage + 1);
    }
  }, [hasNextPage, currentPage, fetchPage]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      fetchPage(currentPage - 1);
    }
  }, [hasPrevPage, currentPage, fetchPage]);

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      fetchPage(page);
    }
  }, [totalPages, fetchPage]);

  const refresh = useCallback(() => {
    fetchPage(currentPage);
  }, [fetchPage, currentPage]);

  const reset = useCallback(() => {
    setData([]);
    setError(null);
    setLoading(false);
    setCurrentPage(initialPage);
    setTotalPages(0);
    setTotalItems(0);
    setHasNextPage(false);
    setHasPrevPage(false);
  }, [initialPage]);

  // Auto-execute on mount if immediate is true
  useEffect(() => {
    if (immediate) {
      fetchPage(initialPage);
    }
  }, [immediate, fetchPage, initialPage]);

  return {
    data,
    loading,
    error,
    currentPage,
    totalPages,
    totalItems,
    hasNextPage,
    hasPrevPage,
    pageSize,
    fetchPage,
    nextPage,
    prevPage,
    goToPage,
    refresh,
    reset,
  };
};

/**
 * Custom hook for infinite scroll API calls
 * @param {Function} apiFunction - The API function to call
 * @param {Object} options - Hook options
 * @returns {Object} API state and methods
 */
export const useInfiniteApi = (apiFunction, options = {}) => {
  const {
    pageSize = 10,
    immediate = false,
    onSuccess = null,
    onError = null,
  } = options;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchInitial = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiFunction({ page: 1, limit: pageSize });
      const responseData = result.data || result;
      const items = responseData.items || responseData.data || [];

      setData(items);
      setCurrentPage(1);
      setHasMore(items.length === pageSize);

      if (onSuccess) {
        onSuccess(responseData);
      }

      return responseData;
    } catch (err) {
      const parsedError = handleError(err, 'Initial infinite API call failed');
      setError(parsedError);

      if (onError) {
        onError(parsedError);
      }

      throw parsedError;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, pageSize, onSuccess, onError]);

  const fetchMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      setError(null);

      const nextPage = currentPage + 1;
      const result = await apiFunction({ page: nextPage, limit: pageSize });
      const responseData = result.data || result;
      const newItems = responseData.items || responseData.data || [];

      setData(prevData => [...prevData, ...newItems]);
      setCurrentPage(nextPage);
      setHasMore(newItems.length === pageSize);

      if (onSuccess) {
        onSuccess(responseData);
      }

      return responseData;
    } catch (err) {
      const parsedError = handleError(err, 'Load more API call failed');
      setError(parsedError);

      if (onError) {
        onError(parsedError);
      }

      throw parsedError;
    } finally {
      setLoadingMore(false);
    }
  }, [apiFunction, currentPage, pageSize, hasMore, loadingMore, onSuccess, onError]);

  const reset = useCallback(() => {
    setData([]);
    setError(null);
    setLoading(false);
    setLoadingMore(false);
    setCurrentPage(1);
    setHasMore(true);
  }, []);

  const refresh = useCallback(() => {
    reset();
    fetchInitial();
  }, [reset, fetchInitial]);

  // Auto-execute on mount if immediate is true
  useEffect(() => {
    if (immediate) {
      fetchInitial();
    }
  }, [immediate, fetchInitial]);

  return {
    data,
    loading,
    loadingMore,
    error,
    hasMore,
    currentPage,
    fetchMore,
    refresh,
    reset,
  };
};
