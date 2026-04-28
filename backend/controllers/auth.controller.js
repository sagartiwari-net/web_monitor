/**
 * @file auth.controller.js
 * @description Handles user registration, login, profile, and password management.
 *
 * Routes handled:
 *   POST /api/auth/signup              → register()
 *   POST /api/auth/login               → login()
 *   GET  /api/auth/me                  → getMe()              [protected]
 *   GET  /api/auth/verify-email?token= → verifyEmail()        [public link]
 *   POST /api/auth/resend-verification → resendVerification() [protected]
 *   POST /api/auth/forgot-password     → forgotPassword()     [public]
 *   POST /api/auth/reset-password      → resetPassword()      [public]
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { User } = require('../models/User.model');
const { sendSuccess, sendError } = require('../utils/response.util');
const { notifyDirect, notify } = require('../services/notification.service');

// ─── Helper: Generate JWT ──────────────────────────────────────────────────────
const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// ─── Helper: Safe User Object ──────────────────────────────────────────────────
const safeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  plan: user.plan,
  isEmailVerified: user.isEmailVerified,
  notifications: user.notifications,
  telegramChatId: user.telegramChatId ? '***connected***' : null,
  createdAt: user.createdAt,
});

// ─── register ─────────────────────────────────────────────────────────────────
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendError(res, 400, errors.array()[0].msg, 'VALIDATION_ERROR');

  const { name, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) return sendError(res, 409, 'Email is already registered.', 'EMAIL_EXISTS');

    // Generate email verification token (32 bytes hex = 64 char string)
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
      name, email, password,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    });

    const token = generateToken(user);

    // Send welcome + verification email (non-blocking — never fails signup)
    const Settings = require('../models/Settings.model');
    const settings = await Settings.getSingleton();
    const verifyUrl = `${settings?.appUrl || 'http://localhost:8000'}/api/auth/verify-email?token=${verificationToken}`;
    notifyDirect(user.email, 'WELCOME', { name: user.name, verifyUrl }).catch(() => {});

    return sendSuccess(res, 201, 'Account created! Please check your email to verify your account.', {
      token,
      user: safeUser(user),
    });
  } catch (error) {
    if (error.code === 11000) return sendError(res, 409, 'Email is already registered.', 'EMAIL_EXISTS');
    console.error('❌ Register Error:', error);
    return sendError(res, 500, 'Registration failed. Please try again.', 'SERVER_ERROR');
  }
};

// ─── login ────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendError(res, 400, errors.array()[0].msg, 'VALIDATION_ERROR');

  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return sendError(res, 401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
    }
    return sendSuccess(res, 200, 'Login successful.', { token: generateToken(user), user: safeUser(user) });
  } catch (error) {
    console.error('❌ Login Error:', error);
    return sendError(res, 500, 'Login failed. Please try again.', 'SERVER_ERROR');
  }
};

// ─── getMe ────────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return sendError(res, 404, 'User not found.', 'USER_NOT_FOUND');
    return sendSuccess(res, 200, 'Profile fetched successfully.', { user: safeUser(user) });
  } catch (error) {
    console.error('❌ GetMe Error:', error);
    return sendError(res, 500, 'Could not fetch profile.', 'SERVER_ERROR');
  }
};

// ─── verifyEmail ──────────────────────────────────────────────────────────────
/**
 * GET /api/auth/verify-email?token=xxxxx
 * Called when user clicks the link in their welcome email.
 */
const verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) return sendError(res, 400, 'Verification token is required.', 'VALIDATION_ERROR');

  try {
    const user = await User.findOne({ emailVerificationToken: token })
      .select('+emailVerificationToken +emailVerificationExpires');

    if (!user) return sendError(res, 400, 'Invalid or already used verification link.', 'INVALID_TOKEN');
    if (user.isEmailVerified) return sendSuccess(res, 200, 'Email already verified.', {});
    if (user.emailVerificationExpires < new Date()) {
      return sendError(res, 400, 'Verification link expired. Request a new one.', 'TOKEN_EXPIRED');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();

    // Send confirmation email
    const Settings = require('../models/Settings.model');
    const settings = await Settings.getSingleton();
    notifyDirect(user.email, 'EMAIL_VERIFIED', {
      name: user.name,
      dashboardUrl: settings?.frontendUrl || 'http://localhost:3000',
    }).catch(() => {});

    return sendSuccess(res, 200, 'Email verified successfully! You can now log in.', { isEmailVerified: true });
  } catch (error) {
    console.error('❌ VerifyEmail Error:', error);
    return sendError(res, 500, 'Verification failed. Please try again.', 'SERVER_ERROR');
  }
};

// ─── resendVerification ───────────────────────────────────────────────────────
/**
 * POST /api/auth/resend-verification  [protected]
 */
const resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return sendError(res, 404, 'User not found.', 'USER_NOT_FOUND');
    if (user.isEmailVerified) return sendError(res, 400, 'Email is already verified.', 'ALREADY_VERIFIED');

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const Settings = require('../models/Settings.model');
    const settings = await Settings.getSingleton();
    const verifyUrl = `${settings?.appUrl || 'http://localhost:8000'}/api/auth/verify-email?token=${verificationToken}`;
    await notifyDirect(user.email, 'WELCOME', { name: user.name, verifyUrl });

    return sendSuccess(res, 200, 'Verification email sent! Check your inbox.', {});
  } catch (error) {
    console.error('❌ ResendVerification Error:', error);
    return sendError(res, 500, 'Could not send email. Please try again.', 'SERVER_ERROR');
  }
};

// ─── forgotPassword ───────────────────────────────────────────────────────────
/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Security: Always returns 200 to prevent user enumeration.
 */
const forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendError(res, 400, errors.array()[0].msg, 'VALIDATION_ERROR');

  const { email } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Prevent user enumeration — same response whether email exists or not
      return sendSuccess(res, 200, 'If this email is registered, an OTP has been sent.', {});
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.passwordResetOtp = otp;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    // Send OTP via all enabled channels
    await notify(user._id, 'FORGOT_PASSWORD', { name: user.name, otp });

    console.log(`🔐 Password reset OTP generated for ${email}`);
    return sendSuccess(res, 200, 'If this email is registered, an OTP has been sent.', {});
  } catch (error) {
    console.error('❌ ForgotPassword Error:', error);
    return sendError(res, 500, 'Could not send OTP. Please try again.', 'SERVER_ERROR');
  }
};

// ─── resetPassword ────────────────────────────────────────────────────────────
/**
 * POST /api/auth/reset-password
 * Body: { email, otp, newPassword }
 */
const resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return sendError(res, 400, errors.array()[0].msg, 'VALIDATION_ERROR');

  const { email, otp, newPassword } = req.body;
  try {
    const user = await User.findOne({ email: email.toLowerCase() })
      .select('+passwordResetOtp +passwordResetExpires');

    if (!user || !user.passwordResetOtp) {
      return sendError(res, 400, 'Invalid request. Please request a new OTP.', 'INVALID_OTP');
    }
    if (user.passwordResetExpires < new Date()) {
      return sendError(res, 400, 'OTP has expired. Please request a new one.', 'OTP_EXPIRED');
    }
    if (user.passwordResetOtp !== otp.toString()) {
      return sendError(res, 400, 'Incorrect OTP. Please check and try again.', 'INVALID_OTP');
    }

    user.password = newPassword; // pre-save hook hashes it
    user.passwordResetOtp = null;
    user.passwordResetExpires = null;
    await user.save();

    // Notify password changed
    notify(user._id, 'PASSWORD_CHANGED', { name: user.name }).catch(() => {});

    return sendSuccess(res, 200, 'Password reset successfully! You can now log in.', {});
  } catch (error) {
    console.error('❌ ResetPassword Error:', error);
    return sendError(res, 500, 'Could not reset password. Please try again.', 'SERVER_ERROR');
  }
};

module.exports = { register, login, getMe, verifyEmail, resendVerification, forgotPassword, resetPassword };
