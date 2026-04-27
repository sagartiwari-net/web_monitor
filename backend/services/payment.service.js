/**
 * @file payment.service.js
 * @description Business logic for coupon validation and UPI payment initiation.
 *
 * ── PAYMENT FLOW ─────────────────────────────────────────────────────────────
 * Step 1: User calls POST /api/payment/initiate
 *   → Validates coupon (if provided)
 *   → Calculates originalAmount, discount, finalAmount
 *   → Returns UPI ID + amounts (NO Payment doc created yet)
 *
 * Step 2: User pays via UPI app → gets UTR number
 *
 * Step 3: User calls POST /api/payment/submit-utr
 *   → Creates Payment doc (status: 'pending')
 *   → Updates user plan.status = 'pending'
 *   → Increments coupon.usedCount (if coupon used)
 *
 * Step 4: Admin approves via POST /api/admin/payments/:id/approve
 *   → Updates Payment status = 'approved'
 *   → Updates User: plan.type, plan.status='active', plan.expiresAt
 *
 * ── PLAN PRICING (from .env) ─────────────────────────────────────────────────
 *   PRICE_BASIC=299  → basic plan (3 sites)
 *   PRICE_PRO=599    → pro plan (5 sites)
 *   PRICE_ELITE=1499 → elite plan (15 sites)
 */

const Coupon = require('../models/Coupon.model');

// Plan prices loaded from .env
const PLAN_PRICES = {
  basic: parseInt(process.env.PRICE_BASIC) || 299,
  pro: parseInt(process.env.PRICE_PRO) || 599,
  elite: parseInt(process.env.PRICE_ELITE) || 1499,
};

// Valid plan names
const VALID_PLANS = ['basic', 'pro', 'elite'];

/**
 * Validates a plan name.
 * @param {string} plan
 * @returns {{ valid: boolean, price?: number, error?: string }}
 */
const validatePlan = (plan) => {
  if (!VALID_PLANS.includes(plan)) {
    return {
      valid: false,
      error: `Invalid plan. Choose from: ${VALID_PLANS.join(', ')}`,
    };
  }
  return { valid: true, price: PLAN_PRICES[plan] };
};

/**
 * Validates a coupon code and checks eligibility for a given plan.
 * Does NOT increment usedCount yet — that happens on UTR submission.
 *
 * @param {string} code - Coupon code (case-insensitive)
 * @param {string} plan - Plan being purchased
 * @returns {Promise<{ valid: boolean, coupon?: object, error?: string }>}
 */
const validateCoupon = async (code, plan) => {
  if (!code) return { valid: true, coupon: null };

  const upperCode = code.toUpperCase().trim();
  const coupon = await Coupon.findOne({ code: upperCode });

  if (!coupon) return { valid: false, error: 'Coupon code not found.' };
  if (!coupon.isActive) return { valid: false, error: 'This coupon is no longer active.' };

  // Check validity period
  if (coupon.validUntil && new Date() > coupon.validUntil) {
    return { valid: false, error: 'This coupon has expired.' };
  }

  // Check usage limit (null = unlimited)
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, error: 'This coupon has reached its usage limit.' };
  }

  // Check plan eligibility
  if (coupon.applicablePlans.length > 0 && !coupon.applicablePlans.includes(plan)) {
    return {
      valid: false,
      error: 'This coupon is only valid for: ' + coupon.applicablePlans.join(', ') + ' plan(s).',
    };
  }

  return { valid: true, coupon };
};

/**
 * Calculates the final payment amount after discount.
 *
 * @param {number} originalAmount - Full plan price in INR
 * @param {object|null} coupon - Coupon document (null if no coupon)
 * @returns {{ originalAmount, discountPercent, discountAmount, finalAmount }}
 */
const calculateAmount = (originalAmount, coupon) => {
  let discountPercent = 0;
  let discountAmount = 0;

  if (coupon) {
    if (coupon.discountType === 'percentage') {
      discountPercent = coupon.discountValue;
      discountAmount = Math.round((originalAmount * discountPercent) / 100);
    } else if (coupon.discountType === 'fixed') {
      discountAmount = Math.min(coupon.discountValue, originalAmount); // can't go negative
      discountPercent = Math.round((discountAmount / originalAmount) * 100);
    }
  }

  return {
    originalAmount,
    discountPercent,
    discountAmount,
    finalAmount: originalAmount - discountAmount,
  };
};

/**
 * Generates a UPI payment string (deep link format).
 * When opened on mobile, launches UPI apps (GPay, PhonePe, Paytm) directly.
 *
 * Format: upi://pay?pa=<id>&pn=<name>&am=<amount>&cu=INR&tn=<note>
 *
 * @param {number} amount - Final amount to pay
 * @param {string} plan - Plan name (for transaction note)
 * @param {string} userId - User ID (for reference)
 * @returns {string} UPI deep link
 */
const generateUpiString = (amount, plan, userId) => {
  const note = `WebMonitor ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - ${userId}`;
  const params = new URLSearchParams({
    pa: process.env.UPI_ID,
    pn: process.env.UPI_PAYEE_NAME,
    am: amount.toString(),
    cu: 'INR',
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
};

module.exports = {
  validatePlan,
  validateCoupon,
  calculateAmount,
  generateUpiString,
  PLAN_PRICES,
  VALID_PLANS,
};
