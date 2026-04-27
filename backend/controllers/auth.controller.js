/**
 * @file auth.controller.js
 * @description Handles user registration, login, and profile retrieval.
 *
 * Routes handled:
 *   POST /api/auth/signup  → register()
 *   POST /api/auth/login   → login()
 *   GET  /api/auth/me      → getMe()  [protected]
 */

const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User, PLAN_SITE_LIMITS } = require('../models/User.model');
const { sendSuccess, sendError } = require('../utils/response.util');

// ─── Helper: Generate JWT ──────────────────────────────────────────────────────
/**
 * Signs a JWT token with the user's ID and role.
 * Validity: JWT_EXPIRES_IN from .env (default: 7d)
 * @param {object} user - Mongoose User document
 * @returns {string} - Signed JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ─── Helper: Safe User Object ──────────────────────────────────────────────────
/**
 * Returns a user object safe to send in API responses (no password).
 * @param {object} user - Mongoose User document
 * @returns {object}
 */
const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  plan: user.plan,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
});

// ─── register ─────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/signup
 * Register a new user account.
 * New users start with: plan.type = 'free', plan.status = 'inactive', siteLimit = 1
 */
const register = async (req, res) => {
  // 1. Validate request body (rules defined in auth.routes.js via express-validator)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  const { name, email, password } = req.body;

  try {
    // 2. Check if email is already registered
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return sendError(res, 409, 'Email is already registered.', 'EMAIL_EXISTS');
    }

    // 3. Create user — password is auto-hashed via pre-save hook in User.model.js
    const user = await User.create({
      name,
      email,
      password,
      // plan defaults are handled in the schema (free / inactive / siteLimit: 1)
    });

    // 4. Generate JWT token
    const token = generateToken(user);

    // 5. Return token + safe user data
    return sendSuccess(res, 201, 'Account created successfully.', {
      token,
      user: safeUser(user),
    });

  } catch (error) {
    // Mongoose duplicate key error (race condition on email uniqueness)
    if (error.code === 11000) {
      return sendError(res, 409, 'Email is already registered.', 'EMAIL_EXISTS');
    }
    console.error('❌ Register Error:', error);
    return sendError(res, 500, 'Registration failed. Please try again.', 'SERVER_ERROR');
  }
};

// ─── login ────────────────────────────────────────────────────────────────────
/**
 * POST /api/auth/login
 * Authenticate user and return JWT token.
 */
const login = async (req, res) => {
  // 1. Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  const { email, password } = req.body;

  try {
    // 2. Find user by email — explicitly select password (it's hidden by default)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    // 3. Check user exists AND password matches
    // We check both in one step to prevent timing attacks / user enumeration
    if (!user || !(await user.comparePassword(password))) {
      return sendError(res, 401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
    }

    // 4. Generate JWT token
    const token = generateToken(user);

    // 5. Return token + safe user data
    return sendSuccess(res, 200, 'Login successful.', {
      token,
      user: safeUser(user),
    });

  } catch (error) {
    console.error('❌ Login Error:', error);
    return sendError(res, 500, 'Login failed. Please try again.', 'SERVER_ERROR');
  }
};

// ─── getMe ────────────────────────────────────────────────────────────────────
/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 * Protected by: protect middleware
 *
 * Use case: Frontend calls this on app load to restore user session.
 */
const getMe = async (req, res) => {
  try {
    // req.user._id is set by protect middleware — fully trusted
    const user = await User.findById(req.user._id);

    if (!user) {
      return sendError(res, 404, 'User not found.', 'USER_NOT_FOUND');
    }

    return sendSuccess(res, 200, 'Profile fetched successfully.', {
      user: safeUser(user),
    });

  } catch (error) {
    console.error('❌ GetMe Error:', error);
    return sendError(res, 500, 'Could not fetch profile.', 'SERVER_ERROR');
  }
};

module.exports = { register, login, getMe };
