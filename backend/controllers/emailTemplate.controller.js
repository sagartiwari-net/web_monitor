/**
 * @file emailTemplate.controller.js
 * @description Admin CRUD for email templates.
 *
 * ALL endpoints require: protect + adminOnly
 *
 *   GET  /api/admin/email-templates            → listTemplates
 *   GET  /api/admin/email-templates/:key       → getTemplate
 *   PUT  /api/admin/email-templates/:key       → updateTemplate
 *   POST /api/admin/email-templates/:key/reset → resetTemplate (restore default)
 *   POST /api/admin/email-templates/test       → sendTestEmail
 *   POST /api/admin/email-templates/:key/preview → previewTemplate
 */

const EmailTemplate = require('../models/EmailTemplate.model');
const DEFAULT_TEMPLATES = require('../seeds/emailTemplate.seed');
const { sendEmail } = require('../services/email.service');
const { sendSuccess, sendError } = require('../utils/response.util');

// ─── listTemplates ────────────────────────────────────────────────────────────
/**
 * GET /api/admin/email-templates
 * Returns all templates, grouped by category. HTML excluded (too large).
 */
const listTemplates = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};

    const templates = await EmailTemplate.find(filter)
      .select('-html') // Exclude HTML for list view (use getTemplate for editing)
      .sort({ category: 1, name: 1 });

    // Group by category for frontend
    const grouped = templates.reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(t);
      return acc;
    }, {});

    return sendSuccess(res, 200, `${templates.length} email template(s) found.`, {
      total: templates.length,
      grouped,
      templates,
    });
  } catch (error) {
    console.error('❌ listTemplates Error:', error.message);
    return sendError(res, 500, 'Failed to fetch templates.', 'SERVER_ERROR');
  }
};

// ─── getTemplate ──────────────────────────────────────────────────────────────
/**
 * GET /api/admin/email-templates/:key
 * Returns a single template with full HTML (for editing).
 */
const getTemplate = async (req, res) => {
  try {
    const key = req.params.key.toUpperCase();
    const template = await EmailTemplate.findOne({ key });

    if (!template) {
      return sendError(res, 404, `Template "${key}" not found.`, 'NOT_FOUND');
    }

    return sendSuccess(res, 200, 'Template fetched.', { template });
  } catch (error) {
    console.error('❌ getTemplate Error:', error.message);
    return sendError(res, 500, 'Failed to fetch template.', 'SERVER_ERROR');
  }
};

// ─── updateTemplate ───────────────────────────────────────────────────────────
/**
 * PUT /api/admin/email-templates/:key
 * Update subject and/or HTML of a template.
 * Marks template as isCustom: true.
 *
 * Body: { subject?, html?, isActive?, name?, description? }
 */
const updateTemplate = async (req, res) => {
  try {
    const key = req.params.key.toUpperCase();
    const { subject, html, isActive, name, description } = req.body;

    if (!subject && !html && isActive === undefined && !name && !description) {
      return sendError(res, 400, 'Provide at least one field to update (subject, html, isActive, name, description).', 'VALIDATION_ERROR');
    }

    const template = await EmailTemplate.findOne({ key });
    if (!template) {
      return sendError(res, 404, `Template "${key}" not found.`, 'NOT_FOUND');
    }

    // Apply updates
    if (subject !== undefined) template.subject = subject;
    if (html !== undefined) template.html = html;
    if (isActive !== undefined) template.isActive = Boolean(isActive);
    if (name !== undefined) template.name = name;
    if (description !== undefined) template.description = description;

    // Mark as customized (so admin knows it's been edited)
    template.isCustom = true;
    await template.save();

    console.log(`⚙️ Admin updated email template: ${key}`);

    return sendSuccess(res, 200, `Template "${key}" updated successfully.`, {
      template: {
        key: template.key,
        name: template.name,
        subject: template.subject,
        isCustom: template.isCustom,
        isActive: template.isActive,
        updatedAt: template.updatedAt,
      },
    });
  } catch (error) {
    console.error('❌ updateTemplate Error:', error.message);
    return sendError(res, 500, 'Failed to update template.', 'SERVER_ERROR');
  }
};

// ─── resetTemplate ────────────────────────────────────────────────────────────
/**
 * POST /api/admin/email-templates/:key/reset
 * Restores a template to the original seeded default.
 */
const resetTemplate = async (req, res) => {
  try {
    const key = req.params.key.toUpperCase();

    // Find the default from seed data
    const defaultTemplate = DEFAULT_TEMPLATES.find((t) => t.key === key);
    if (!defaultTemplate) {
      return sendError(res, 404, `No default template found for "${key}".`, 'NOT_FOUND');
    }

    // Restore default values
    const updated = await EmailTemplate.findOneAndUpdate(
      { key },
      {
        subject: defaultTemplate.subject,
        html: defaultTemplate.html,
        name: defaultTemplate.name,
        description: defaultTemplate.description,
        isCustom: false,   // Reset — no longer custom
        isActive: true,    // Re-enable if disabled
      },
      { new: true }
    );

    if (!updated) {
      return sendError(res, 404, `Template "${key}" not found in DB.`, 'NOT_FOUND');
    }

    console.log(`🔄 Admin reset email template to default: ${key}`);
    return sendSuccess(res, 200, `Template "${key}" has been restored to default.`, {
      template: { key: updated.key, name: updated.name, isCustom: updated.isCustom },
    });
  } catch (error) {
    console.error('❌ resetTemplate Error:', error.message);
    return sendError(res, 500, 'Failed to reset template.', 'SERVER_ERROR');
  }
};

// ─── previewTemplate ──────────────────────────────────────────────────────────
/**
 * POST /api/admin/email-templates/:key/preview
 * Returns rendered HTML with sample data — for admin preview panel.
 * Does NOT send any email.
 *
 * Body: { sampleData?: {} } (optional custom sample values)
 */
const previewTemplate = async (req, res) => {
  try {
    const key = req.params.key.toUpperCase();
    const template = await EmailTemplate.findOne({ key });
    if (!template) {
      return sendError(res, 404, `Template "${key}" not found.`, 'NOT_FOUND');
    }

    // Default sample data for preview
    const sampleData = {
      name: 'Sagar Tiwari',
      appName: 'WebMonitor',
      frontendUrl: 'http://localhost:3000',
      dashboardUrl: 'http://localhost:3000',
      verifyUrl: 'http://localhost:8000/api/auth/verify-email?token=sample123',
      otp: '847293',
      plan: 'PRO',
      siteLimit: '5',
      expiresAt: '30 April 2026',
      daysLeft: '7',
      siteName: 'My Portfolio',
      siteUrl: 'https://myportfolio.com',
      statusCode: '503',
      responseTime: '— (timeout)',
      aiRootCause: 'The server returned a 503 status, indicating it is temporarily unavailable. This is often caused by server overload or scheduled maintenance.',
      checkedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
      adminNote: 'UTR number could not be verified with the bank.',
      finalAmount: '499',
      utrNumber: 'UTR123456789',
      currentPlan: 'free',
      ...req.body.sampleData,
    };

    // Render with placeholder engine
    const subject = template.subject.replace(/\{\{(\w+)\}\}/g, (match, key) => sampleData[key] || match);
    const html = template.html.replace(/\{\{(\w+)\}\}/g, (match, key) => sampleData[key] || match);

    return sendSuccess(res, 200, 'Template preview rendered.', {
      key: template.key,
      name: template.name,
      subject,
      html,        // Frontend renders this in an iframe
      isCustom: template.isCustom,
    });
  } catch (error) {
    console.error('❌ previewTemplate Error:', error.message);
    return sendError(res, 500, 'Failed to preview template.', 'SERVER_ERROR');
  }
};

// ─── sendTestEmail ────────────────────────────────────────────────────────────
/**
 * POST /api/admin/email-templates/test
 * Sends a test email using any template to a specified address.
 *
 * Body: { key: 'SITE_DOWN', to: 'admin@example.com', sampleData?: {} }
 */
const sendTestEmail = async (req, res) => {
  const { key, to } = req.body;

  if (!key || !to) {
    return sendError(res, 400, 'Both "key" and "to" are required.', 'VALIDATION_ERROR');
  }

  try {
    const result = await sendEmail(to, key.toUpperCase(), {
      name: 'Test User',
      plan: 'pro',
      otp: '123456',
      siteName: 'Test Website',
      siteUrl: 'https://example.com',
      statusCode: 503,
      responseTime: null,
      aiRootCause: 'This is a test notification. Your AI analysis will appear here.',
      checkedAt: new Date(),
      finalAmount: 499,
      utrNumber: 'TESTEMAIL001',
      currentPlan: 'free',
      siteLimit: 1,
      daysLeft: 7,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      adminNote: 'Test rejection reason.',
      ...(req.body.sampleData || {}),
    });

    if (!result.success) {
      return sendError(res, 500, `Failed to send test email: ${result.error}`, 'EMAIL_FAILED');
    }

    return sendSuccess(res, 200, `Test email sent to ${to} using template "${key}".`, { to, key });
  } catch (error) {
    console.error('❌ sendTestEmail Error:', error.message);
    return sendError(res, 500, 'Failed to send test email.', 'SERVER_ERROR');
  }
};

module.exports = { listTemplates, getTemplate, updateTemplate, resetTemplate, previewTemplate, sendTestEmail };
