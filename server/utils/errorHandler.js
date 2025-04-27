/**
 * Handle Firestore errors
 * @param {Error} error - Error object
 * @param {Object} res - Express response object
 * @param {string} defaultMessage - Default error message
 */
const handleFirestoreError = (error, res, defaultMessage = 'An error occurred') => {
  console.error(error);
  
  // Check if this is a Firestore error with a code
  if (error.code) {
    switch (error.code) {
      case 'permission-denied':
        return res.status(403).json({ 
          error: 'You do not have permission to perform this action' 
        });
      case 'not-found':
        return res.status(404).json({ 
          error: 'The requested resource was not found' 
        });
      case 'already-exists':
        return res.status(409).json({ 
          error: 'The resource already exists' 
        });
      case 'resource-exhausted':
        return res.status(429).json({ 
          error: 'Too many requests, please try again later' 
        });
      case 'invalid-argument':
        return res.status(400).json({ 
          error: 'Invalid data provided' 
        });
      case 'unavailable':
        return res.status(503).json({ 
          error: 'Service temporarily unavailable' 
        });
      default:
        return res.status(500).json({ 
          error: defaultMessage,
          code: error.code
        });
    }
  }
  
  // Handle validation errors
  if (error.message && (
    error.message.includes('validation') || 
    error.message.includes('required') ||
    error.message.includes('invalid')
  )) {
    return res.status(400).json({ error: error.message });
  }
  
  // Handle authentication errors
  if (error.message && (
    error.message.includes('auth') || 
    error.message.includes('token') ||
    error.message.includes('permission') ||
    error.message.includes('unauthorized')
  )) {
    return res.status(403).json({ error: error.message });
  }
  
  // Default error response
  return res.status(500).json({ error: defaultMessage });
};

/**
 * Handle Stripe errors
 * @param {Error} error - Stripe error object
 * @param {Object} res - Express response object
 */
const handleStripeError = (error, res) => {
  console.error('Stripe error:', error);
  
  let statusCode = 500;
  let errorMessage = 'An error occurred with payment processing';
  
  if (error.type) {
    switch (error.type) {
      case 'StripeCardError':
        // Card was declined
        statusCode = 400;
        errorMessage = error.message || 'Your card was declined';
        break;
      case 'StripeInvalidRequestError':
        // Invalid parameters
        statusCode = 400;
        errorMessage = error.message || 'Invalid payment request';
        break;
      case 'StripeAPIError':
        // API error
        statusCode = 500;
        errorMessage = 'Payment service unavailable, please try again later';
        break;
      case 'StripeConnectionError':
        // Connection error
        statusCode = 503;
        errorMessage = 'Could not connect to payment service, please try again later';
        break;
      case 'StripeAuthenticationError':
        // Authentication error
        statusCode = 401;
        errorMessage = 'Payment authentication failed';
        break;
      case 'StripeRateLimitError':
        // Rate limit error
        statusCode = 429;
        errorMessage = 'Too many payment requests, please try again later';
        break;
      default:
        statusCode = 500;
        errorMessage = error.message || 'Payment processing error';
    }
  }
  
  return res.status(statusCode).json({ error: errorMessage });
};

/**
 * Handle validation errors
 * @param {Object} req - Express request object
 * @param {Array} requiredFields - Required fields
 * @returns {string|null} Error message or null if valid
 */
const validateRequiredFields = (req, requiredFields) => {
  const missingFields = requiredFields.filter(field => !req.body[field]);
  
  if (missingFields.length > 0) {
    return `Missing required fields: ${missingFields.join(', ')}`;
  }
  
  return null;
};

module.exports = {
  handleFirestoreError,
  handleStripeError,
  validateRequiredFields
};
