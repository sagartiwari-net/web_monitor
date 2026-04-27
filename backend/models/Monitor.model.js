/**
 * @file Monitor.model.js
 * @description Monitor schema — represents a single website being tracked.
 *
 * Responsibilities:
 * - Stores the URL and metadata of a website a user wants to monitor
 * - Caches the LATEST uptime status (currentStatus, lastResponseTime, lastStatusCode)
 *   so the dashboard doesn't need to query the Logs collection for live status
 * - Stores the LATEST SEO/PageSpeed audit results as an embedded sub-document
 *   (avoids a separate collection query for the most common dashboard view)
 * - Caches the last AI root-cause explanation for quick display
 *
 * Tenant Isolation:
 * - Every query MUST include { userId: req.user.id }
 * - The userId index ensures fast, isolated lookups per user
 *
 * Design Note:
 * - `seoAudit` is embedded (not a separate collection) for hackathon simplicity.
 * - In production, create an `Audit` collection to store audit history over time.
 */

const mongoose = require('mongoose');

// ─── SEO Audit Sub-Schema ─────────────────────────────────────────────────────
// Embedded in Monitor to avoid extra queries for the dashboard's most recent audit
const seoAuditSchema = new mongoose.Schema(
  {
    // Core Web Vitals from Google PageSpeed Insights
    lcp: { type: Number, default: null },         // Largest Contentful Paint (ms) — target: < 2500ms
    cls: { type: Number, default: null },         // Cumulative Layout Shift — target: < 0.1
    inp: { type: Number, default: null },         // Interaction to Next Paint (ms) — target: < 200ms
    fcp: { type: Number, default: null },         // First Contentful Paint (ms)
    ttfb: { type: Number, default: null },        // Time to First Byte (ms)

    // Lighthouse category scores (0–100)
    perfScore: { type: Number, default: null },
    seoScore: { type: Number, default: null },
    accessScore: { type: Number, default: null }, // Accessibility
    bestPracticesScore: { type: Number, default: null },

    fetchedAt: { type: Date, default: null },     // When this audit was last run
  },
  { _id: false } // Don't create a separate _id for this embedded document
);

// ─── Monitor Schema ───────────────────────────────────────────────────────────
const monitorSchema = new mongoose.Schema(
  {
    // ── Ownership ─────────────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // Most queries filter by userId — this index is critical
    },

    // ── Website Info ──────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Monitor name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
      // User-friendly label e.g. "My Portfolio" or "Client's E-commerce"
    },

    url: {
      type: String,
      required: [true, 'URL is required'],
      trim: true,
      // We validate URL format in the controller/middleware layer (express-validator)
      // Basic check: must start with http:// or https://
      match: [/^https?:\/\/.+/, 'URL must start with http:// or https://'],
    },

    // ── Monitoring Config ─────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
      index: true,
      // The uptime cron job only pings monitors where isActive === true
      // Users can pause monitoring without deleting the monitor
    },

    checkInterval: {
      type: Number,
      default: 5,   // Minutes. Currently fixed at 5min by cron; field reserved for future per-site config
    },

    // ── Live Status Cache ─────────────────────────────────────────────────────
    // These fields are updated after EVERY ping by the uptime cron job.
    // They give instant dashboard status WITHOUT querying the Logs collection.
    currentStatus: {
      type: String,
      enum: ['UP', 'DOWN', 'UNKNOWN'],
      default: 'UNKNOWN',
      // UNKNOWN = monitor was just added, never pinged yet
    },

    lastCheckedAt: {
      type: Date,
      default: null, // null until first ping
    },

    lastResponseTime: {
      type: Number,
      default: null, // Milliseconds. null until first ping
    },

    lastStatusCode: {
      type: Number,
      default: null, // HTTP status code (200, 404, 502, etc.). null if network error
    },

    // ── AI Cache ──────────────────────────────────────────────────────────────
    lastAiAnalysis: {
      type: String,
      default: null,
      // Caches the most recent Gemini root-cause explanation for a DOWN event.
      // Displayed on dashboard without re-calling Gemini API.
      // Reset to null when site comes back UP.
    },

    // ── SEO Audit Cache ───────────────────────────────────────────────────────
    seoAudit: {
      type: seoAuditSchema,
      default: () => ({}), // Start with empty audit object
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// Compound index: find all active monitors for a user (used by cron job AND dashboard)
monitorSchema.index({ userId: 1, isActive: 1 });

// Compound index: find all monitors for a user sorted by creation (used by monitor list API)
monitorSchema.index({ userId: 1, createdAt: -1 });

// ─── Export ───────────────────────────────────────────────────────────────────
module.exports = mongoose.model('Monitor', monitorSchema);
