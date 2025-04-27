/**
 * Validate an email address
 * @param {string} email - Email address to validate
 * @returns {boolean} Whether the email is valid
 */
const isValidEmail = (email) => {
  if (!email) return false;
  
  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate a phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} Whether the phone number is valid
 */
const isValidPhone = (phone) => {
  if (!phone) return false;
  
  // Remove non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Check if it's a valid length (10-15 digits)
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
};

/**
 * Validate a URL
 * @param {string} url - URL to validate
 * @returns {boolean} Whether the URL is valid
 */
const isValidUrl = (url) => {
  if (!url) return false;
  
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate a date string
 * @param {string} dateString - Date string to validate
 * @returns {boolean} Whether the date is valid
 */
const isValidDate = (dateString) => {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

/**
 * Validate a password
 * @param {string} password - Password to validate
 * @param {Object} options - Validation options
 * @param {number} [options.minLength=8] - Minimum length
 * @param {boolean} [options.requireLowercase=true] - Require lowercase letter
 * @param {boolean} [options.requireUppercase=true] - Require uppercase letter
 * @param {boolean} [options.requireNumber=true] - Require number
 * @param {boolean} [options.requireSpecial=false] - Require special character
 * @returns {Object} Validation result
 */
const validatePassword = (password, options = {}) => {
  const {
    minLength = 8,
    requireLowercase = true,
    requireUppercase = true,
    requireNumber = true,
    requireSpecial = false
  } = options;
  
  const result = { valid: true, errors: [] };
  
  if (!password) {
    result.valid = false;
    result.errors.push('Password is required');
    return result;
  }
  
  if (password.length < minLength) {
    result.valid = false;
    result.errors.push(`Password must be at least ${minLength} characters long`);
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    result.valid = false;
    result.errors.push('Password must include at least one lowercase letter');
  }
  
  if (requireUppercase && !/[A-Z]/.test(password)) {
    result.valid = false;
    result.errors.push('Password must include at least one uppercase letter');
  }
  
  if (requireNumber && !/\d/.test(password)) {
    result.valid = false;
    result.errors.push('Password must include at least one number');
  }
  
  if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    result.valid = false;
    result.errors.push('Password must include at least one special character');
  }
  
  return result;
};

/**
 * Sanitize an object by removing specific fields
 * @param {Object} obj - Object to sanitize
 * @param {Array} fieldsToRemove - Fields to remove
 * @returns {Object} Sanitized object
 */
const sanitizeObject = (obj, fieldsToRemove = []) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = { ...obj };
  
  fieldsToRemove.forEach(field => {
    delete sanitized[field];
  });
  
  return sanitized;
};

/**
 * Validate required fields in an object
 * @param {Object} obj - Object to validate
 * @param {Array} requiredFields - Required field names
 * @returns {Object} Validation result
 */
const validateRequiredFields = (obj, requiredFields = []) => {
  const result = { valid: true, missingFields: [] };
  
  requiredFields.forEach(field => {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      result.valid = false;
      result.missingFields.push(field);
    }
  });
  
  return result;
};

/**
 * Validate object fields against specified types
 * @param {Object} obj - Object to validate
 * @param {Object} fieldTypes - Field types (field: type)
 * @returns {Object} Validation result
 */
const validateFieldTypes = (obj, fieldTypes = {}) => {
  const result = { valid: true, errors: [] };
  
  Object.entries(fieldTypes).forEach(([field, type]) => {
    if (obj[field] !== undefined && obj[field] !== null) {
      let isValidType = false;
      
      switch (type) {
        case 'string':
          isValidType = typeof obj[field] === 'string';
          break;
        case 'number':
          isValidType = typeof obj[field] === 'number' && !isNaN(obj[field]);
          break;
        case 'boolean':
          isValidType = typeof obj[field] === 'boolean';
          break;
        case 'object':
          isValidType = typeof obj[field] === 'object' && !Array.isArray(obj[field]);
          break;
        case 'array':
          isValidType = Array.isArray(obj[field]);
          break;
        case 'date':
          isValidType = isValidDate(obj[field]);
          break;
        case 'email':
          isValidType = isValidEmail(obj[field]);
          break;
        case 'url':
          isValidType = isValidUrl(obj[field]);
          break;
        case 'phone':
          isValidType = isValidPhone(obj[field]);
          break;
        default:
          isValidType = true; // Skip validation for unknown types
      }
      
      if (!isValidType) {
        result.valid = false;
        result.errors.push(`Field '${field}' should be of type '${type}'`);
      }
    }
  });
  
  return result;
};

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidUrl,
  isValidDate,
  validatePassword,
  sanitizeObject,
  validateRequiredFields,
  validateFieldTypes
};
