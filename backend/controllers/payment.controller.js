/**
 * @file payment.controller.js
 * @description Handles payment initiation and UTR submission.
 *
 * Endpoints:
 *   POST /api/payment/initiate    → initiatePayment  (Step 1: get UPI details)
 *   POST /api/payment/submit-utr  → submitUtr         (Step 3: submit UTR after paying)
 *   GET  /api/payment/history     → getPaymentHistory (User's own payment records)
 *   GET  /api/payment/status      → getPaymentStatus  (Current plan + payment status)
 */

const { validationResult } = require('express-validator');
const Payment = require('../models/Payment.model');
const Coupon = require('../models/Coupon.model');
const { User } = require('../models/User.model');
const {
  validatePlan, validateCoupon, calculateAmount, generateUpiString,
} = require('../services/payment.service');
const { sendSuccess, sendError } = require('../utils/response.util');
const { notify } = require('../services/notification.service');

// ─── initiatePayment ──────────────────────────────────────────────────────────
/**
 * POST /api/payment/initiate
 * Step 1 of payment flow.
 *
 * - Validates plan name
 * - Validates coupon (if provided)
 * - Calculates final amount after discount
 * - Returns UPI details for the user to complete payment
 * - Does NOT create any DB record yet (user hasn't paid yet)
 */
const initiatePayment = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  const { plan, couponCode } = req.body;

  try {
    // 1. Validate plan
    const planCheck = validatePlan(plan);
    if (!planCheck.valid) {
      return sendError(res, 400, planCheck.error, 'INVALID_PLAN');
    }

    // 2. Validate coupon (if provided)
    const couponCheck = await validateCoupon(couponCode, plan);
    if (!couponCheck.valid) {
      return sendError(res, 400, couponCheck.error, 'INVALID_COUPON');
    }

    // 3. Calculate amounts
    const amounts = calculateAmount(planCheck.price, couponCheck.coupon);

    // 4. Generate UPI deep link
    const upiString = generateUpiString(amounts.finalAmount, plan, req.user._id.toString());

    return sendSuccess(res, 200, 'Payment details ready. Complete UPI payment and submit UTR.', {
      plan,
      pricing: {
        originalAmount: amounts.originalAmount,
        discountPercent: amounts.discountPercent,
        discountAmount: amounts.discountAmount,
        finalAmount: amounts.finalAmount,
        currency: 'INR',
      },
      upi: {
        id: process.env.UPI_ID,
        payeeName: process.env.UPI_PAYEE_NAME,
        upiString,     // Deep link — opens UPI apps on mobile
        qrNote: `Pay ₹${amounts.finalAmount} for WebMonitor ${plan} plan`,
      },
      coupon: couponCheck.coupon
        ? {
            code: couponCheck.coupon.code,
            discountPercent: couponCheck.coupon.discountPercent,
          }
        : null,
      nextStep: 'Pay via UPI, then call POST /api/payment/submit-utr with your UTR number.',
    });

  } catch (error) {
    console.error('❌ initiatePayment Error:', error);
    return sendError(res, 500, 'Payment initiation failed.', 'SERVER_ERROR');
  }
};

// ─── submitUtr ────────────────────────────────────────────────────────────────
/**
 * POST /api/payment/submit-utr
 * Step 3 of payment flow — user submits UTR after completing UPI payment.
 *
 * - Creates Payment document (status: 'pending')
 * - Updates user plan.status = 'pending' (admin will approve)
 * - Increments coupon.usedCount if coupon was used
 */
const submitUtr = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  const { plan, couponCode, utrNumber, paidAmount } = req.body;

  try {
    // 1. Check user doesn't already have a pending payment
    const existingPending = await Payment.findOne({
      userId: req.user._id,
      status: 'pending',
    });
    if (existingPending) {
      return sendError(
        res,
        409,
        'You already have a pending payment awaiting admin approval. Please wait.',
        'PAYMENT_ALREADY_PENDING'
      );
    }

    // 2. Re-validate plan
    const planCheck = validatePlan(plan);
    if (!planCheck.valid) {
      return sendError(res, 400, planCheck.error, 'INVALID_PLAN');
    }

    // 3. Re-validate coupon
    const couponCheck = await validateCoupon(couponCode, plan);
    if (!couponCheck.valid) {
      return sendError(res, 400, couponCheck.error, 'INVALID_COUPON');
    }

    // 4. Calculate expected amounts
    const amounts = calculateAmount(planCheck.price, couponCheck.coupon);

    // 5. Create Payment document
    let payment;
    try {
      payment = await Payment.create({
        userId: req.user._id,
        plan,
        couponCode: couponCheck.coupon?.code || null,
        couponId: couponCheck.coupon?._id || null,
        originalAmount: amounts.originalAmount,
        discountApplied: amounts.discountAmount,   // schema field = discountApplied
        finalAmount: amounts.finalAmount,
        upiId: process.env.UPI_ID,                 // required field
        utrNumber: utrNumber.trim().toUpperCase(),
        status: 'pending',
      });
    } catch (dbError) {
      // UTR unique constraint violation
      if (dbError.code === 11000) {
        return sendError(
          res,
          409,
          'This UTR number has already been submitted. Each payment has a unique UTR.',
          'DUPLICATE_UTR'
        );
      }
      throw dbError;
    }

    // 6. Update user plan.status = 'pending'
    await User.findByIdAndUpdate(req.user._id, {
      'plan.status': 'pending',
    });

    // 7. Increment coupon usedCount atomically (if coupon used)
    if (couponCheck.coupon) {
      await Coupon.findByIdAndUpdate(couponCheck.coupon._id, { $inc: { usedCount: 1 } });
    }

    // 8. Payment submitted confirmation via all enabled channels
    notify(req.user._id, 'PAYMENT_SUBMITTED', {
      plan,
      finalAmount: amounts.finalAmount,
      utrNumber: utrNumber.trim().toUpperCase(),
    }).catch(() => {});

    return sendSuccess(res, 201, 'Payment submitted successfully. Admin will verify and activate your plan within 24 hours.', {
      payment: {
        _id: payment._id,
        plan: payment.plan,
        finalAmount: payment.finalAmount,
        utrNumber: payment.utrNumber,
        status: payment.status,
        createdAt: payment.createdAt,
      },
    });

  } catch (error) {
    console.error('❌ submitUtr Error:', error);
    return sendError(res, 500, 'Failed to submit payment.', 'SERVER_ERROR');
  }
};

// ─── getPaymentHistory ────────────────────────────────────────────────────────
/**
 * GET /api/payment/history
 * Returns all payment records for the authenticated user.
 */
const getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('-__v');

    return sendSuccess(res, 200, 'Payment history fetched.', { payments });
  } catch (error) {
    console.error('❌ getPaymentHistory Error:', error);
    return sendError(res, 500, 'Failed to fetch payment history.', 'SERVER_ERROR');
  }
};

// ─── getPaymentStatus ─────────────────────────────────────────────────────────
/**
 * GET /api/payment/status
 * Returns the user's current plan and latest payment status.
 * Useful for frontend to show "pending approval" banners.
 */
const getPaymentStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('plan');
    const latestPayment = await Payment.findOne({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('plan status finalAmount utrNumber createdAt adminNote');

    return sendSuccess(res, 200, 'Status fetched.', {
      plan: user.plan,
      latestPayment: latestPayment || null,
    });
  } catch (error) {
    console.error('❌ getPaymentStatus Error:', error);
    return sendError(res, 500, 'Failed to fetch status.', 'SERVER_ERROR');
  }
};

module.exports = { initiatePayment, submitUtr, getPaymentHistory, getPaymentStatus };
