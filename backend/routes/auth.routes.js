/**
 * @file auth.routes.js
 * @description Auth routes — signup, login, profile, password reset.
 *
 * Public routes  (no protect needed):
 *   POST /api/auth/signup
 *   POST /api/auth/login
 *   GET  /api/auth/verify-email
 *   POST /api/auth/forgot-password
 *   POST /api/auth/reset-password
 *
 * Protected routes (JWT required):
 *   GET  /api/auth/me
 *   POST /api/auth/resend-verification
 */

const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

const { register, login, getMe, verifyEmail, resendVerification, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// ─── Auth-Specific Rate Limiter ───────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts. Please wait 15 minutes.', code: 'RATE_LIMITED', data: null },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Validation Rules ─────────────────────────────────────────────────────────
const signupValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const forgotValidation = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Valid email required').normalizeEmail(),
];

const resetValidation = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().normalizeEmail(),
  body('otp').notEmpty().withMessage('OTP is required').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  body('newPassword').notEmpty().withMessage('New password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User registration, login, email verification and password reset
 */

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user
 *     description: >
 *       Creates a new user account with free plan (1 site limit).
 *       Sends a welcome email. Email verification link also sent.
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
 *                 minLength: 2
 *                 maxLength: 50
 *                 example: Sagar Tiwari
 *               email:
 *                 type: string
 *                 format: email
 *                 example: sagar@example.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: secret123
 *     responses:
 *       201:
 *         description: Account created — check email for verification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Account created! Please check your email to verify.
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         name: { type: string }
 *                         email: { type: string }
 *                         role: { type: string, example: user }
 *                         plan:
 *                           type: object
 *                           properties:
 *                             type: { type: string, example: free }
 *                             siteLimit: { type: integer, example: 1 }
 *                     token:
 *                       type: string
 *                       description: JWT token (valid 7 days)
 *       400:
 *         description: Validation error (missing fields)
 *       409:
 *         description: Email already registered
 *       429:
 *         description: Too many signup attempts — rate limited
 */
router.post('/signup', authLimiter, signupValidation, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and get JWT token
 *     description: >
 *       Returns a JWT token valid for 7 days.
 *       Use this token in the Authorization header as: `Bearer <token>`
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
 *                 format: email
 *                 example: demo@webmonitor.com
 *               password:
 *                 type: string
 *                 example: demo1234
 *     responses:
 *       200:
 *         description: Login successful — returns JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT — paste this in Authorize button above
 *                     user:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         name: { type: string }
 *                         email: { type: string }
 *                         role: { type: string, enum: [user, admin] }
 *                         plan:
 *                           type: object
 *                           properties:
 *                             type: { type: string, enum: [free, basic, pro, elite] }
 *                             status: { type: string }
 *                             siteLimit: { type: integer }
 *                             expiresAt: { type: string, format: date-time }
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid email or password
 *       429:
 *         description: Too many login attempts
 */
router.post('/login', authLimiter, loginValidation, login);

/**
 * @swagger
 * /api/auth/verify-email:
 *   get:
 *     summary: Verify email address via token link
 *     description: >
 *       Called when user clicks the verification link from their email.
 *       Token is included as a query parameter.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token (from welcome email)
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Token missing, invalid or expired
 */
router.get('/verify-email', verifyEmail);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset OTP
 *     description: >
 *       Sends a 6-digit OTP to the user's email (valid 15 minutes).
 *       OTP is ONLY sent via email — never via Telegram (security policy).
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: sagar@example.com
 *     responses:
 *       200:
 *         description: OTP sent to email (always returns 200 to prevent user enumeration)
 *       429:
 *         description: Too many requests
 */
router.post('/forgot-password', authLimiter, forgotValidation, forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     description: >
 *       Verifies the 6-digit OTP received via email and sets a new password.
 *       OTP expires after 15 minutes.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp, newPassword]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: sagar@example.com
 *               otp:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 6
 *                 example: "847293"
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: newSecret123
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid OTP, expired OTP, or validation error
 */
router.post('/reset-password', authLimiter, resetValidation, resetPassword);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get logged-in user's profile
 *     description: Returns full profile including plan details and notification preferences.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id: { type: string }
 *                         name: { type: string }
 *                         email: { type: string }
 *                         role: { type: string }
 *                         isVerified: { type: boolean }
 *                         plan:
 *                           type: object
 *                           properties:
 *                             type: { type: string, enum: [free, basic, pro, elite] }
 *                             status: { type: string, enum: [inactive, pending, active, expired] }
 *                             siteLimit: { type: integer }
 *                             expiresAt: { type: string, format: date-time }
 *                         notifications:
 *                           type: object
 *                           properties:
 *                             email: { type: boolean }
 *                             telegram: { type: boolean }
 *                         telegramChatId: { type: string }
 *       401:
 *         description: Unauthorized — invalid or missing token
 */
router.get('/me', protect, getMe);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend email verification link
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification email resent
 *       400:
 *         description: Email already verified
 *       401:
 *         description: Unauthorized
 */
router.post('/resend-verification', protect, resendVerification);

module.exports = router;
