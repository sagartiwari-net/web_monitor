/**
 * @file Payment.model.js
 * @description Payment schema — tracks manual UPI payment submissions.
 *
 * Flow:
 * 1. User selects a plan → sees UPI QR code generated from our UPI ID
 * 2. User makes payment in their UPI app (GPay, PhonePe, etc.)
 * 3. User submits UTR/Transaction ID via frontend form → creates Payment doc with status: 'pending'
 * 4. Admin reviews the UTR in the admin panel → approves or rejects
 * 5. On approval: User's plan.type is updated + plan.status set to 'active'
 *
 * Security:
 * - `utrNumber` has a unique index — prevents same UTR being submitted twice (payment replay)
 * - Amount is validated server-side against known plan prices — client can't manipulate it
 * - Coupon discount is re-calculated server-side — never trust client-sent discounted amount
 *
 * Audit Trail:
 * - We store both originalAmount and final amount to track discount history
 * - verifiedAt + verifiedBy creates a full admin audit log
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // ── Ownership ─────────────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // ── Plan Being Purchased ──────────────────────────────────────────────────
    plan: {
      type: String,
      enum: ['basic', 'pro', 'elite'],
      required: [true, 'Plan is required'],
    },

    // ── Pricing ───────────────────────────────────────────────────────────────
    originalAmount: {
      type: Number,
      required: true,
      // The plan's base price BEFORE any coupon discount (in INR)
      // Sourced from env: PRICE_BASIC, PRICE_PRO, PRICE_ELITE
    },

    discountApplied: {
      type: Number,
      default: 0,
      // The INR amount discounted via coupon.
      // 0 if no coupon was used.
    },

    finalAmount: {
      type: Number,
      required: true,
      // The amount the user actually had to pay: originalAmount - discountApplied
      // This is what gets displayed on the UPI QR code.
    },

    // ── Coupon Reference ──────────────────────────────────────────────────────
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      default: null, // null if no coupon used
    },

    couponCode: {
      type: String,
      default: null,
      // DENORMALIZED: stored here for audit trail even if the Coupon doc is deleted later
    },

    // ── UPI Payment Details ───────────────────────────────────────────────────
    upiId: {
      type: String,
      required: true,
      // The UPI ID we generated the QR for (from env: UPI_ID).
      // Stored here for audit trail — in case we change our UPI ID later.
    },

    utrNumber: {
      type: String,
      required: [true, 'UTR/Transaction ID is required'],
      unique: true,     // DB-level uniqueness — prevents duplicate UTR submission
      trim: true,
      uppercase: true,  // UTRs are typically uppercase alphanumeric
      // UTR format example: "407219362345" (12 digits for IMPS/UPI)
    },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
      // pending  → UTR submitted by user, waiting for admin review
      // approved → Admin verified UTR, plan activated on User document
      // rejected → Admin rejected (wrong UTR, fraud attempt, etc.)
    },

    // ── Admin Action ──────────────────────────────────────────────────────────
    adminNote: {
      type: String,
      default: null,
      // Optional message from admin on rejection: "UTR not found in our bank records"
    },

    verifiedAt: {
      type: Date,
      default: null, // Set when admin approves or rejects
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      // The admin user who approved/rejected this payment
    },
  },
  {
    timestamps: true,
    // createdAt = when user submitted the UTR (payment submission time)
    // updatedAt = last modification (admin action time)
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// utrNumber unique index is auto-created by unique: true
// Compound: admin fetching all pending payments sorted by submission time
paymentSchema.index({ status: 1, createdAt: -1 });
// User's payment history
paymentSchema.index({ userId: 1, createdAt: -1 });

// ─── Export ───────────────────────────────────────────────────────────────────
module.exports = mongoose.model('Payment', paymentSchema);
