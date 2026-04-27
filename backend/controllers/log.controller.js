/**
 * @file log.controller.js
 * @description API endpoints for viewing uptime ping history.
 *
 * Endpoints:
 *   GET /api/logs/:monitorId          → getLogs       (paginated ping history)
 *   GET /api/logs/:monitorId/stats    → getStats      (uptime %, avg response time, etc.)
 *
 * Tenant Isolation:
 *   We verify the monitor belongs to req.user._id before returning any logs.
 *   This prevents users from accessing another user's ping history.
 */

const Monitor = require('../models/Monitor.model');
const Log = require('../models/Log.model');
const { sendSuccess, sendError } = require('../utils/response.util');

// ─── getLogs ──────────────────────────────────────────────────────────────────
/**
 * GET /api/logs/:monitorId
 * Returns paginated uptime ping history for a specific monitor.
 *
 * Query params:
 *   ?limit=50   (default: 50, max: 200)
 *   ?page=1     (default: 1)
 *   ?status=DOWN (optional filter — 'UP' | 'DOWN')
 */
const getLogs = async (req, res) => {
  try {
    const { monitorId } = req.params;

    // 1. Verify monitor exists and belongs to this user (tenant isolation)
    const monitor = await Monitor.findOne({
      _id: monitorId,
      userId: req.user._id,
    }).select('name url');

    if (!monitor) {
      return sendError(res, 404, 'Monitor not found.', 'MONITOR_NOT_FOUND');
    }

    // 2. Parse pagination params
    const limit = Math.min(parseInt(req.query.limit) || 50, 200); // cap at 200
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    // 3. Build query filters
    const filter = { monitorId };
    if (req.query.status === 'UP' || req.query.status === 'DOWN') {
      filter.status = req.query.status;
    }

    // 4. Fetch logs + total count in parallel
    const [logs, total] = await Promise.all([
      Log.find(filter)
        .sort({ checkedAt: -1 }) // newest first
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Log.countDocuments(filter),
    ]);

    return sendSuccess(res, 200, 'Logs fetched successfully.', {
      monitor: { _id: monitor._id, name: monitor.name, url: monitor.url },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
      },
      logs,
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return sendError(res, 400, 'Invalid monitor ID format.', 'INVALID_ID');
    }
    console.error('❌ getLogs Error:', error);
    return sendError(res, 500, 'Failed to fetch logs.', 'SERVER_ERROR');
  }
};

// ─── getStats ─────────────────────────────────────────────────────────────────
/**
 * GET /api/logs/:monitorId/stats
 * Returns uptime statistics for a monitor over the last N days.
 *
 * Query params:
 *   ?days=7  (default: 7, max: 90)
 *
 * Returns:
 *   - uptimePercentage: 0-100
 *   - totalChecks: number
 *   - upChecks: number
 *   - downChecks: number
 *   - avgResponseTime: number (ms)
 *   - minResponseTime: number (ms)
 *   - maxResponseTime: number (ms)
 *   - downEvents: last 5 DOWN events with timestamps + AI analysis
 */
const getStats = async (req, res) => {
  try {
    const { monitorId } = req.params;

    // 1. Tenant isolation check
    const monitor = await Monitor.findOne({
      _id: monitorId,
      userId: req.user._id,
    }).select('name url currentStatus lastResponseTime seoAudit lastAiAnalysis');

    if (!monitor) {
      return sendError(res, 404, 'Monitor not found.', 'MONITOR_NOT_FOUND');
    }

    // 2. Parse time range
    const days = Math.min(parseInt(req.query.days) || 7, 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 3. Aggregate stats from Log collection
    const [aggregation, downEvents] = await Promise.all([
      // Main stats aggregation
      Log.aggregate([
        { $match: { monitorId: monitor._id, checkedAt: { $gte: since } } },
        {
          $group: {
            _id: null,
            totalChecks: { $sum: 1 },
            upChecks: { $sum: { $cond: [{ $eq: ['$status', 'UP'] }, 1, 0] } },
            downChecks: { $sum: { $cond: [{ $eq: ['$status', 'DOWN'] }, 1, 0] } },
            avgResponseTime: { $avg: '$responseTime' },
            minResponseTime: { $min: '$responseTime' },
            maxResponseTime: { $max: '$responseTime' },
          },
        },
      ]),

      // Last 5 DOWN events for the incident log
      Log.find({ monitorId: monitor._id, status: 'DOWN', checkedAt: { $gte: since } })
        .sort({ checkedAt: -1 })
        .limit(5)
        .select('checkedAt statusCode error aiRootCause responseTime'),
    ]);

    const stats = aggregation[0] || {
      totalChecks: 0, upChecks: 0, downChecks: 0,
      avgResponseTime: 0, minResponseTime: 0, maxResponseTime: 0,
    };

    const uptimePercentage = stats.totalChecks > 0
      ? parseFloat(((stats.upChecks / stats.totalChecks) * 100).toFixed(2))
      : null; // null = not enough data yet

    return sendSuccess(res, 200, 'Stats fetched successfully.', {
      monitor: {
        _id: monitor._id,
        name: monitor.name,
        url: monitor.url,
        currentStatus: monitor.currentStatus,
        lastResponseTime: monitor.lastResponseTime,
        lastAiAnalysis: monitor.lastAiAnalysis,
        seoAudit: monitor.seoAudit,
      },
      period: { days, since },
      stats: {
        uptimePercentage,
        totalChecks: stats.totalChecks,
        upChecks: stats.upChecks,
        downChecks: stats.downChecks,
        avgResponseTime: stats.avgResponseTime ? Math.round(stats.avgResponseTime) : null,
        minResponseTime: stats.minResponseTime || null,
        maxResponseTime: stats.maxResponseTime || null,
      },
      recentDownEvents: downEvents,
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return sendError(res, 400, 'Invalid monitor ID format.', 'INVALID_ID');
    }
    console.error('❌ getStats Error:', error);
    return sendError(res, 500, 'Failed to fetch stats.', 'SERVER_ERROR');
  }
};

module.exports = { getLogs, getStats };
