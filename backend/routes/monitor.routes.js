/**
 * @file monitor.routes.js
 * @description Routes for website monitor CRUD.
 *
 * ALL routes protected by: protect middleware
 * (router.use(protect) at top = PHP require('auth.php') equivalent)
 *
 * Route Map:
 *   POST   /api/monitors              → createMonitor
 *   GET    /api/monitors              → getAllMonitors
 *   GET    /api/monitors/:id          → getMonitor
 *   PUT    /api/monitors/:id          → updateMonitor
 *   DELETE /api/monitors/:id          → deleteMonitor
 *   PATCH  /api/monitors/:id/toggle   → toggleMonitor
 */

const express = require('express');
const { body } = require('express-validator');

const {
  createMonitor,
  getAllMonitors,
  getMonitor,
  updateMonitor,
  deleteMonitor,
  toggleMonitor,
} = require('../controllers/monitor.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// ─── Protect ALL routes in this file ─────────────────────────────────────────
// This single line secures every route below it.
// Equivalent to PHP: require('auth.php'); at the top of a page.
router.use(protect);

// ─── Validation Rules ─────────────────────────────────────────────────────────
const createValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Monitor name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),

  body('url')
    .trim()
    .notEmpty().withMessage('URL is required')
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('URL must start with http:// or https://'),

  body('checkInterval')
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage('Check interval must be between 1 and 60 minutes'),
];

const updateValidation = [
  body('name')
    .optional()
    .trim()
    .notEmpty().withMessage('Name cannot be empty')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),

  body('url')
    .optional()
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('URL must start with http:// or https://'),

  body('checkInterval')
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage('Check interval must be between 1 and 60 minutes'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/monitors:
 *   post:
 *     summary: Add a new website monitor
 *     tags: [Monitors]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, url]
 *             properties:
 *               name:
 *                 type: string
 *                 example: My Portfolio
 *               url:
 *                 type: string
 *                 example: https://example.com
 *               checkInterval:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       201:
 *         description: Monitor created
 *       400:
 *         description: Validation error
 *       403:
 *         description: Plan limit reached
 *       401:
 *         description: Unauthorized
 */
router.post('/', createValidation, createMonitor);

/**
 * @swagger
 * /api/monitors:
 *   get:
 *     summary: Get all monitors for the logged-in user
 *     tags: [Monitors]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of monitors with summary stats
 *       401:
 *         description: Unauthorized
 */
router.get('/', getAllMonitors);

/**
 * @swagger
 * /api/monitors/{id}:
 *   get:
 *     summary: Get a single monitor by ID
 *     tags: [Monitors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Monitor details
 *       404:
 *         description: Monitor not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:id', getMonitor);

/**
 * @swagger
 * /api/monitors/{id}:
 *   put:
 *     summary: Update a monitor's name, URL, or check interval
 *     tags: [Monitors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               url:
 *                 type: string
 *               checkInterval:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Monitor updated
 *       404:
 *         description: Monitor not found
 *       401:
 *         description: Unauthorized
 */
router.put('/:id', updateValidation, updateMonitor);

/**
 * @swagger
 * /api/monitors/{id}:
 *   delete:
 *     summary: Delete a monitor permanently
 *     tags: [Monitors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Monitor deleted
 *       404:
 *         description: Monitor not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', deleteMonitor);

/**
 * @swagger
 * /api/monitors/{id}/toggle:
 *   patch:
 *     summary: Pause or resume a monitor (toggle isActive)
 *     tags: [Monitors]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Monitor paused or resumed
 *       404:
 *         description: Monitor not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id/toggle', toggleMonitor);

module.exports = router;
