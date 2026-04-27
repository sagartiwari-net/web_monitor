/**
 * @file response.util.js
 * @description Standardized API response helpers.
 *
 * WHY: Enforces a consistent JSON structure across ALL endpoints.
 * Frontend never needs to guess the response shape.
 *
 * Standard Response Shape:
 * {
 *   success: true | false,
 *   message: "Human readable message",
 *   data: { ... } | null,       // Present on success
 *   code: "ERROR_CODE" | null,  // Present on error (for frontend i18n / switch cases)
 * }
 *
 * Usage in controllers:
 *   return sendSuccess(res, 200, 'Login successful', { token, user });
 *   return sendError(res, 401, 'Invalid credentials', 'INVALID_CREDENTIALS');
 */

/**
 * Send a success response.
 * @param {import('express').Response} res
 * @param {number} statusCode - HTTP status code (200, 201, etc.)
 * @param {string} message - Human-readable success message
 * @param {object|null} data - Response payload
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = null) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    code: null,
  });
};

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {number} statusCode - HTTP status code (400, 401, 403, 404, 500, etc.)
 * @param {string} message - Human-readable error message
 * @param {string|null} code - Machine-readable error code for frontend switch cases
 */
const sendError = (res, statusCode = 500, message = 'Internal Server Error', code = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data: null,
    code,
  });
};

module.exports = { sendSuccess, sendError };
