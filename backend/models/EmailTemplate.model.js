/**
 * @file EmailTemplate.model.js
 * @description DB-driven email templates — admin can edit via panel.
 *
 * ── HOW IT WORKS ─────────────────────────────────────────────────────────────
 * Templates are stored in MongoDB with {{placeholder}} syntax.
 * email.service.js fetches from DB first, falls back to hardcoded if not found.
 *
 * ── PLACEHOLDER SYNTAX ───────────────────────────────────────────────────────
 * Use {{variableName}} in subject and html.
 * These are replaced at send time with actual data.
 *
 * Available variables per event type:
 *   All templates: {{name}}, {{appName}}, {{frontendUrl}}
 *   WELCOME: {{verifyUrl}}
 *   FORGOT_PASSWORD: {{otp}}
 *   PLAN_ACTIVATED: {{plan}}, {{siteLimit}}, {{expiresAt}}
 *   PAYMENT_REJECTED: {{plan}}, {{adminNote}}
 *   PLAN_EXPIRING: {{plan}}, {{expiresAt}}, {{daysLeft}}
 *   PLAN_EXPIRED: {{plan}}
 *   SITE_DOWN: {{siteName}}, {{siteUrl}}, {{statusCode}}, {{responseTime}}, {{aiRootCause}}, {{checkedAt}}
 *   SITE_UP: {{siteName}}, {{siteUrl}}, {{responseTime}}, {{checkedAt}}
 *   PLAN_LIMIT: {{currentPlan}}, {{siteLimit}}
 *   PAYMENT_SUBMITTED: {{plan}}, {{finalAmount}}, {{utrNumber}}
 *
 * ── SINGLETON-LIKE BEHAVIOR ──────────────────────────────────────────────────
 * Each template is identified by its `key` (e.g., 'SITE_DOWN').
 * Only one document per key (unique index).
 * Admin can MODIFY but not DELETE templates.
 * isCustom: false = seeded default, isCustom: true = admin edited it.
 */

const mongoose = require('mongoose');

const emailTemplateSchema = new mongoose.Schema(
  {
    // Unique identifier — matches eventType in notify()
    key: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      // Examples: 'SITE_DOWN', 'FORGOT_PASSWORD', 'PLAN_ACTIVATED'
    },

    // Human-readable name for admin panel display
    name: {
      type: String,
      required: true,
      // Example: 'Site Down Alert'
    },

    // Category for grouping in admin panel
    category: {
      type: String,
      enum: ['auth', 'monitoring', 'billing', 'system'],
      default: 'system',
    },

    // Email subject — supports {{placeholders}}
    subject: {
      type: String,
      required: true,
    },

    // Full HTML email body — supports {{placeholders}}
    // Admin edits this from the panel
    html: {
      type: String,
      required: true,
    },

    // List of available placeholder variables (for admin reference UI)
    variables: {
      type: [String],
      default: [],
      // Example: ['name', 'otp', 'appName']
    },

    // Description shown in admin panel
    description: {
      type: String,
      default: '',
    },

    // false = default seeded template, true = admin has customized it
    isCustom: {
      type: Boolean,
      default: false,
    },

    // Whether this template is active (admin can disable a template)
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);

module.exports = EmailTemplate;
