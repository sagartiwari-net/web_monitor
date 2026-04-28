/**
 * @file payment.routes.js
 * @description Payment initiation and UTR submission routes.
 *
 * ALL routes protected by: protect middleware
 *
 *   POST /api/payment/initiate    → Get UPI details + pricing (Step 1)
 *   POST /api/payment/submit-utr  → Submit UTR after paying  (Step 3)
 *   GET  /api/payment/history     → User's payment records
 *   GET  /api/payment/status      → Current plan + latest payment status
 */

const express = require('express');
const { body } = require('express-validator');
const {
  initiatePayment,
  submitUtr,
  getPaymentHistory,
  getPaymentStatus,
} = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(protect);

// ─── Validation Rules ─────────────────────────────────────────────────────────
const initiateValidation = [
  body('plan')
    .trim()
    .notEmpty().withMessage('Plan is required')
    .isIn(['basic', 'pro', 'elite']).withMessage('Plan must be: basic, pro, or elite'),

  body('couponCode')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 }).withMessage('Coupon code must be 3-20 characters'),
];

const utrValidation = [
  body('plan')
    .trim()
    .notEmpty().withMessage('Plan is required')
    .isIn(['basic', 'pro', 'elite']).withMessage('Plan must be: basic, pro, or elite'),

  body('utrNumber')
    .trim()
    .notEmpty().withMessage('UTR number is required')
    .isLength({ min: 12, max: 22 }).withMessage('UTR number must be 12-22 characters'),

  body('couponCode')
    .optional()
    .trim(),

  body('paidAmount')
    .optional()
    .isNumeric().withMessage('Paid amount must be a number'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/payment/initiate:
 *   post:
 *     summary: Get UPI payment details for a plan (Step 1)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plan]
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [basic, pro, elite]
 *               couponCode:
 *                 type: string
 *                 example: SAVE20
 *     responses:
 *       200:
 *         description: UPI details + pricing returned
 *       400:
 *         description: Invalid plan or coupon
 */
router.post('/initiate', initiateValidation, initiatePayment);

/**
 * @swagger
 * /api/payment/submit-utr:
 *   post:
 *     summary: Submit UTR number after UPI payment (Step 3)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plan, utrNumber]
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [basic, pro, elite]
 *               utrNumber:
 *                 type: string
 *                 example: 123456789012
 *               couponCode:
 *                 type: string
 *               paidAmount:
 *                 type: number
 *     responses:
 *       201:
 *         description: Payment submitted — pending admin approval
 *       409:
 *         description: Duplicate UTR or already pending payment
 */
router.post('/submit-utr', utrValidation, submitUtr);

/**
 * @swagger
 * /api/payment/history:
 *   get:
 *     summary: Get all payment records for the logged-in user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history array
 */
router.get('/history', getPaymentHistory);

/**
 * @swagger
 * /api/payment/status:
 *   get:
 *     summary: Get current plan and latest payment status
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Plan info + latest payment
 */
router.get('/status', getPaymentStatus);

module.exports = router;
