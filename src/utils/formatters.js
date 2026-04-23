/**
 * Utility functions for formatting data
 */

/**
 * GMT+8 timezone offset in milliseconds
 */
const GMT8_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * Convert a date to GMT+8 timezone
 * @param {string|Date} date - Date to convert
 * @returns {Date} Date object in GMT+8
 */
export const toGMT8 = (date) => {
  const d = new Date(date);
  // Get UTC time in milliseconds and add GMT+8 offset
  const utcTime = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utcTime + GMT8_OFFSET_MS);
};

/**
 * Get current time in GMT+8
 * @returns {Date} Current date in GMT+8
 */
export const nowGMT8 = () => {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcTime + GMT8_OFFSET_MS);
};

/**
 * Format a date to relative time (e.g., "2 hours ago")
 * Uses GMT+8 timezone for calculations
 * @param {string|Date} date - Date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date) => {
  const now = nowGMT8();
  const then = toGMT8(date);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }

  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
};

/**
 * Get color for severity level
 * @param {string} severity - Severity level
 * @returns {object} Color object with background and text colors
 */
export const getSeverityColor = (severity) => {
  const colors = {
    critical: { bg: '#fee2e2', text: '#991b1b', border: '#dc2626' },
    high: { bg: '#fed7aa', text: '#9a3412', border: '#ea580c' },
    medium: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
    low: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
    info: { bg: '#f3f4f6', text: '#374151', border: '#9ca3af' },
  };

  return colors[severity] || colors.info;
};

/**
 * Get color for category
 * @param {string} category - Category name
 * @returns {object} Color object with background and text colors
 */
export const getCategoryColor = (category) => {
  const colors = {
    cve: { bg: '#fce7f3', text: '#831843' },
    incident: { bg: '#fee2e2', text: '#991b1b' },
    ttp: { bg: '#e0e7ff', text: '#3730a3' },
    news: { bg: '#e0f2fe', text: '#075985' },
  };

  return colors[category] || { bg: '#f3f4f6', text: '#374151' };
};

/**
 * Format a date to GMT+8 localized string
 * @param {string|Date} date - Date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatGMT8Date = (date, options = {}) => {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    timeZone: 'Asia/Singapore',
    ...options
  });
};

/**
 * Format a date to GMT+8 date string (e.g., "Apr 14, 2026")
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatGMT8DateShort = (date) => {
  return formatGMT8Date(date, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

/**
 * Format a date to GMT+8 time string (e.g., "03:30 PM")
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted time string
 */
export const formatGMT8Time = (date) => {
  return formatGMT8Date(date, {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Format a date to full GMT+8 datetime string (e.g., "Apr 14, 2026 at 03:30 PM")
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted datetime string
 */
export const formatGMT8DateTime = (date) => {
  return `${formatGMT8DateShort(date)} at ${formatGMT8Time(date)}`;
};

/**
 * Truncate text to a specified number of lines
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum character length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 200) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
