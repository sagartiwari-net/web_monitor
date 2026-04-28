/**
 * @file admin.controller.js
 * @description Admin-only endpoints for payment approval, user management, and coupon creation.
 *
 * ALL functions require: protect + adminOnly middleware
 *
 * ── ENDPOINTS ────────────────────────────────────────────────────────────────
 *   GET  /api/admin/payments/pending       → listPendingPayments
 *   GET  /api/admin/payments               → listAllPayments
 *   POST /api/admin/payments/:id/approve   → approvePayment
 *   POST /api/admin/payments/:id/reject    → rejectPayment
 *   GET  /api/admin/users                  → listUsers
 *   POST /api/admin/coupons                → createCoupon
 *
 * ── APPROVE FLOW ─────────────────────────────────────────────────────────────
 *   1. Update Payment: status='approved', verifiedAt, verifiedBy
 *   2. Update User:
 *      - plan.type = payment.plan
 *      - plan.status = 'active'
 *      - plan.siteLimit = PLAN_SITE_LIMITS[plan]
 *      - plan.activatedAt = now
 *      - plan.expiresAt = now + 30 days
 */

const { validationResult } = require('express-validator');
const Payment = require('../models/Payment.model');
const { User, PLAN_SITE_LIMITS } = require('../models/User.model');
const Coupon = require('../models/Coupon.model');
const Settings = require('../models/Settings.model');
const { sendSuccess, sendError } = require('../utils/response.util');
const { notify } = require('../services/notification.service');

// ─── listPendingPayments ──────────────────────────────────────────────────────
/**
 * GET /api/admin/payments/pending
 * Lists all payments awaiting admin review (status: 'pending').
 */
const listPendingPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ status: 'pending' })
      .sort({ createdAt: 1 }) // oldest first — FIFO queue
      .populate('userId', 'name email plan') // include user details
      .select('-__v');

    return sendSuccess(res, 200, `${payments.length} pending payment(s) found.`, {
      count: payments.length,
      payments,
    });
  } catch (error) {
    console.error('❌ listPendingPayments Error:', error);
    return sendError(res, 500, 'Failed to fetch pending payments.', 'SERVER_ERROR');
  }
};

// ─── listAllPayments ──────────────────────────────────────────────────────────
/**
 * GET /api/admin/payments
 * Lists all payments (all statuses) with pagination.
 */
const listAllPayments = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status
      ? { status: req.query.status }
      : {};

    const [payments, total] = await Promise.all([
      Payment.find(statusFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email')
        .select('-__v'),
      Payment.countDocuments(statusFilter),
    ]);

    return sendSuccess(res, 200, 'Payments fetched.', {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      payments,
    });
  } catch (error) {
    console.error('❌ listAllPayments Error:', error);
    return sendError(res, 500, 'Failed to fetch payments.', 'SERVER_ERROR');
  }
};

// ─── approvePayment ───────────────────────────────────────────────────────────
/**
 * POST /api/admin/payments/:id/approve
 * Approves a pending payment and activates the user's plan.
 *
 * Plan activation:
 *   - plan.type = payment.plan
 *   - plan.status = 'active'
 *   - plan.siteLimit = PLAN_SITE_LIMITS[plan]
 *   - plan.activatedAt = now
 *   - plan.expiresAt = now + 30 days
 */
const approvePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return sendError(res, 404, 'Payment not found.', 'PAYMENT_NOT_FOUND');
    }

    if (payment.status !== 'pending') {
      return sendError(
        res,
        400,
        `Payment is already ${payment.status}. Only pending payments can be approved.`,
        'PAYMENT_NOT_PENDING'
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 days

    // 1. Update Payment record
    payment.status = 'approved';
    payment.verifiedAt = now;
    payment.verifiedBy = req.user._id; // admin's user ID
    if (req.body.adminNote) payment.adminNote = req.body.adminNote;
    await payment.save();

    // 2. Activate the user's plan
    const newPlan = payment.plan;
    const newSiteLimit = PLAN_SITE_LIMITS[newPlan] || 1;

    await User.findByIdAndUpdate(payment.userId, {
      'plan.type': newPlan,
      'plan.status': 'active',
      'plan.siteLimit': newSiteLimit,
      'plan.activatedAt': now,
      'plan.expiresAt': expiresAt,
    });

    // Notify user of plan activation
    notify(payment.userId, 'PLAN_ACTIVATED', {
      plan: newPlan, siteLimit: newSiteLimit, expiresAt,
    }).catch(() => {});

    console.log(`✅ Admin ${req.user._id} approved payment ${payment._id} → User ${payment.userId} now on ${newPlan} plan`);

    return sendSuccess(res, 200, `Payment approved. User's ${newPlan} plan is now active until ${expiresAt.toISOString()}.`, {
      payment: {
        _id: payment._id,
        status: payment.status,
        verifiedAt: payment.verifiedAt,
      },
      planActivated: {
        plan: newPlan,
        siteLimit: newSiteLimit,
        activatedAt: now,
        expiresAt,
      },
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return sendError(res, 400, 'Invalid payment ID.', 'INVALID_ID');
    }
    console.error('❌ approvePayment Error:', error);
    return sendError(res, 500, 'Failed to approve payment.', 'SERVER_ERROR');
  }
};

// ─── rejectPayment ────────────────────────────────────────────────────────────
/**
 * POST /api/admin/payments/:id/reject
 * Rejects a pending payment.
 * User's plan.status is reset to 'inactive'.
 */
const rejectPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return sendError(res, 404, 'Payment not found.', 'PAYMENT_NOT_FOUND');
    }

    if (payment.status !== 'pending') {
      return sendError(
        res,
        400,
        `Payment is already ${payment.status}.`,
        'PAYMENT_NOT_PENDING'
      );
    }

    const adminNote = req.body.adminNote || 'Payment rejected by admin.';

    payment.status = 'rejected';
    payment.verifiedAt = new Date();
    payment.verifiedBy = req.user._id;
    payment.adminNote = adminNote;
    await payment.save();

    // Reset user's plan.status back to inactive
    await User.findByIdAndUpdate(payment.userId, { 'plan.status': 'inactive' });

    // Decrement coupon usedCount if a coupon was applied (rollback)
    if (payment.couponCode) {
      await Coupon.findOneAndUpdate({ code: payment.couponCode }, { $inc: { usedCount: -1 } });
    }

    // Notify user of rejection
    notify(payment.userId, 'PAYMENT_REJECTED', {
      plan: payment.plan, adminNote,
    }).catch(() => {});

    console.log(`❌ Admin ${req.user._id} rejected payment ${payment._id}`);

    return sendSuccess(res, 200, 'Payment rejected.', {
      payment: {
        _id: payment._id,
        status: payment.status,
        adminNote: payment.adminNote,
      },
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return sendError(res, 400, 'Invalid payment ID.', 'INVALID_ID');
    }
    console.error('❌ rejectPayment Error:', error);
    return sendError(res, 500, 'Failed to reject payment.', 'SERVER_ERROR');
  }
};

// ─── listUsers ────────────────────────────────────────────────────────────────
/**
 * GET /api/admin/users
 * Lists all users (no password). For admin dashboard.
 */
const listUsers = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      User.countDocuments(),
    ]);

    return sendSuccess(res, 200, 'Users fetched.', {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
      users,
    });
  } catch (error) {
    console.error('❌ listUsers Error:', error);
    return sendError(res, 500, 'Failed to fetch users.', 'SERVER_ERROR');
  }
};

// ─── createCoupon ─────────────────────────────────────────────────────────────
/**
 * POST /api/admin/coupons
 * Creates a new discount coupon.
 */
const createCoupon = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  const { code, discountType, discountValue, maxUses, validUntil, applicablePlans, description } = req.body;

  try {
    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      discountType,                          // 'percentage' | 'fixed'
      discountValue,                         // % or ₹ amount
      maxUses: maxUses ?? null,              // null = unlimited
      validUntil: validUntil || null,        // null = no expiry
      applicablePlans: applicablePlans || ['basic', 'pro', 'elite'],
      description: description || '',
      createdBy: req.user._id,
    });

    return sendSuccess(res, 201, `Coupon "${coupon.code}" created successfully.`, { coupon });

  } catch (error) {
    if (error.code === 11000) {
      return sendError(res, 409, 'A coupon with this code already exists.', 'COUPON_EXISTS');
    }
    console.error('❌ createCoupon Error:', error);
    return sendError(res, 500, 'Failed to create coupon.', 'SERVER_ERROR');
  }
};

// ─── getSettings ──────────────────────────────────────────────────────────────
/**
 * GET /api/admin/settings
 * Returns all app settings. Sensitive keys masked (admin sees *** not actual value).
 */
const getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSingleton(false);
    if (!settings) return sendError(res, 404, 'Settings not found.', 'NOT_FOUND');

    // Mask every sensitive field — admin sees they exist but not the actual value
    const masked = {
      ...settings,
      smtpPass:        settings.smtpUser       ? '••••••••' : null,
      telegramBotToken: settings.telegramEnabled ? '••••••••' : null,
      geminiApiKey:    settings.geminiModel     ? '••••••••' : null,
      pagespeedApiKey: settings.upiId           ? '••••••••' : null,
    };

    return sendSuccess(res, 200, 'Settings fetched.', { settings: masked });
  } catch (error) {
    console.error('❌ getSettings Error:', error.message);
    return sendError(res, 500, 'Could not fetch settings.', 'SERVER_ERROR');
  }
};

// ─── updateSettings ───────────────────────────────────────────────────────────
/**
 * PUT /api/admin/settings
 * Updates any combination of settings. Admin-only.
 * All infrastructure keys are DB-driven: SMTP, Telegram, Gemini, PageSpeed, UPI, Pricing.
 */
const updateSettings = async (req, res) => {
  const ALLOWED = [
    // App identity
    'appName', 'appUrl', 'frontendUrl',
    // Email SMTP
    'smtpHost', 'smtpPort', 'smtpSecure', 'smtpUser', 'smtpPass',
    'fromName', 'fromEmail', 'emailEnabled',
    'telegramBotToken', 'telegramBotUsername', 'telegramEnabled',
    'whatsappEnabled',
  ];

  try {
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.keys(updates).length === 0) {
      return sendError(res, 400, 'No valid fields provided to update.', 'VALIDATION_ERROR');
    }

    const updated = await Settings.updateSettings(updates);
    console.log(`⚙️ Admin ${req.user._id} updated settings:`, Object.keys(updates).join(', '));

    return sendSuccess(res, 200, 'Settings updated successfully.', {
      settings: {
        ...updated,
        smtpPass: updated?.smtpUser ? '••••••••' : null,
        telegramBotToken: updated?.telegramEnabled ? '••••••••' : null,
      },
    });
  } catch (error) {
    console.error('❌ updateSettings Error:', error.message);
    return sendError(res, 500, 'Could not update settings.', 'SERVER_ERROR');
  }
};

module.exports = {
  listPendingPayments,
  listAllPayments,
  approvePayment,
  rejectPayment,
  listUsers,
  createCoupon,
  getSettings,
  updateSettings,
};
