/**
 * @file auth.middleware.js
 * @description Centralized authentication & authorization middleware.
 *
 * ── PHP ANALOGY ─────────────────────────────────────────────────────────────
 * In PHP:   require('auth.php');  → page is secured, done.
 * In Node:  router.get('/path', protect, controller) → route is secured, done.
 *
 * ── HOW TO USE ──────────────────────────────────────────────────────────────
 *
 * 1. Secure a SINGLE route:
 *    const { protect } = require('../middleware/auth.middleware');
 *    router.get('/my-monitors', protect, monitorController.getAll);
 *
 * 2. Secure ALL routes in a file (like PHP require at top of page):
 *    const { protect } = require('../middleware/auth.middleware');
 *    router.use(protect); // Everything below this line is protected
 *    router.get('/profile', userController.getProfile);
 *    router.put('/profile', userController.update);
 *
 * 3. Admin-only route (protect + adminOnly together):
 *    router.get('/admin/users', protect, adminOnly, adminController.listUsers);
 *
 * ── WHAT IT DOES ────────────────────────────────────────────────────────────
 * protect:
 *   - Reads the JWT from "Authorization: Bearer <token>" header
 *   - Verifies it with our JWT_SECRET
 *   - Attaches the decoded user as req.user = { _id, role }
 *   - Calls next() → route handler runs
 *   - On failure → 401 Unauthorized immediately, route handler never runs
 *
 * adminOnly:
 *   - ALWAYS use AFTER protect (protect sets req.user first)
 *   - Checks req.user.role === 'admin'
 *   - On failure → 403 Forbidden
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models/User.model');
const { sendError } = require('../utils/response.util');

// ─── protect ──────────────────────────────────────────────────────────────────
/**
 * Verifies JWT token and attaches user to req.user.
 * Use this on any route that requires login.
 *
 * @example
 * router.get('/monitors', protect, controller.getAll);
 */
const protect = async (req, res, next) => {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 401, 'Access denied. No token provided.', 'NO_TOKEN');
    }

    const token = authHeader.split(' ')[1]; // "Bearer <token>" → "<token>"

    // 2. Verify token signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return sendError(res, 401, 'Token has expired. Please login again.', 'TOKEN_EXPIRED');
      }
      return sendError(res, 401, 'Invalid token. Please login again.', 'INVALID_TOKEN');
    }

    // 3. Check if user still exists in DB
    // (handles case where user was deleted after token was issued)
    const user = await User.findById(decoded.id).select('_id role');
    if (!user) {
      return sendError(res, 401, 'User no longer exists.', 'USER_NOT_FOUND');
    }

    // 4. Attach user to request — available in all downstream middleware and controllers
    // We ONLY attach _id and role — never the full user document
    // Controllers that need more user data fetch it themselves
    req.user = {
      _id: user._id,
      role: user.role,
    };

    next(); // ✅ Token valid — proceed to the actual route handler

  } catch (error) {
    return sendError(res, 500, 'Authentication error.', 'AUTH_ERROR');
  }
};

// ─── adminOnly ────────────────────────────────────────────────────────────────
/**
 * Checks if the authenticated user has 'admin' role.
 * MUST be used AFTER protect middleware.
 *
 * @example
 * router.delete('/users/:id', protect, adminOnly, adminController.deleteUser);
 */
const adminOnly = (req, res, next) => {
  // req.user is guaranteed to exist here because protect ran first
  if (req.user.role !== 'admin') {
    return sendError(
      res,
      403,
      'Access denied. Admin privileges required.',
      'FORBIDDEN'
    );
  }
  next(); // ✅ User is admin — proceed
};

module.exports = { protect, adminOnly };
