// error-handler.js

/**
 * Standardized API Error class and handler
 */
class APIError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

function globalErrorHandler(err) {
  const status = err.statusCode || 500;
  const response = {
    error: true,
    message: err.message || 'Internal Server Error',
    timestamp: err.timestamp || new Date().toISOString(),
  };

  if (err.details) {
    response.details = err.details;
  }

  // In a real app, we would integrate the logger.js here!
  console.error(`[ERROR ${status}] ${response.message}`);
  
  return response;
}

module.exports = {
  APIError,
  globalErrorHandler
};