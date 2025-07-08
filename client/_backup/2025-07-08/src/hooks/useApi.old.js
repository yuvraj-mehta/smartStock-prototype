/**
 * Custom Hook for API Calls
 *
 * This hook provides a standardized way to make API calls with loading states,
 * error handling, and caching capabilities.
 *
 * @module useApi
 */

import { useState, useEffect, useCallback } from 'react';
import { handleError } from '../services/errorHandler';

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
 * @param {Function} apiFunction - The paginated API function
 * @param {Object} options - Hook options
 * @returns {Object} Paginated API state and methods
 */
export const usePaginatedApi = (apiFunction, options = {}) => {
  const {
    initialPage = 1,
    pageSize = 20,
    immediate = false,
    onSuccess = null,
    onError = null,
  } = options;

  const [page, setPage] = useState(initialPage);
  const [allData, setAllData] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const { data, loading, error, execute, reset } = useApi(
    apiFunction,
    {
      immediate: false,
      onSuccess: (result) => {
        const newData = result.data || result.items || [];
        const totalCount = result.total || result.totalCount || 0;
        const currentPage = result.page || page;

        if (currentPage === 1) {
          setAllData(newData);
        } else {
          setAllData(prev => [...prev, ...newData]);
        }

        setTotal(totalCount);
        setHasMore(newData.length === pageSize && allData.length + newData.length < totalCount);

        if (onSuccess) {
          onSuccess(result);
        }
      },
      onError,
    },
  );

  const loadPage = useCallback((pageNum) => {
    setPage(pageNum);
    return execute({ page: pageNum, limit: pageSize });
  }, [execute, pageSize]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      return loadPage(page + 1);
    }
  }, [hasMore, loading, loadPage, page]);

  const resetPagination = useCallback(() => {
    setPage(initialPage);
    setAllData([]);
    setHasMore(true);
    setTotal(0);
    reset();
  }, [initialPage, reset]);

  // Auto-execute on mount if immediate is true
  useEffect(() => {
    if (immediate) {
      loadPage(1);
    }
  }, [immediate, loadPage]);

  return {
    data: allData,
    loading,
    error,
    page,
    pageSize,
    total,
    hasMore,
    loadPage,
    loadMore,
    reset: resetPagination,
  };
};

/**
 * Custom hook for search API calls
 * @param {Function} searchFunction - The search API function
 * @param {Object} options - Hook options
 * @returns {Object} Search API state and methods
 */
export const useSearchApi = (searchFunction, options = {}) => {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    onSuccess = null,
    onError = null,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (searchQuery) => {
    if (!searchQuery || searchQuery.length < minQueryLength) {
      setResults([]);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await searchFunction(searchQuery);
      const searchResults = result.data || result.results || result;

      setResults(searchResults);

      if (onSuccess) {
        onSuccess(searchResults);
      }

      return searchResults;
    } catch (err) {
      const parsedError = handleError(err, `Search failed: ${searchQuery}`);
      setError(parsedError);
      setResults([]);

      if (onError) {
        onError(parsedError);
      }

      throw parsedError;
    } finally {
      setLoading(false);
    }
  }, [searchFunction, minQueryLength, onSuccess, onError]);

  const debouncedSearch = useCallback(
    debounce(search, debounceMs),
    [search, debounceMs],
  );

  const handleQueryChange = useCallback((newQuery) => {
    setQuery(newQuery);
    debouncedSearch(newQuery);
  }, [debouncedSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
  }, []);

  return {
    query,
    results,
    loading,
    error,
    search,
    handleQueryChange,
    clearSearch,
  };
};

/**
 * Debounce utility function
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};
