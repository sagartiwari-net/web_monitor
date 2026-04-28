/**
 * @file admin.routes.js
 * @description Admin-only routes — double secured: protect + adminOnly.
 *
 * router.use(protect, adminOnly) — BOTH must pass, in order.
 * Any non-admin user hitting these routes gets 403 Forbidden.
 *
 *   GET  /api/admin/payments/pending     → listPendingPayments
 *   GET  /api/admin/payments             → listAllPayments
 *   POST /api/admin/payments/:id/approve → approvePayment
 *   POST /api/admin/payments/:id/reject  → rejectPayment
 *   GET  /api/admin/users                → listUsers
 *   POST /api/admin/coupons              → createCoupon
 *   GET  /api/admin/settings             → getSettings
 *   PUT  /api/admin/settings             → updateSettings
 */

const express = require('express');
const { body } = require('express-validator');
const {
  listPendingPayments, listAllPayments, approvePayment, rejectPayment,
  listUsers, createCoupon, getSettings, updateSettings,
} = require('../controllers/admin.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

const router = express.Router();

// ── Double Guard: protect (JWT) + adminOnly (role check) ──────────────────────
// Every route below requires BOTH to pass.
router.use(protect, adminOnly);

// ── Coupon Validation ─────────────────────────────────────────────────────────
const couponValidation = [
  body('code')
    .trim()
    .notEmpty().withMessage('Coupon code is required')
    .isLength({ min: 3, max: 20 }).withMessage('Code must be 3-20 characters')
    .matches(/^[A-Z0-9]+$/i).withMessage('Code must be alphanumeric only'),

  body('discountType')
    .notEmpty().withMessage('discountType is required')
    .isIn(['percentage', 'fixed']).withMessage('discountType must be: percentage or fixed'),

  body('discountValue')
    .notEmpty().withMessage('discountValue is required')
    .isNumeric().withMessage('discountValue must be a number')
    .custom((val, { req }) => {
      if (req.body.discountType === 'percentage' && (val < 1 || val > 100)) {
        throw new Error('Percentage discount must be 1-100');
      }
      if (val < 0) throw new Error('Discount value cannot be negative');
      return true;
    }),

  body('maxUses')
    .optional()
    .isInt({ min: 0 }).withMessage('Max uses must be 0 or more (0 = unlimited)'),

  body('validUntil')
    .optional()
    .isISO8601().withMessage('validUntil must be a valid date (ISO 8601)'),

  body('applicablePlans')
    .optional()
    .isArray().withMessage('applicablePlans must be an array'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/payments/pending:
 *   get:
 *     summary: "[Admin] List all pending payments awaiting approval"
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending payments
 *       403:
 *         description: Admin access required
 */
router.get('/payments/pending', listPendingPayments);

/**
 * @swagger
 * /api/admin/payments:
 *   get:
 *     summary: "[Admin] List all payments (all statuses)"
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated payment list
 */
router.get('/payments', listAllPayments);

/**
 * @swagger
 * /api/admin/payments/{id}/approve:
 *   post:
 *     summary: "[Admin] Approve a payment and activate user's plan"
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminNote:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment approved, plan activated
 *       400:
 *         description: Payment not in pending state
 *       404:
 *         description: Payment not found
 */
router.post('/payments/:id/approve', approvePayment);

/**
 * @swagger
 * /api/admin/payments/{id}/reject:
 *   post:
 *     summary: "[Admin] Reject a payment"
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               adminNote:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment rejected
 */
router.post('/payments/:id/reject', rejectPayment);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: "[Admin] List all users"
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Paginated user list
 */
router.get('/users', listUsers);

/**
 * @swagger
 * /api/admin/coupons:
 *   post:
 *     summary: "[Admin] Create a discount coupon"
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, discountPercent]
 *             properties:
 *               code:
 *                 type: string
 *                 example: SAVE20
 *               discountPercent:
 *                 type: integer
 *                 example: 20
 *               maxUses:
 *                 type: integer
 *                 example: 100
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *               applicablePlans:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Coupon created
 *       409:
 *         description: Coupon code already exists
 */
router.post('/coupons', couponValidation, createCoupon);

// ─── Settings ─────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     summary: "[Admin] Get all platform settings"
 *     description: >
 *       Returns the full DB-driven settings document.
 *       Sensitive fields (SMTP password, Telegram token, Gemini API key, PageSpeed key)
 *       are masked as `••••••••` in the response.
 *
 *       **DB-Driven — All configurable from this panel:**
 *       - App identity (name, URLs)
 *       - SMTP email credentials
 *       - Telegram bot token
 *       - Gemini AI API key + model
 *       - PageSpeed API key
 *       - UPI ID + payee name
 *       - Plan pricing (₹)
 *       - Plan site limits
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform settings (sensitive fields masked)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     settings:
 *                       type: object
 *                       properties:
 *                         appName: { type: string, example: WebMonitor }
 *                         appUrl: { type: string }
 *                         frontendUrl: { type: string }
 *                         smtpHost: { type: string, example: smtp.gmail.com }
 *                         smtpPort: { type: integer, example: 587 }
 *                         smtpUser: { type: string }
 *                         smtpPass: { type: string, example: "••••••••" }
 *                         fromName: { type: string }
 *                         fromEmail: { type: string }
 *                         emailEnabled: { type: boolean }
 *                         telegramBotUsername: { type: string, example: "@WebMonitors_bot" }
 *                         telegramBotToken: { type: string, example: "••••••••" }
 *                         telegramEnabled: { type: boolean }
 *                         geminiApiKey: { type: string, example: "••••••••" }
 *                         geminiModel: { type: string, example: gemini-2.5-flash }
 *                         pagespeedApiKey: { type: string, example: "••••••••" }
 *                         upiId: { type: string, example: 9555045411@ybl }
 *                         upiPayeeName: { type: string }
 *                         upiEnabled: { type: boolean }
 *                         pricing:
 *                           type: object
 *                           properties:
 *                             basic: { type: integer, example: 299 }
 *                             pro: { type: integer, example: 599 }
 *                             elite: { type: integer, example: 1499 }
 *                         planLimits:
 *                           type: object
 *                           properties:
 *                             free: { type: integer, example: 1 }
 *                             basic: { type: integer, example: 3 }
 *                             pro: { type: integer, example: 10 }
 *                             elite: { type: integer, example: 20 }
 *       403:
 *         description: Admin access required
 */
router.get('/settings', getSettings);

/**
 * @swagger
 * /api/admin/settings:
 *   put:
 *     summary: "[Admin] Update platform settings (any field)"
 *     description: >
 *       Partial update — only provided fields are changed. No server restart needed.
 *
 *       **Updatable fields:**
 *       - `appName`, `appUrl`, `frontendUrl`
 *       - `smtpHost`, `smtpPort`, `smtpSecure`, `smtpUser`, `smtpPass`, `fromName`, `fromEmail`, `emailEnabled`
 *       - `telegramBotToken`, `telegramBotUsername`, `telegramEnabled`
 *       - `geminiApiKey`, `geminiModel`
 *       - `pagespeedApiKey`
 *       - `upiId`, `upiPayeeName`, `upiEnabled`
 *       - `pricing` (object: basic, pro, elite)
 *       - `planLimits` (object: free, basic, pro, elite)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               smtpHost: { type: string, example: smtp.gmail.com }
 *               smtpPort: { type: integer, example: 587 }
 *               smtpUser: { type: string, example: you@gmail.com }
 *               smtpPass: { type: string, description: Gmail App Password }
 *               telegramBotToken: { type: string }
 *               telegramEnabled: { type: boolean }
 *               geminiApiKey: { type: string }
 *               geminiModel: { type: string, example: gemini-2.5-flash }
 *               pagespeedApiKey: { type: string }
 *               upiId: { type: string, example: 9555045411@ybl }
 *               pricing:
 *                 type: object
 *                 properties:
 *                   basic: { type: integer, example: 299 }
 *                   pro: { type: integer, example: 599 }
 *                   elite: { type: integer, example: 1499 }
 *               planLimits:
 *                 type: object
 *                 properties:
 *                   free: { type: integer, example: 1 }
 *                   basic: { type: integer, example: 3 }
 *                   pro: { type: integer, example: 10 }
 *                   elite: { type: integer, example: 20 }
 *     responses:
 *       200:
 *         description: Settings updated — sensitive fields masked in response
 *       400:
 *         description: No valid fields provided
 *       403:
 *         description: Admin access required
 */
router.put('/settings', updateSettings);

module.exports = router;
