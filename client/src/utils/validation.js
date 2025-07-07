/**
 * Validation Utility Functions
 *
 * This module provides utility functions for form validation and data validation.
 * All functions are pure and return validation results.
 *
 * @module validation
 */

import { VALIDATION } from '../constants';

/**
 * Validate an email address
 * @param {string} email - The email to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validateEmail = (email) => {
  if (!email) {
    return { isValid: false, message: 'Email is required' };
  }

  if (!VALIDATION.EMAIL_REGEX.test(email)) {
    return { isValid: false, message: 'Please enter a valid email address' };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate a password
 * @param {string} password - The password to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, message: 'Password is required' };
  }

  if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    return {
      isValid: false,
      message: `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters long`,
    };
  }

  // Check for at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one uppercase letter',
    };
  }

  // Check for at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one lowercase letter',
    };
  }

  // Check for at least one number
  if (!/\d/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one number',
    };
  }

  // Check for at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      isValid: false,
      message: 'Password must contain at least one special character',
    };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate a username
 * @param {string} username - The username to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validateUsername = (username) => {
  if (!username) {
    return { isValid: false, message: 'Username is required' };
  }

  if (username.length < VALIDATION.USERNAME_MIN_LENGTH) {
    return {
      isValid: false,
      message: `Username must be at least ${VALIDATION.USERNAME_MIN_LENGTH} characters long`,
    };
  }

  // Check for valid characters (alphanumeric and underscore)
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return {
      isValid: false,
      message: 'Username can only contain letters, numbers, and underscores',
    };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate a phone number
 * @param {string} phone - The phone number to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validatePhone = (phone) => {
  if (!phone) {
    return { isValid: false, message: 'Phone number is required' };
  }

  if (!VALIDATION.PHONE_REGEX.test(phone)) {
    return { isValid: false, message: 'Please enter a valid phone number' };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate a required field
 * @param {any} value - The value to validate
 * @param {string} fieldName - The name of the field
 * @returns {Object} Validation result with isValid and message
 */
export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { isValid: false, message: `${fieldName} is required` };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate a number range
 * @param {number} value - The value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} fieldName - The name of the field
 * @returns {Object} Validation result with isValid and message
 */
export const validateNumberRange = (value, min, max, fieldName) => {
  if (value === null || value === undefined) {
    return { isValid: false, message: `${fieldName} is required` };
  }

  const numValue = Number(value);

  if (isNaN(numValue)) {
    return { isValid: false, message: `${fieldName} must be a valid number` };
  }

  if (numValue < min || numValue > max) {
    return {
      isValid: false,
      message: `${fieldName} must be between ${min} and ${max}`,
    };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate a file upload
 * @param {File} file - The file to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result with isValid and message
 */
export const validateFile = (file, options = {}) => {
  if (!file) {
    return { isValid: false, message: 'File is required' };
  }

  const {
    maxSize = VALIDATION.MAX_FILE_SIZE,
    allowedTypes = VALIDATION.ALLOWED_IMAGE_TYPES,
    fieldName = 'File',
  } = options;

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = Math.floor(maxSize / (1024 * 1024));
    return {
      isValid: false,
      message: `${fieldName} size must be less than ${maxSizeMB}MB`,
    };
  }

  // Check file type
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      message: `${fieldName} must be one of: ${allowedTypes.join(', ')}`,
    };
  }

  return { isValid: true, message: '' };
};

/**
 * Validate a URL
 * @param {string} url - The URL to validate
 * @returns {Object} Validation result with isValid and message
 */
export const validateURL = (url) => {
  if (!url) {
    return { isValid: false, message: 'URL is required' };
  }

  try {
    new URL(url);
    return { isValid: true, message: '' };
  } catch {
    return { isValid: false, message: 'Please enter a valid URL' };
  }
};

/**
 * Validate multiple fields at once
 * @param {Object} validations - Object with field names as keys and validation functions as values
 * @returns {Object} Validation results with isValid and errors object
 */
export const validateForm = (validations) => {
  const errors = {};
  let isValid = true;

  Object.entries(validations).forEach(([fieldName, validationFn]) => {
    const result = validationFn();
    if (!result.isValid) {
      errors[fieldName] = result.message;
      isValid = false;
    }
  });

  return { isValid, errors };
};
