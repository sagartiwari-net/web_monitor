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

/**
 * @swagger
 * tags:
 *   name: Email Templates
 *   description: "[Admin] Manage custom HTML email templates for all system notifications"
 */

/**
 * @swagger
 * /api/admin/email-templates:
 *   get:
 *     summary: "[Admin] List all 12 email templates"
 *     description: >
 *       Returns all email templates grouped by category (auth, billing, monitoring).
 *       HTML is excluded from listing for performance — use GET /:key to get full HTML.
 *
 *       **Available template keys:**
 *       - Auth: `WELCOME`, `EMAIL_VERIFIED`, `FORGOT_PASSWORD`, `PASSWORD_CHANGED`
 *       - Billing: `PLAN_ACTIVATED`, `PAYMENT_REJECTED`, `PLAN_EXPIRING`, `PLAN_EXPIRED`, `PAYMENT_SUBMITTED`
 *       - Monitoring: `SITE_DOWN`, `SITE_UP`, `PLAN_LIMIT`
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [auth, billing, monitoring]
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: List of templates grouped by category
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     total: { type: integer, example: 12 }
 *                     grouped:
 *                       type: object
 *                       properties:
 *                         auth:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               key: { type: string, example: WELCOME }
 *                               subject: { type: string }
 *                               isCustom: { type: boolean }
 *                               variables: { type: array, items: { type: string } }
 *       403:
 *         description: Admin access required
 */
router.get('/', listTemplates);

/**
 * @swagger
 * /api/admin/email-templates/test:
 *   post:
 *     summary: "[Admin] Send a test email using a specific template"
 *     description: >
 *       Renders the specified template with sample data and sends it to the given email address.
 *       Useful to preview how the email looks in an actual inbox.
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, to]
 *             properties:
 *               key:
 *                 type: string
 *                 enum: [WELCOME, EMAIL_VERIFIED, FORGOT_PASSWORD, PASSWORD_CHANGED, PLAN_ACTIVATED, PAYMENT_REJECTED, PLAN_EXPIRING, PLAN_EXPIRED, SITE_DOWN, SITE_UP, PLAN_LIMIT, PAYMENT_SUBMITTED]
 *                 example: PLAN_ACTIVATED
 *               to:
 *                 type: string
 *                 format: email
 *                 example: admin@webmonitor.com
 *     responses:
 *       200:
 *         description: Test email sent successfully
 *       400:
 *         description: Missing key or to address
 *       404:
 *         description: Template key not found
 */
router.post('/test', sendTestEmail);

/**
 * @swagger
 * /api/admin/email-templates/{key}:
 *   get:
 *     summary: "[Admin] Get a single template with full HTML"
 *     description: >
 *       Returns the complete template including full HTML for editing.
 *       Templates support `{{placeholder}}` syntax for dynamic data injection.
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *           enum: [WELCOME, EMAIL_VERIFIED, FORGOT_PASSWORD, PASSWORD_CHANGED, PLAN_ACTIVATED, PAYMENT_REJECTED, PLAN_EXPIRING, PLAN_EXPIRED, SITE_DOWN, SITE_UP, PLAN_LIMIT, PAYMENT_SUBMITTED]
 *         example: SITE_DOWN
 *     responses:
 *       200:
 *         description: Full template with HTML and variable list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     template:
 *                       type: object
 *                       properties:
 *                         key: { type: string }
 *                         subject: { type: string }
 *                         html: { type: string, description: Full HTML content }
 *                         isCustom: { type: boolean, description: true if admin has edited }
 *                         variables: { type: array, items: { type: string }, description: Available placeholders }
 *                         category: { type: string, enum: [auth, billing, monitoring] }
 *       404:
 *         description: Template not found
 */
router.get('/:key', getTemplate);

/**
 * @swagger
 * /api/admin/email-templates/{key}:
 *   put:
 *     summary: "[Admin] Edit an email template's subject and/or HTML"
 *     description: >
 *       Update the subject line and/or full HTML body of a template.
 *       Setting `isCustom = true` ensures the DB version takes priority over defaults.
 *
 *       **Placeholder syntax:** Use `{{placeholder}}` in subject or HTML.
 *       Available placeholders depend on the template — check `variables` in GET response.
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         example: SITE_DOWN
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subject:
 *                 type: string
 *                 example: "🔴 URGENT: {{siteName}} is DOWN!"
 *               html:
 *                 type: string
 *                 description: Full HTML email body with {{placeholder}} variables
 *     responses:
 *       200:
 *         description: Template updated, isCustom set to true
 *       400:
 *         description: Nothing to update
 *       404:
 *         description: Template not found
 */
router.put('/:key', updateTemplate);

/**
 * @swagger
 * /api/admin/email-templates/{key}/reset:
 *   post:
 *     summary: "[Admin] Reset template to system default"
 *     description: >
 *       Restores the template's subject and HTML to the original seeded default.
 *       Sets `isCustom = false`.
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         example: SITE_DOWN
 *     responses:
 *       200:
 *         description: Template reset to default, isCustom = false
 *       404:
 *         description: Template not found
 */
router.post('/:key/reset', resetTemplate);

/**
 * @swagger
 * /api/admin/email-templates/{key}/preview:
 *   post:
 *     summary: "[Admin] Preview a template rendered with sample data"
 *     description: >
 *       Renders the template HTML with sample placeholder values so the admin
 *       can see exactly how the email will look before sending.
 *       Returns rendered `subject` and `html` — no email is actually sent.
 *     tags: [Email Templates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *         example: PLAN_ACTIVATED
 *     requestBody:
 *       description: Optional custom data to override sample values
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: "Sagar Tiwari" }
 *               plan: { type: string, example: "pro" }
 *               siteName: { type: string, example: "My Portfolio" }
 *     responses:
 *       200:
 *         description: Rendered preview (subject + HTML with real values)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     subject: { type: string, description: Rendered subject with placeholders filled }
 *                     html: { type: string, description: Rendered HTML body }
 *       404:
 *         description: Template not found
 */
router.post('/:key/preview', previewTemplate);

module.exports = router;
