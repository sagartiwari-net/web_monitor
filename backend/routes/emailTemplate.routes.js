/**
 * @file emailTemplate.routes.js
 * @description Admin routes for email template management.
 * All routes require: protect + adminOnly
 *
 *   GET  /api/admin/email-templates                  → list all templates (no HTML)
 *   GET  /api/admin/email-templates/:key             → get one with full HTML
 *   PUT  /api/admin/email-templates/:key             → update subject/HTML
 *   POST /api/admin/email-templates/:key/reset       → restore to default
 *   POST /api/admin/email-templates/:key/preview     → render HTML with sample data
 *   POST /api/admin/email-templates/test             → send test email
 */

const express = require('express');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const {
  listTemplates, getTemplate, updateTemplate, resetTemplate,
  previewTemplate, sendTestEmail,
} = require('../controllers/emailTemplate.controller');

const router = express.Router();

// All routes require admin access
router.use(protect, adminOnly);

// ── List & Test ───────────────────────────────────────────────────────────────
router.get('/', listTemplates);                        // ?category=auth|billing|monitoring
router.post('/test', sendTestEmail);                   // MUST be before /:key routes

// ── Single Template Operations ────────────────────────────────────────────────
router.get('/:key', getTemplate);                      // full HTML for editor
router.put('/:key', updateTemplate);                   // edit subject/html
router.post('/:key/reset', resetTemplate);             // restore default
router.post('/:key/preview', previewTemplate);         // render with sample data

module.exports = router;
