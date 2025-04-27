/**
 * Format a date as an ISO string
 * @param {Date|string} date - Date object or string
 * @returns {string} ISO date string
 */
const formatISODate = (date) => {
  if (!date) return null;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString();
};

/**
 * Check if a date is in the future
 * @param {Date|string} date - Date object or string
 * @returns {boolean} Whether the date is in the future
 */
const isFutureDate = (date) => {
  if (!date) return false;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  return dateObj > now;
};

/**
 * Check if a date is in the past
 * @param {Date|string} date - Date object or string
 * @returns {boolean} Whether the date is in the past
 */
const isPastDate = (date) => {
  if (!date) return false;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  return dateObj < now;
};

/**
 * Get the start of a day
 * @param {Date|string} date - Date object or string
 * @returns {Date} Date object set to start of day
 */
const startOfDay = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
};

/**
 * Get the end of a day
 * @param {Date|string} date - Date object or string
 * @returns {Date} Date object set to end of day
 */
const endOfDay = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  dateObj.setHours(23, 59, 59, 999);
  return dateObj;
};

/**
 * Get the start of a month
 * @param {Date|string} date - Date object or string
 * @returns {Date} Date object set to start of month
 */
const startOfMonth = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  
  dateObj.setDate(1);
  dateObj.setHours(0, 0, 0, 0);
  return dateObj;
};

/**
 * Get the end of a month
 * @param {Date|string} date - Date object or string
 * @returns {Date} Date object set to end of month
 */
const endOfMonth = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  
  dateObj.setMonth(dateObj.getMonth() + 1);
  dateObj.setDate(0);
  dateObj.setHours(23, 59, 59, 999);
  return dateObj;
};

/**
 * Add days to a date
 * @param {Date|string} date - Date object or string
 * @param {number} days - Number of days to add
 * @returns {Date} New date object
 */
const addDays = (date, days) => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  
  dateObj.setDate(dateObj.getDate() + days);
  return dateObj;
};

/**
 * Format a date for display
 * @param {Date|string} date - Date object or string
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  const formatOptions = { ...defaultOptions, ...options };
  
  return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj);
};

/**
 * Calculate the difference between two dates in days
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} Difference in days
 */
const daysBetween = (date1, date2) => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  // Set time to midnight to get whole days
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  
  // Calculate difference in days
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

/**
 * Get date ranges for a period
 * @param {string} period - Period type ('week', 'month', 'year')
 * @returns {Object} Start and end dates
 */
const getDateRangeForPeriod = (period) => {
  const now = new Date();
  let startDate, endDate;
  
  switch (period) {
    case 'week':
      // Last 7 days
      startDate = addDays(now, -7);
      endDate = now;
      break;
    case 'month':
      // Last 30 days
      startDate = addDays(now, -30);
      endDate = now;
      break;
    case 'year':
      // Last 365 days
      startDate = addDays(now, -365);
      endDate = now;
      break;
    case 'current-month':
      // Current month
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case 'current-year':
      // Current year
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    default:
      // Default to last 30 days
      startDate = addDays(now, -30);
      endDate = now;
  }
  
  return {
    startDate: formatISODate(startDate),
    endDate: formatISODate(endDate)
  };
};

module.exports = {
  formatISODate,
  isFutureDate,
  isPastDate,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  addDays,
  formatDate,
  daysBetween,
  getDateRangeForPeriod
};
