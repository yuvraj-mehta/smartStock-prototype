/**
 * Error Handler Service
 *
 * This module provides centralized error handling utilities for the application.
 * It handles API errors, validation errors, and provides user-friendly error messages.
 *
 * @module errorHandler
 */

import { ERROR_MESSAGES } from '../constants';

/**
 * Error severity levels
 */
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Error types
 */
export const ERROR_TYPES = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  SERVER: 'server',
  CLIENT: 'client',
  UNKNOWN: 'unknown',
};

/**
 * Parse API error response and return user-friendly message
 * @param {Object} error - The error object from API
 * @returns {Object} Parsed error information
 */
export const parseApiError = (error) => {
  let message = ERROR_MESSAGES.SERVER_ERROR;
  let type = ERROR_TYPES.UNKNOWN;
  let severity = ERROR_SEVERITY.MEDIUM;
  let code = null;
  let details = null;

  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    code = status;

    switch (status) {
      case 400:
        message = data?.message || ERROR_MESSAGES.VALIDATION_ERROR;
        type = ERROR_TYPES.VALIDATION;
        severity = ERROR_SEVERITY.LOW;
        details = data?.errors || data?.details;
        break;

      case 401:
        message = data?.message || ERROR_MESSAGES.UNAUTHORIZED;
        type = ERROR_TYPES.AUTHENTICATION;
        severity = ERROR_SEVERITY.HIGH;
        break;

      case 403:
        message = data?.message || ERROR_MESSAGES.FORBIDDEN;
        type = ERROR_TYPES.AUTHORIZATION;
        severity = ERROR_SEVERITY.HIGH;
        break;

      case 404:
        message = data?.message || ERROR_MESSAGES.NOT_FOUND;
        type = ERROR_TYPES.CLIENT;
        severity = ERROR_SEVERITY.LOW;
        break;

      case 422:
        message = data?.message || ERROR_MESSAGES.VALIDATION_ERROR;
        type = ERROR_TYPES.VALIDATION;
        severity = ERROR_SEVERITY.LOW;
        details = data?.errors || data?.details;
        break;

      case 429:
        message = data?.message || 'Too many requests. Please try again later.';
        type = ERROR_TYPES.CLIENT;
        severity = ERROR_SEVERITY.MEDIUM;
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        message = data?.message || ERROR_MESSAGES.SERVER_ERROR;
        type = ERROR_TYPES.SERVER;
        severity = ERROR_SEVERITY.HIGH;
        break;

      default:
        message = data?.message || ERROR_MESSAGES.SERVER_ERROR;
        type = ERROR_TYPES.UNKNOWN;
        severity = ERROR_SEVERITY.MEDIUM;
    }
  } else if (error.request) {
    // Network error
    message = ERROR_MESSAGES.NETWORK_ERROR;
    type = ERROR_TYPES.NETWORK;
    severity = ERROR_SEVERITY.HIGH;
  } else {
    // Something else happened
    message = error.message || ERROR_MESSAGES.SERVER_ERROR;
    type = ERROR_TYPES.UNKNOWN;
    severity = ERROR_SEVERITY.MEDIUM;
  }

  return {
    message,
    type,
    severity,
    code,
    details,
    original: error,
  };
};

/**
 * Handle and log errors
 * @param {Object} error - The error object
 * @param {string} [context=''] - Additional context for the error
 * @param {boolean} [shouldLog=true] - Whether to log the error
 * @returns {Object} Parsed error information
 */
export const handleError = (error, context = '', shouldLog = true) => {
  const parsedError = parseApiError(error);

  if (shouldLog) {
    logError(parsedError, context);
  }

  return parsedError;
};

/**
 * Log error with context information
 * @param {Object} error - The parsed error object
 * @param {string} context - Additional context for the error
 */
export const logError = (error, context) => {
  const errorInfo = {
    message: error.message,
    type: error.type,
    severity: error.severity,
    code: error.code,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    userId: getCurrentUserId(),
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Application Error:', errorInfo);

    if (error.details) {
      console.error('Error Details:', error.details);
    }

    if (error.original) {
      console.error('Original Error:', error.original);
    }
  }

  // Send to error tracking service in production
  if (process.env.NODE_ENV === 'production') {
    sendErrorToService(errorInfo);
  }
};

/**
 * Get current user ID for error tracking
 * @returns {string|null} The current user ID or null
 */
const getCurrentUserId = () => {
  try {
    const userJson = localStorage.getItem('smartstock_user');
    const user = userJson ? JSON.parse(userJson) : null;
    return user?.id || null;
  } catch {
    return null;
  }
};

/**
 * Send error to external error tracking service
 * @param {Object} errorInfo - The error information
 */
const sendErrorToService = (errorInfo) => {
  // This would integrate with services like Sentry, LogRocket, etc.
  // For now, we'll just log to console
  console.error('Error sent to tracking service:', errorInfo);

  // Example integration with Sentry:
  // if (window.Sentry) {
  //   window.Sentry.captureException(errorInfo.original || new Error(errorInfo.message), {
  //     tags: {
  //       type: errorInfo.type,
  //       severity: errorInfo.severity,
  //       context: errorInfo.context,
  //     },
  //     extra: errorInfo,
  //   });
  // }
};

/**
 * Create a custom error object
 * @param {string} message - The error message
 * @param {string} type - The error type
 * @param {string} severity - The error severity
 * @param {Object} [details=null] - Additional error details
 * @returns {Object} Custom error object
 */
export const createError = (message, type, severity, details = null) => {
  return {
    message,
    type,
    severity,
    details,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Validation error handler
 * @param {Object} errors - Object with field names as keys and error messages as values
 * @returns {Object} Formatted validation error
 */
export const handleValidationErrors = (errors) => {
  const errorMessages = Object.entries(errors)
    .map(([field, message]) => `${field}: ${message}`)
    .join(', ');

  return createError(
    `Validation failed: ${errorMessages}`,
    ERROR_TYPES.VALIDATION,
    ERROR_SEVERITY.LOW,
    errors,
  );
};

/**
 * Network error handler
 * @param {Object} error - The network error
 * @returns {Object} Formatted network error
 */
export const handleNetworkError = (error) => {
  return createError(
    ERROR_MESSAGES.NETWORK_ERROR,
    ERROR_TYPES.NETWORK,
    ERROR_SEVERITY.HIGH,
    {
      code: error.code,
      message: error.message,
    },
  );
};

/**
 * Authentication error handler
 * @param {string} [message=ERROR_MESSAGES.UNAUTHORIZED] - Custom error message
 * @returns {Object} Formatted authentication error
 */
export const handleAuthError = (message = ERROR_MESSAGES.UNAUTHORIZED) => {
  return createError(
    message,
    ERROR_TYPES.AUTHENTICATION,
    ERROR_SEVERITY.HIGH,
  );
};

/**
 * Authorization error handler
 * @param {string} [message=ERROR_MESSAGES.FORBIDDEN] - Custom error message
 * @returns {Object} Formatted authorization error
 */
export const handleAuthzError = (message = ERROR_MESSAGES.FORBIDDEN) => {
  return createError(
    message,
    ERROR_TYPES.AUTHORIZATION,
    ERROR_SEVERITY.HIGH,
  );
};

/**
 * Server error handler
 * @param {string} [message=ERROR_MESSAGES.SERVER_ERROR] - Custom error message
 * @returns {Object} Formatted server error
 */
export const handleServerError = (message = ERROR_MESSAGES.SERVER_ERROR) => {
  return createError(
    message,
    ERROR_TYPES.SERVER,
    ERROR_SEVERITY.HIGH,
  );
};
