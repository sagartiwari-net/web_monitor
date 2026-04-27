/**
 * @file audit.controller.js
 * @description Manual PageSpeed audit trigger for a monitor.
 *
 * Endpoint:
 *   POST /api/audit/:monitorId   → triggerAudit
 *   GET  /api/audit/:monitorId   → getAuditResult
 *
 * Flow (triggerAudit):
 *   1. Verify monitor belongs to req.user._id (tenant isolation)
 *   2. Call audit.service.runAudit(monitor.url)
 *   3. Save results to Monitor.seoAudit (embedded document)
 *   4. Return updated audit data
 *
 * Note on rate limiting:
 *   PageSpeed API has a free quota of ~25,000 queries/day per project.
 *   We do NOT add extra rate limiting here — the plan's site limits
 *   act as a natural cap on how many audits a user can run.
 */

const Monitor = require('../models/Monitor.model');
const { runAudit } = require('../services/audit.service');
const { sendSuccess, sendError } = require('../utils/response.util');

// ─── triggerAudit ─────────────────────────────────────────────────────────────
/**
 * POST /api/audit/:monitorId
 * Manually triggers a fresh PageSpeed audit for a monitor.
 * Takes 10-30 seconds — PageSpeed runs a full Lighthouse analysis.
 */
const triggerAudit = async (req, res) => {
  try {
    const { monitorId } = req.params;

    // 1. Tenant isolation: verify monitor belongs to this user
    const monitor = await Monitor.findOne({
      _id: monitorId,
      userId: req.user._id,
    });

    if (!monitor) {
      return sendError(res, 404, 'Monitor not found.', 'MONITOR_NOT_FOUND');
    }

    // 2. Inform user that audit is running (it takes time)
    // In a production system, this would be an async job with a webhook
    // For hackathon, we run it synchronously and wait for response
    console.log(`🔍 Manual audit triggered: "${monitor.name}" (${monitor.url}) by user ${req.user._id}`);

    // 3. Run the PageSpeed audit (can take 10-30 seconds)
    const auditResult = await runAudit(monitor.url);

    if (!auditResult) {
      return sendError(
        res,
        502,
        'PageSpeed audit failed. The URL may be unreachable or PageSpeed API quota exceeded.',
        'AUDIT_FAILED'
      );
    }

    // 4. Save audit results to Monitor.seoAudit embedded document
    monitor.seoAudit = auditResult;
    await monitor.save();

    console.log(`✅ Audit complete: "${monitor.name}" → Perf: ${auditResult.perfScore}, SEO: ${auditResult.seoScore}`);

    return sendSuccess(res, 200, 'Audit completed successfully.', {
      monitor: {
        _id: monitor._id,
        name: monitor.name,
        url: monitor.url,
      },
      audit: auditResult,
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return sendError(res, 400, 'Invalid monitor ID format.', 'INVALID_ID');
    }
    console.error('❌ triggerAudit Error:', error);
    return sendError(res, 500, 'Failed to run audit.', 'SERVER_ERROR');
  }
};

// ─── getAuditResult ───────────────────────────────────────────────────────────
/**
 * GET /api/audit/:monitorId
 * Returns the last stored audit result for a monitor.
 * Does NOT trigger a new audit — just reads the cached result.
 */
const getAuditResult = async (req, res) => {
  try {
    const monitor = await Monitor.findOne({
      _id: req.params.monitorId,
      userId: req.user._id,
    }).select('name url seoAudit currentStatus lastResponseTime');

    if (!monitor) {
      return sendError(res, 404, 'Monitor not found.', 'MONITOR_NOT_FOUND');
    }

    if (!monitor.seoAudit?.fetchedAt) {
      return sendSuccess(res, 200, 'No audit data yet. Run POST /api/audit/:monitorId to trigger one.', {
        monitor: { _id: monitor._id, name: monitor.name, url: monitor.url },
        audit: null,
      });
    }

    return sendSuccess(res, 200, 'Audit data fetched successfully.', {
      monitor: { _id: monitor._id, name: monitor.name, url: monitor.url },
      audit: monitor.seoAudit,
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return sendError(res, 400, 'Invalid monitor ID format.', 'INVALID_ID');
    }
    console.error('❌ getAuditResult Error:', error);
    return sendError(res, 500, 'Failed to fetch audit.', 'SERVER_ERROR');
  }
};

module.exports = { triggerAudit, getAuditResult };
