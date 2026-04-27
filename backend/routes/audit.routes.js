/**
 * @file audit.routes.js
 * @description Routes for PageSpeed audit — manual trigger and result fetch.
 *
 * ALL routes protected by: protect middleware
 *
 *   POST /api/audit/:monitorId   → triggerAudit  (runs fresh Lighthouse audit)
 *   GET  /api/audit/:monitorId   → getAuditResult (reads cached result)
 */

const express = require('express');
const { triggerAudit, getAuditResult } = require('../controllers/audit.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Secure all audit routes
router.use(protect);

/**
 * @swagger
 * /api/audit/{monitorId}:
 *   post:
 *     summary: Trigger a fresh PageSpeed audit for a monitor
 *     description: Runs a full Google Lighthouse analysis via PageSpeed API. Takes 10-30 seconds.
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: monitorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Audit complete — returns scores and Core Web Vitals
 *       404:
 *         description: Monitor not found
 *       502:
 *         description: PageSpeed API failed or quota exceeded
 *       401:
 *         description: Unauthorized
 */
router.post('/:monitorId', triggerAudit);

/**
 * @swagger
 * /api/audit/{monitorId}:
 *   get:
 *     summary: Get last stored audit result for a monitor
 *     description: Returns cached audit data without triggering a new run.
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: monitorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Last audit result (or null if never audited)
 *       404:
 *         description: Monitor not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:monitorId', getAuditResult);

module.exports = router;
