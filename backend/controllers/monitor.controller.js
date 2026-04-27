/**
 * @file monitor.controller.js
 * @description CRUD operations for website monitors.
 *
 * ── TENANT ISOLATION RULE ────────────────────────────────────────────────────
 * Every single DB query in this file MUST include { userId: req.user._id }.
 * This ensures users can ONLY see/edit/delete their own monitors.
 * We NEVER trust a userId sent from the client body/params.
 *
 * ── PLAN LIMIT ENFORCEMENT ───────────────────────────────────────────────────
 * Before creating a monitor, we check:
 *   currentMonitorCount >= user.plan.siteLimit → 403 Forbidden
 *
 * Limits: free=1, basic=3, pro=5, elite=15
 *
 * ── ENDPOINTS ────────────────────────────────────────────────────────────────
 *   POST   /api/monitors           → createMonitor
 *   GET    /api/monitors           → getAllMonitors
 *   GET    /api/monitors/:id       → getMonitor
 *   PUT    /api/monitors/:id       → updateMonitor
 *   DELETE /api/monitors/:id       → deleteMonitor
 *   PATCH  /api/monitors/:id/toggle → toggleMonitor
 */

const { validationResult } = require('express-validator');
const Monitor = require('../models/Monitor.model');
const { User } = require('../models/User.model');
const { sendSuccess, sendError } = require('../utils/response.util');

// ─── createMonitor ────────────────────────────────────────────────────────────
/**
 * POST /api/monitors
 * Add a new website to monitor.
 *
 * Plan limit check: count user's existing monitors → compare with plan.siteLimit
 */
const createMonitor = async (req, res) => {
  // 1. Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  const { name, url, checkInterval } = req.body;

  try {
    // 2. Fetch user's current plan limits
    const user = await User.findById(req.user._id).select('plan');
    if (!user) {
      return sendError(res, 404, 'User not found.', 'USER_NOT_FOUND');
    }

    // 3. Count existing monitors for this user
    const currentCount = await Monitor.countDocuments({ userId: req.user._id });

    // 4. Enforce plan site limit
    if (currentCount >= user.plan.siteLimit) {
      return sendError(
        res,
        403,
        `Your ${user.plan.type} plan allows only ${user.plan.siteLimit} monitor(s). ` +
        `You have already added ${currentCount}. Please upgrade your plan.`,
        'PLAN_LIMIT_REACHED'
      );
    }

    // 5. Create monitor — userId from req.user (never from body)
    const monitor = await Monitor.create({
      userId: req.user._id,
      name,
      url,
      ...(checkInterval && { checkInterval }),
    });

    return sendSuccess(res, 201, 'Monitor created successfully.', { monitor });

  } catch (error) {
    console.error('❌ createMonitor Error:', error);
    return sendError(res, 500, 'Failed to create monitor.', 'SERVER_ERROR');
  }
};

// ─── getAllMonitors ────────────────────────────────────────────────────────────
/**
 * GET /api/monitors
 * Returns all monitors for the authenticated user.
 * Includes a summary: total count, UP count, DOWN count.
 */
const getAllMonitors = async (req, res) => {
  try {
    // Fetch only this user's monitors, newest first
    const monitors = await Monitor.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    // Build a quick summary for dashboard stats
    const summary = {
      total: monitors.length,
      up: monitors.filter((m) => m.currentStatus === 'UP').length,
      down: monitors.filter((m) => m.currentStatus === 'DOWN').length,
      unknown: monitors.filter((m) => m.currentStatus === 'UNKNOWN').length,
      active: monitors.filter((m) => m.isActive).length,
      paused: monitors.filter((m) => !m.isActive).length,
    };

    return sendSuccess(res, 200, 'Monitors fetched successfully.', {
      summary,
      monitors,
    });

  } catch (error) {
    console.error('❌ getAllMonitors Error:', error);
    return sendError(res, 500, 'Failed to fetch monitors.', 'SERVER_ERROR');
  }
};

// ─── getMonitor ───────────────────────────────────────────────────────────────
/**
 * GET /api/monitors/:id
 * Returns a single monitor by ID.
 * Enforces tenant isolation: { _id, userId } both must match.
 */
const getMonitor = async (req, res) => {
  try {
    // userId in query = tenant isolation (can't access another user's monitor by ID)
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!monitor) {
      return sendError(res, 404, 'Monitor not found.', 'MONITOR_NOT_FOUND');
    }

    return sendSuccess(res, 200, 'Monitor fetched successfully.', { monitor });

  } catch (error) {
    // Mongoose CastError: invalid ObjectId format
    if (error.name === 'CastError') {
      return sendError(res, 400, 'Invalid monitor ID format.', 'INVALID_ID');
    }
    console.error('❌ getMonitor Error:', error);
    return sendError(res, 500, 'Failed to fetch monitor.', 'SERVER_ERROR');
  }
};

// ─── updateMonitor ────────────────────────────────────────────────────────────
/**
 * PUT /api/monitors/:id
 * Update monitor name, url, or checkInterval.
 * Does NOT update status fields (those are managed by the cron job).
 */
const updateMonitor = async (req, res) => {
  // 1. Validate request body
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, errors.array()[0].msg, 'VALIDATION_ERROR');
  }

  try {
    // 2. Only allow specific fields to be updated (whitelist approach)
    const allowedUpdates = {};
    if (req.body.name !== undefined) allowedUpdates.name = req.body.name;
    if (req.body.url !== undefined) allowedUpdates.url = req.body.url;
    if (req.body.checkInterval !== undefined) allowedUpdates.checkInterval = req.body.checkInterval;

    if (Object.keys(allowedUpdates).length === 0) {
      return sendError(res, 400, 'No valid fields to update.', 'NO_UPDATES');
    }

    // 3. Find and update — userId ensures tenant isolation
    const monitor = await Monitor.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: allowedUpdates },
      { new: true, runValidators: true } // new:true returns updated doc, validators rerun
    );

    if (!monitor) {
      return sendError(res, 404, 'Monitor not found.', 'MONITOR_NOT_FOUND');
    }

    return sendSuccess(res, 200, 'Monitor updated successfully.', { monitor });

  } catch (error) {
    if (error.name === 'CastError') {
      return sendError(res, 400, 'Invalid monitor ID format.', 'INVALID_ID');
    }
    if (error.name === 'ValidationError') {
      return sendError(res, 400, Object.values(error.errors)[0].message, 'VALIDATION_ERROR');
    }
    console.error('❌ updateMonitor Error:', error);
    return sendError(res, 500, 'Failed to update monitor.', 'SERVER_ERROR');
  }
};

// ─── deleteMonitor ────────────────────────────────────────────────────────────
/**
 * DELETE /api/monitors/:id
 * Permanently deletes a monitor.
 * Note: Associated Log documents are NOT deleted here.
 * They will auto-expire via TTL index (90 days), or we can add cleanup later.
 */
const deleteMonitor = async (req, res) => {
  try {
    const monitor = await Monitor.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!monitor) {
      return sendError(res, 404, 'Monitor not found.', 'MONITOR_NOT_FOUND');
    }

    return sendSuccess(res, 200, `Monitor "${monitor.name}" deleted successfully.`, {
      deletedMonitorId: monitor._id,
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return sendError(res, 400, 'Invalid monitor ID format.', 'INVALID_ID');
    }
    console.error('❌ deleteMonitor Error:', error);
    return sendError(res, 500, 'Failed to delete monitor.', 'SERVER_ERROR');
  }
};

// ─── toggleMonitor ────────────────────────────────────────────────────────────
/**
 * PATCH /api/monitors/:id/toggle
 * Toggles isActive between true and false.
 * When paused (isActive=false), cron job skips this monitor.
 */
const toggleMonitor = async (req, res) => {
  try {
    // Fetch current state first
    const monitor = await Monitor.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!monitor) {
      return sendError(res, 404, 'Monitor not found.', 'MONITOR_NOT_FOUND');
    }

    // Flip the isActive flag
    monitor.isActive = !monitor.isActive;
    await monitor.save();

    const statusMsg = monitor.isActive ? 'resumed' : 'paused';
    return sendSuccess(res, 200, `Monitor "${monitor.name}" has been ${statusMsg}.`, {
      monitor,
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return sendError(res, 400, 'Invalid monitor ID format.', 'INVALID_ID');
    }
    console.error('❌ toggleMonitor Error:', error);
    return sendError(res, 500, 'Failed to toggle monitor.', 'SERVER_ERROR');
  }
};

module.exports = {
  createMonitor,
  getAllMonitors,
  getMonitor,
  updateMonitor,
  deleteMonitor,
  toggleMonitor,
};
