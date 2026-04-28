/**
 * @file payment.service.js
 * @description Business logic for coupon validation and UPI payment initiation.
 *
 * ── DB-DRIVEN PRICING & UPI ───────────────────────────────────────────────────
 * Plan prices and UPI details are read from Settings collection.
 * Admin can change prices from panel without code restart.
 * Falls back to .env values if DB not configured.
 *
 * ── PAYMENT FLOW ─────────────────────────────────────────────────────────────
 * Step 1: POST /api/payment/initiate  → validate coupon, calculate amount, return UPI
 * Step 2: User pays via UPI → gets UTR number
 * Step 3: POST /api/payment/submit-utr → create Payment doc (status: 'pending')
 * Step 4: Admin approves → update plan
 */

const Coupon = require('../models/Coupon.model');
const Settings = require('../models/Settings.model');

// Valid plan names — these never change
const VALID_PLANS = ['basic', 'pro', 'elite'];

/**
 * Gets plan prices from DB Settings. Falls back to .env / hardcoded defaults.
 * Called fresh on each payment initiation so admin price changes take effect immediately.
 */
const getPricing = async () => {
  const settings = await Settings.getSingleton(false);
  return {
    basic: settings?.pricing?.basic ?? parseInt(process.env.PRICE_BASIC) ?? 299,
    pro:   settings?.pricing?.pro   ?? parseInt(process.env.PRICE_PRO)   ?? 599,
    elite: settings?.pricing?.elite ?? parseInt(process.env.PRICE_ELITE) ?? 1499,
  };
};

/**
 * Gets UPI details from DB Settings. Falls back to .env defaults.
 */
const getUpiDetails = async () => {
  const settings = await Settings.getSingleton(false);
  return {
    upiId:      settings?.upiId      || process.env.UPI_ID       || '',
    payeeName:  settings?.upiPayeeName || process.env.UPI_PAYEE_NAME || 'WebMonitor',
    upiEnabled: settings?.upiEnabled !== false,
  };
};

/**
 * Validates a plan name.
 * @param {string} plan
 * @param {object} prices - From getPricing()
 * @returns {{ valid: boolean, price?: number, error?: string }}
 */
const validatePlan = (plan, prices) => {
  if (!VALID_PLANS.includes(plan)) {
    return { valid: false, error: `Invalid plan. Choose from: ${VALID_PLANS.join(', ')}` };
  }
  return { valid: true, price: prices[plan] };
};

/**
 * Validates a coupon code and checks eligibility for a given plan.
 * Does NOT increment usedCount yet — that happens on UTR submission.
 *
 * @param {string} code - Coupon code (case-insensitive)
 * @param {string} plan - Plan being purchased
 */
const validateCoupon = async (code, plan) => {
  if (!code) return { valid: true, coupon: null };

  const upperCode = code.toUpperCase().trim();
  const coupon = await Coupon.findOne({ code: upperCode });

  if (!coupon) return { valid: false, error: 'Coupon code not found.' };
  if (!coupon.isActive) return { valid: false, error: 'This coupon is no longer active.' };

  if (coupon.validUntil && new Date() > coupon.validUntil) {
    return { valid: false, error: 'This coupon has expired.' };
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, error: 'This coupon has reached its usage limit.' };
  }

  if (coupon.applicablePlans.length > 0 && !coupon.applicablePlans.includes(plan)) {
    return {
      valid: false,
      error: 'This coupon is only valid for: ' + coupon.applicablePlans.join(', ') + ' plan(s).',
    };
  }

  return { valid: true, coupon };
};

/**
 * Calculates the final payment amount after coupon discount.
 */
const calculateAmount = (originalAmount, coupon) => {
  let discountPercent = 0;
  let discountAmount = 0;

  if (coupon) {
    if (coupon.discountType === 'percentage') {
      discountPercent = coupon.discountValue;
      discountAmount = Math.round((originalAmount * discountPercent) / 100);
    } else if (coupon.discountType === 'fixed') {
      discountAmount = Math.min(coupon.discountValue, originalAmount);
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
 * Generates a UPI payment deep link.
 * UPI details read from DB Settings.
 *
 * @param {number} amount - Final amount to pay
 * @param {string} plan - Plan name
 * @param {string} userId - User ID (for reference)
 */
const generateUpiString = async (amount, plan, userId) => {
  const upi = await getUpiDetails();
  const note = `WebMonitor ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan - ${userId}`;
  const params = new URLSearchParams({
    pa: upi.upiId,
    pn: upi.payeeName,
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
  generateUpiString, // now async — returns Promise<string>
  getPricing,
  getUpiDetails,
  VALID_PLANS,
};
