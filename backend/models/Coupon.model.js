/**
 * @file Coupon.model.js
 * @description Coupon schema — admin-created discount codes for plan purchases.
 *
 * Coupon Types:
 * - percentage: e.g., value=50 means 50% off
 * - fixed:      e.g., value=100 means ₹100 off
 *
 * Validation at Application Time (in payment.service.js):
 * 1. Is coupon active? (isActive === true)
 * 2. Is current date within validFrom → validUntil range?
 * 3. Has usedCount < maxUses?
 * 4. Does the plan being purchased appear in applicablePlans?
 *
 * Usage Tracking:
 * - `usedCount` is incremented atomically using findOneAndUpdate with $inc
 * - This prevents race conditions when two users apply the same coupon simultaneously
 */

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    // ── Coupon Identity ───────────────────────────────────────────────────────
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,    // Always stored as uppercase: "LAUNCH50" not "launch50"
      trim: true,
      // Example valid codes: LAUNCH50, FLAT100, HACKATHON2024
    },

    description: {
      type: String,
      default: '',
      // Optional admin note, e.g. "Hackathon launch offer - 50% off all plans"
    },

    // ── Discount Config ───────────────────────────────────────────────────────
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: [true, 'Discount type is required'],
    },

    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value cannot be negative'],
      // For percentage: 0–100 (validated in service layer)
      // For fixed: any positive number in INR
    },

    // ── Applicability ─────────────────────────────────────────────────────────
    applicablePlans: {
      type: [String],
      enum: ['basic', 'pro', 'elite'],
      default: ['basic', 'pro', 'elite'],
      // Which plans this coupon can be applied to.
      // Default: applies to all paid plans.
    },

    // ── Usage Limits ──────────────────────────────────────────────────────────
    maxUses: {
      type: Number,
      default: null,
      // null = unlimited uses
      // Set to a number to cap redemptions (e.g., first 100 users only)
    },

    usedCount: {
      type: Number,
      default: 0,
      // Incremented via $inc on every successful redemption.
      // Checked against maxUses before applying.
    },

    // ── Validity Period ───────────────────────────────────────────────────────
    validFrom: {
      type: Date,
      default: Date.now, // Active immediately by default
    },

    validUntil: {
      type: Date,
      default: null,
      // null = no expiry date
      // Set to a date to make the coupon time-limited
    },

    // ── Admin Control ─────────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
      // Admin can instantly deactivate a coupon without deleting it
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      // Reference to the admin user who created this coupon
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// code index is auto-created by unique: true
// We index isActive for fast filtering of active coupons
couponSchema.index({ isActive: 1 });
couponSchema.index({ validUntil: 1 }); // For finding expired coupons in admin panel

// ─── Export ───────────────────────────────────────────────────────────────────
module.exports = mongoose.model('Coupon', couponSchema);
