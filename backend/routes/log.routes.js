/**
 * @file log.routes.js
 * @description Routes for reading uptime ping history and stats.
 *
 * ALL routes protected by: protect middleware (via router.use)
 *
 *   GET /api/logs/:monitorId          → paginated ping history
 *   GET /api/logs/:monitorId/stats    → uptime stats (%, avg response, etc.)
 */

const express = require('express');
const { getLogs, getStats } = require('../controllers/log.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Secure ALL log routes — user must be logged in
router.use(protect);

/**
 * @swagger
 * /api/logs/{monitorId}:
 *   get:
 *     summary: Get paginated ping history for a monitor
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: monitorId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [UP, DOWN]
 *     responses:
 *       200:
 *         description: Paginated log history
 *       404:
 *         description: Monitor not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:monitorId', getLogs);

/**
 * @swagger
 * /api/logs/{monitorId}/stats:
 *   get:
 *     summary: Get uptime statistics for a monitor
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: monitorId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *     responses:
 *       200:
 *         description: Uptime stats including percentage, response times, DOWN events
 *       404:
 *         description: Monitor not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:monitorId/stats', getStats);

module.exports = router;
