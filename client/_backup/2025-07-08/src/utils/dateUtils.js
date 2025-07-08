/**
 * Date Utility Functions
 *
 * This module provides utility functions for date manipulation and formatting.
 * All functions are pure and handle common date operations.
 *
 * @module dateUtils
 */

/**
 * Format a date to a readable string
 * @param {Date|string} date - The date to format
 * @param {string} [format='default'] - The format type ('default', 'short', 'long', 'time')
 * @returns {string} The formatted date string
 */
export const formatDate = (date, format = 'default') => {
  if (!date) return '';

  const dateObj = new Date(date);

  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const options = {
    default: {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
    short: {
      month: 'short',
      day: 'numeric',
    },
    long: {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
    time: {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    },
  };

  return new Intl.DateTimeFormat('en-US', options[format]).format(dateObj);
};

/**
 * Get relative time (e.g., "2 hours ago", "in 3 days")
 * @param {Date|string} date - The date to compare
 * @returns {string} The relative time string
 */
export const getRelativeTime = (date) => {
  if (!date) return '';

  const dateObj = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now - dateObj) / 1000);

  if (Math.abs(diffInSeconds) < 60) {
    return 'just now';
  }

  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
  ];

  for (const interval of intervals) {
    const intervalCount = Math.floor(Math.abs(diffInSeconds) / interval.seconds);
    if (intervalCount >= 1) {
      const suffix = intervalCount === 1 ? '' : 's';
      const prefix = diffInSeconds < 0 ? 'in ' : '';
      const postfix = diffInSeconds < 0 ? '' : ' ago';
      return `${prefix}${intervalCount} ${interval.label}${suffix}${postfix}`;
    }
  }

  return 'just now';
};

/**
 * Check if a date is today
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if the date is today
 */
export const isToday = (date) => {
  if (!date) return false;

  const dateObj = new Date(date);
  const today = new Date();

  return dateObj.toDateString() === today.toDateString();
};

/**
 * Check if a date is in the past
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if the date is in the past
 */
export const isPast = (date) => {
  if (!date) return false;

  const dateObj = new Date(date);
  const now = new Date();

  return dateObj < now;
};

/**
 * Check if a date is in the future
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if the date is in the future
 */
export const isFuture = (date) => {
  if (!date) return false;

  const dateObj = new Date(date);
  const now = new Date();

  return dateObj > now;
};

/**
 * Get the start of day for a given date
 * @param {Date|string} date - The date
 * @returns {Date} The start of the day
 */
export const startOfDay = (date) => {
  const dateObj = new Date(date);
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
};

/**
 * Get the end of day for a given date
 * @param {Date|string} date - The date
 * @returns {Date} The end of the day
 */
export const endOfDay = (date) => {
  const dateObj = new Date(date);
  dateObj.setHours(23, 59, 59, 999);
  return dateObj;
};

/**
 * Add days to a date
 * @param {Date|string} date - The base date
 * @param {number} days - Number of days to add (can be negative)
 * @returns {Date} The new date
 */
export const addDays = (date, days) => {
  const dateObj = new Date(date);
  dateObj.setDate(dateObj.getDate() + days);
  return dateObj;
};

/**
 * Get the difference between two dates in days
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} The difference in days
 */
export const getDaysDifference = (date1, date2) => {
  const firstDate = new Date(date1);
  const secondDate = new Date(date2);

  const diffInMs = firstDate.getTime() - secondDate.getTime();
  return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
};

/**
 * Check if a date is valid
 * @param {Date|string} date - The date to validate
 * @returns {boolean} True if the date is valid
 */
export const isValidDate = (date) => {
  if (!date) return false;

  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
};
