/**
 * @file Log.model.js
 * @description Log schema — stores every uptime ping result.
 *
 * This is the highest-volume collection in the system.
 * At 5-minute intervals with N monitors, we generate:
 *   - 288 logs/day PER monitor
 *   - 8,640 logs/month PER monitor
 *
 * Design Decisions for Performance:
 * 1. TTL Index: Auto-deletes logs older than 90 days — prevents unbounded growth
 * 2. Compound Index on (monitorId + checkedAt): Powers uptime history charts efficiently
 * 3. userId denormalized here: Allows dashboard-level queries across ALL monitors
 *    without joining through the Monitor collection
 * 4. aiRootCause only populated for DOWN events: Keeps document size small for UP logs
 *
 * Query Patterns This Schema Supports:
 * - "Show last 24h uptime chart for monitor X" → find({ monitorId, checkedAt: { $gte: yesterday } })
 * - "Show all DOWN events for user Y this week" → find({ userId, status: 'DOWN', checkedAt: { $gte: weekAgo } })
 * - "Calculate uptime % for a monitor" → countDocuments({ monitorId, status: 'UP' }) / total
 */

const mongoose = require('mongoose');

const logSchema = new mongoose.Schema(
  {
    // ── References ────────────────────────────────────────────────────────────
    monitorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Monitor',
      required: true,
      // Primary lookup key for monitor-specific uptime charts
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // DENORMALIZED: copied from Monitor at insert time.
      // Avoids a JOIN when fetching logs across all of a user's monitors.
    },

    // ── Ping Result ───────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['UP', 'DOWN'],
      required: true,
      // UP   = site responded with HTTP < 500 within timeout
      // DOWN = HTTP >= 500, network error, timeout, or DNS failure
    },

    statusCode: {
      type: Number,
      default: null,
      // The actual HTTP response code (200, 301, 404, 502, 503, etc.)
      // null when the ping failed at the network level (no HTTP response at all)
    },

    responseTime: {
      type: Number,
      required: true,
      // Milliseconds from request start to response received.
      // Even for DOWN events, we record how long we waited before failing.
    },

    // ── Error Info (only for DOWN events) ────────────────────────────────────
    error: {
      type: String,
      default: null,
      // Raw error message when ping fails at network level.
      // Examples: "ECONNREFUSED", "ETIMEDOUT", "getaddrinfo ENOTFOUND"
      // null for UP events or HTTP-level failures (we have statusCode for those)
    },

    // ── AI Analysis (only for DOWN events) ───────────────────────────────────
    aiRootCause: {
      type: String,
      default: null,
      // Gemini-generated 2-sentence explanation of why the site might be down.
      // Only populated for DOWN events.
      // null for UP events.
    },

    // ── Timestamp ─────────────────────────────────────────────────────────────
    checkedAt: {
      type: Date,
      default: Date.now,
      // When this ping was executed.
      // Used for: chart x-axis, TTL expiry, time-range filtering
    },
  },
  {
    // We do NOT use timestamps: true here because we have our own checkedAt field.
    // This avoids having both createdAt and checkedAt which would be redundant.
    timestamps: false,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// PRIMARY: Powers uptime history charts for a specific monitor
// Query: find({ monitorId: X, checkedAt: { $gte: Y } }).sort({ checkedAt: -1 })
logSchema.index({ monitorId: 1, checkedAt: -1 });

// SECONDARY: Powers dashboard overview across all of a user's monitors
// Query: find({ userId: X, checkedAt: { $gte: Y } })
logSchema.index({ userId: 1, checkedAt: -1 });

// FILTER: Find DOWN-only events for a user (for incident history page)
logSchema.index({ userId: 1, status: 1, checkedAt: -1 });

// TTL INDEX: Automatically delete log documents older than 90 days.
// MongoDB's background TTL monitor removes them ~every 60 seconds.
// This prevents the collection from growing indefinitely.
// 90 days = 7,776,000 seconds
logSchema.index({ checkedAt: 1 }, { expireAfterSeconds: 7776000 });

// ─── Export ───────────────────────────────────────────────────────────────────
module.exports = mongoose.model('Log', logSchema);
