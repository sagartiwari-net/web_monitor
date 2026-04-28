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

// Public
router.post('/signup', authLimiter, signupValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.get('/verify-email', verifyEmail);                          // ?token=xxx (link in email)
router.post('/forgot-password', authLimiter, forgotValidation, forgotPassword);
router.post('/reset-password', authLimiter, resetValidation, resetPassword);

// Protected
router.get('/me', protect, getMe);
router.post('/resend-verification', protect, resendVerification);

module.exports = router;

