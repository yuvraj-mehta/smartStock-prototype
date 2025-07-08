/**
 * Formatter Utility Functions
 *
 * This module provides utility functions for formatting data for display.
 * All functions are pure and handle common formatting operations.
 *
 * @module formatters
 */

/**
 * Format a number as currency
 * @param {number} amount - The amount to format
 * @param {string} [currency='USD'] - The currency code
 * @param {string} [locale='en-US'] - The locale for formatting
 * @returns {string} The formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '$0.00';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return `$${amount.toFixed(2)}`;
  }
};

/**
 * Format a number with thousands separators
 * @param {number} number - The number to format
 * @param {string} [locale='en-US'] - The locale for formatting
 * @returns {string} The formatted number string
 */
export const formatNumber = (number, locale = 'en-US') => {
  if (number === null || number === undefined || isNaN(number)) {
    return '0';
  }

  try {
    return new Intl.NumberFormat(locale).format(number);
  } catch (error) {
    console.error('Error formatting number:', error);
    return number.toString();
  }
};

/**
 * Format a percentage
 * @param {number} value - The value to format as percentage (0-1 or 0-100)
 * @param {boolean} [isDecimal=true] - Whether the value is in decimal format (0-1)
 * @param {number} [decimals=1] - Number of decimal places
 * @returns {string} The formatted percentage string
 */
export const formatPercentage = (value, isDecimal = true, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }

  const percentage = isDecimal ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
};

/**
 * Format a file size in bytes to human readable format
 * @param {number} bytes - The size in bytes
 * @param {number} [decimals=2] - Number of decimal places
 * @returns {string} The formatted file size string
 */
export const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  if (!bytes || isNaN(bytes)) return 'Unknown';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))  } ${  sizes[i]}`;
};

/**
 * Format a phone number
 * @param {string} phone - The phone number to format
 * @param {string} [format='(xxx) xxx-xxxx'] - The format pattern
 * @returns {string} The formatted phone number
 */
export const formatPhoneNumber = (phone, format = '(xxx) xxx-xxxx') => {
  if (!phone) return '';

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Check if it's a valid US phone number
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  }

  // Check if it's a valid US phone number with country code
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4');
  }

  // Return original if not a standard format
  return phone;
};

/**
 * Format a name (capitalize first letter of each word)
 * @param {string} name - The name to format
 * @returns {string} The formatted name
 */
export const formatName = (name) => {
  if (!name || typeof name !== 'string') return '';

  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format text to title case
 * @param {string} text - The text to format
 * @returns {string} The formatted text in title case
 */
export const formatTitleCase = (text) => {
  if (!text || typeof text !== 'string') return '';

  const smallWords = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'if', 'in', 'of', 'on', 'or', 'the', 'to', 'up'];

  return text
    .toLowerCase()
    .split(' ')
    .map((word, index) => {
      if (index === 0 || !smallWords.includes(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      return word;
    })
    .join(' ');
};

/**
 * Truncate text with ellipsis
 * @param {string} text - The text to truncate
 * @param {number} [maxLength=50] - Maximum length before truncation
 * @param {string} [suffix='...'] - Suffix to add when truncated
 * @returns {string} The truncated text
 */
export const truncateText = (text, maxLength = 50, suffix = '...') => {
  if (!text || typeof text !== 'string') return '';

  if (text.length <= maxLength) return text;

  return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Format a string to snake_case
 * @param {string} str - The string to format
 * @returns {string} The formatted string in snake_case
 */
export const formatSnakeCase = (str) => {
  if (!str || typeof str !== 'string') return '';

  return str
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join('_');
};

/**
 * Format a string to camelCase
 * @param {string} str - The string to format
 * @returns {string} The formatted string in camelCase
 */
export const formatCamelCase = (str) => {
  if (!str || typeof str !== 'string') return '';

  return str
    .replace(/\W+/g, ' ')
    .split(' ')
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
};

/**
 * Format a string to kebab-case
 * @param {string} str - The string to format
 * @returns {string} The formatted string in kebab-case
 */
export const formatKebabCase = (str) => {
  if (!str || typeof str !== 'string') return '';

  return str
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join('-');
};

/**
 * Format an address object to a single string
 * @param {Object} address - The address object
 * @returns {string} The formatted address string
 */
export const formatAddress = (address) => {
  if (!address || typeof address !== 'object') return '';

  const { street, city, state, zipCode, country } = address;
  const parts = [street, city, state, zipCode, country].filter(Boolean);

  return parts.join(', ');
};

/**
 * Format a duration in milliseconds to human readable format
 * @param {number} milliseconds - The duration in milliseconds
 * @returns {string} The formatted duration string
 */
export const formatDuration = (milliseconds) => {
  if (!milliseconds || isNaN(milliseconds)) return '0ms';

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else if (seconds > 0) {
    return `${seconds}s`;
  } else {
    return `${milliseconds}ms`;
  }
};
