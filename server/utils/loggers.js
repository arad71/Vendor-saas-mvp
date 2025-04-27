/**
 * Simple logger utility for server-side logging
 */

// Environment check
const isDevelopment = process.env.NODE_ENV !== 'production';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Format a log message with timestamp
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} [data] - Additional data to log
 * @returns {string} Formatted log message
 */
const formatLogMessage = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logData = data ? ` ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level}] ${message}${logData}`;
};

/**
 * Log an info message
 * @param {string} message - Log message
 * @param {Object} [data] - Additional data to log
 */
const info = (message, data = null) => {
  const formattedMessage = formatLogMessage('INFO', message, data);
  console.log(`${colors.green}${formattedMessage}${colors.reset}`);
};

/**
 * Log a warning message
 * @param {string} message - Log message
 * @param {Object} [data] - Additional data to log
 */
const warn = (message, data = null) => {
  const formattedMessage = formatLogMessage('WARN', message, data);
  console.warn(`${colors.yellow}${formattedMessage}${colors.reset}`);
};

/**
 * Log an error message
 * @param {string} message - Log message
 * @param {Error|Object} [error] - Error object or additional data
 */
const error = (message, error = null) => {
  const formattedMessage = formatLogMessage('ERROR', message);
  console.error(`${colors.red}${formattedMessage}${colors.reset}`);
  
  if (error) {
    if (error instanceof Error) {
      console.error(`${colors.red}Stack: ${error.stack}${colors.reset}`);
    } else {
      console.error(`${colors.red}Error data: ${JSON.stringify(error)}${colors.reset}`);
    }
  }
};

/**
 * Log a debug message (only in development)
 * @param {string} message - Log message
 * @param {Object} [data] - Additional data to log
 */
const debug = (message, data = null) => {
  if (isDevelopment) {
    const formattedMessage = formatLogMessage('DEBUG', message, data);
    console.debug(`${colors.cyan}${formattedMessage}${colors.reset}`);
  }
};

/**
 * Log an HTTP request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const logRequest = (req, res, next) => {
  const start = Date.now();
  const method = req.method;
  const url = req.originalUrl || req.url;
  
  // Log request start
  debug(`${method} ${url}`, { 
    body: method !== 'GET' ? req.body : undefined,
    query: req.query,
    params: req.params,
    ip: req.ip,
    headers: req.headers
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    
    const logFn = status >= 500 ? error : status >= 400 ? warn : info;
    logFn(`${method} ${url} ${status} - ${duration}ms`);
  });
  
  next();
};

/**
 * Log application startup info
 * @param {number} port - Port number
 * @param {string} environment - Environment name
 */
const logStartup = (port, environment = process.env.NODE_ENV || 'development') => {
  console.log(`${colors.magenta}=======================================================`);
  console.log(`  Server started on port ${port} in ${environment} mode`);
  console.log(`  ${new Date().toISOString()}`);
  console.log(`=======================================================\n${colors.reset}`);
};

module.exports = {
  info,
  warn,
  error,
  debug,
  logRequest,
  logStartup
};
