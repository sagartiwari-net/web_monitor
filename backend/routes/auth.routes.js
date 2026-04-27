/**
 * @file auth.routes.js
 * @description Auth routes — signup, login, and profile.
 *
 * Public routes  (no protect needed):
 *   POST /api/auth/signup
 *   POST /api/auth/login
 *
 * Protected route (protect middleware applied):
 *   GET  /api/auth/me
 */

const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

const { register, login, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// ─── Auth-Specific Rate Limiter ───────────────────────────────────────────────
// Tighter limit specifically for login/signup to prevent brute-force attacks.
// This is IN ADDITION to the global rate limiter on all routes.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // Max 10 login/signup attempts per IP per 15 min
  message: {
    success: false,
    message: 'Too many attempts. Please wait 15 minutes and try again.',
    code: 'RATE_LIMITED',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Validation Rules ─────────────────────────────────────────────────────────
// express-validator checks run BEFORE the controller.
// Controller reads results via validationResult(req).

const signupValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Sagar Tiwari
 *               email:
 *                 type: string
 *                 example: sagar@example.com
 *               password:
 *                 type: string
 *                 example: mypassword123
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
router.post('/signup', authLimiter, signupValidation, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: sagar@example.com
 *               password:
 *                 type: string
 *                 example: mypassword123
 *     responses:
 *       200:
 *         description: Login successful — returns JWT token
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid email or password
 */
router.post('/login', authLimiter, loginValidation, login);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get currently logged-in user's profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile returned
 *       401:
 *         description: No token / invalid token
 */
router.get('/me', protect, getMe);

module.exports = router;
