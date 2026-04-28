/**
 * @file User.model.js
 * @description User schema — the central entity of the platform.
 *
 * Responsibilities:
 * - Stores authentication credentials (email + hashed password)
 * - Tracks subscription plan and its status (inactive/pending/active)
 * - Enforces site limit per plan (Basic: 3, Pro: 5, Elite: 15)
 * - Differentiates admin vs regular user via `role`
 *
 * Security:
 * - Password is NEVER stored in plain text — hashed via bcryptjs pre-save hook
 * - The `comparePassword` instance method is used during login
 * - We NEVER return the password field in API responses (use .select('-password'))
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ─── Plan Configuration ────────────────────────────────────────────────────────
// Centralized plan limits — change here and it applies everywhere
const PLAN_SITE_LIMITS = {
  free: 1,    // Not a paid plan — just for newly registered users
  basic: 3,
  pro: 5,
  elite: 15,
};

// ─── Schema ───────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,            // DB-level uniqueness constraint
      lowercase: true,         // Always store as lowercase
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,           // NEVER returned in queries by default
    },

    // ── Role ──────────────────────────────────────────────────────────────────
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
      // 'admin' role is set manually in DB or via a protected seed script
    },

    // ── Subscription Plan ─────────────────────────────────────────────────────
    plan: {
      type: {
        type: String,
        enum: ['free', 'basic', 'pro', 'elite'],
        default: 'free',
      },

      status: {
        type: String,
        enum: ['inactive', 'pending', 'active', 'expired'],
        default: 'inactive',
        // inactive  → no payment submitted
        // pending   → user submitted UTR, waiting for admin approval
        // active    → admin approved, plan is live
        // expired   → plan duration ended
      },

      // Derived from plan.type — set automatically when admin activates
      siteLimit: {
        type: Number,
        default: PLAN_SITE_LIMITS.free,  // Default: 1 site for free plan
      },

      activatedAt: {
        type: Date,
        default: null,  // Set when admin approves the payment
      },

      expiresAt: {
        type: Date,
        default: null,  // Set at activation: activatedAt + 30 days
      },
    },

    // ── Account Status ────────────────────────────────────────────────────────
    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // ── Email Verification ────────────────────────────────────────────────────
    emailVerificationToken: {
      type: String,
      default: null,
      select: false, // Never returned in API responses
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
      select: false,
    },

    // ── Password Reset (OTP) ──────────────────────────────────────────────────
    passwordResetOtp: {
      type: String,
      default: null,
      select: false, // Never returned in API responses
    },
    passwordResetExpires: {
      type: Date,
      default: null,
      select: false,
    },

    // ── Telegram ──────────────────────────────────────────────────────────────
    telegramChatId: {
      type: String,
      default: null,
      // Set when user connects Telegram via /api/notifications/telegram/connect
    },

    // ── Notification Preferences ──────────────────────────────────────────────
    notifications: {
      email: {
        type: Boolean,
        default: true, // Email ON by default
      },
      telegram: {
        type: Boolean,
        default: false, // Telegram OFF until user connects
      },
      // WhatsApp (future — placeholder)
      whatsapp: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    // Automatically adds `createdAt` and `updatedAt` fields
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// email index is auto-created by `unique: true` above
// We also index role for admin queries
userSchema.index({ role: 1 });
userSchema.index({ 'plan.status': 1 }); // For admin: find all pending plans

// ─── Pre-save Hook: Hash Password + Sync siteLimit ──────────────────────────────
/**
 * Combined pre-save hook (Mongoose v9 async style).
 * 1. Hashes password only when modified
 * 2. Syncs siteLimit when plan.type changes
 */
userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12); // Cost factor 12
    this.password = await bcrypt.hash(this.password, salt);
  }
  if (this.isModified('plan.type')) {
    this.plan.siteLimit = PLAN_SITE_LIMITS[this.plan.type] || 1;
  }
});

// ─── Instance Methods ─────────────────────────────────────────────────────────
/**
 * Compares a plain-text password with the stored hash.
 * Used during login: user.comparePassword(req.body.password)
 * @param {string} candidatePassword - The plain-text password from request
 * @returns {Promise<boolean>} - true if match, false otherwise
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Export ───────────────────────────────────────────────────────────────────
const User = mongoose.model('User', userSchema);
module.exports = { User, PLAN_SITE_LIMITS };
