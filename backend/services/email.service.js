/**
 * @file email.service.js
 * @description Nodemailer email service with HTML templates.
 *
 * ── HOW IT WORKS ─────────────────────────────────────────────────────────────
 * 1. Reads SMTP config from Settings collection (DB-driven — no .env needed)
 * 2. Creates a fresh Nodemailer transporter per send (picks up any setting changes)
 * 3. Calls the appropriate HTML template function
 * 4. Sends email, returns { success: true } or { success: false, error }
 *
 * ── ADDING NEW TEMPLATES ─────────────────────────────────────────────────────
 * 1. Add a new template function: buildXxxTemplate(data) → { subject, html }
 * 2. Add a case in sendEmail() switch statement
 * 3. Call from notification.service.js: notify(userId, 'NEW_EVENT', data)
 *
 * ── ERROR HANDLING ────────────────────────────────────────────────────────────
 * Never throws — always returns { success, error }.
 * notification.service.js handles failed sends gracefully.
 */

const nodemailer = require('nodemailer');
const Settings = require('../models/Settings.model');
const EmailTemplate = require('../models/EmailTemplate.model');

// ─── Placeholder Engine ───────────────────────────────────────────────────────
/**
 * Replaces {{placeholder}} tokens in a string with actual data values.
 * Supports nested objects (e.g., {{plan.type}}) and safe rendering.
 *
 * @param {string} template - String with {{variable}} tokens
 * @param {object} data - Key-value pairs to inject
 * @returns {string} - Rendered string
 */
const renderTemplate = (template, data) => {
  if (!template) return '';
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const val = data[key];
    if (val === null || val === undefined) return match; // keep placeholder if no value
    if (val instanceof Date) return val.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
    return String(val);
  });
};

// ─── HTML Base Template ───────────────────────────────────────────────────────
/**
 * Wraps any content in a clean, branded HTML email layout.
 * @param {string} content - Inner HTML content
 * @param {string} appName - App name for header
 */
const wrapEmail = (content, appName = 'WebMonitor') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px 12px 0 0;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                🖥️ ${appName}
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">
                Smart Website Monitoring
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#1e293b;padding:40px;border-radius:0 0 12px 12px;">
              ${content}
              
              <!-- Footer -->
              <hr style="border:none;border-top:1px solid #334155;margin:32px 0;">
              <p style="margin:0;color:#64748b;font-size:12px;text-align:center;line-height:1.6;">
                © 2026 ${appName} · You received this because you signed up for website monitoring.<br>
                If you did not create this account, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ─── Template Helpers ─────────────────────────────────────────────────────────
const btn = (text, url) =>
  `<a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;margin:20px 0;">${text}</a>`;

const h2 = (text) =>
  `<h2 style="margin:0 0 16px;color:#f1f5f9;font-size:22px;font-weight:700;">${text}</h2>`;

const p = (text) =>
  `<p style="margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.7;">${text}</p>`;

const badge = (text, color = '#6366f1') =>
  `<span style="display:inline-block;background:${color};color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">${text}</span>`;

const infoBox = (rows) => `
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:8px;padding:16px;margin:16px 0;">
  ${rows.map(([label, value]) => `
  <tr>
    <td style="color:#64748b;font-size:13px;padding:6px 12px;">${label}</td>
    <td style="color:#e2e8f0;font-size:13px;font-weight:600;padding:6px 12px;">${value}</td>
  </tr>`).join('')}
</table>`;

// ─── Email Templates ──────────────────────────────────────────────────────────

const templates = {

  // 1. Welcome + Email Verification
  WELCOME: ({ name, verifyUrl, appName, frontendUrl }) => ({
    subject: `Welcome to ${appName}! Verify your email ✉️`,
    html: wrapEmail(`
      ${h2(`Welcome, ${name}! 🎉`)}
      ${p(`You've successfully created your ${appName} account. We're excited to help you monitor your websites 24/7 with AI-powered insights.`)}
      ${p(`Please verify your email address to activate your account and start adding your websites.`)}
      <div style="text-align:center;margin:24px 0;">
        ${btn('✅ Verify Email', verifyUrl)}
      </div>
      ${p(`This link expires in <strong style="color:#f1f5f9;">24 hours</strong>. If you didn't create this account, you can safely ignore this email.`)}
    `, appName),
  }),

  // 2. Email Verified
  EMAIL_VERIFIED: ({ name, dashboardUrl, appName }) => ({
    subject: `Email verified! You're all set 🚀`,
    html: wrapEmail(`
      ${h2(`Your email is verified! ✅`)}
      ${p(`Hi ${name}, your email has been successfully verified. Your ${appName} account is now fully active.`)}
      ${p(`You can now start monitoring your websites and get real-time alerts.`)}
      <div style="text-align:center;margin:24px 0;">
        ${btn('Go to Dashboard →', dashboardUrl)}
      </div>
    `, appName),
  }),

  // 3. Forgot Password OTP
  FORGOT_PASSWORD: ({ name, otp, appName }) => ({
    subject: `Your password reset OTP — ${appName}`,
    html: wrapEmail(`
      ${h2(`Password Reset Request 🔐`)}
      ${p(`Hi ${name}, we received a request to reset your password. Use the OTP below:`)}
      <div style="text-align:center;margin:24px 0;background:#0f172a;border-radius:12px;padding:24px;">
        <p style="margin:0 0 8px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:2px;">Your OTP</p>
        <p style="margin:0;color:#6366f1;font-size:40px;font-weight:800;letter-spacing:10px;">${otp}</p>
        <p style="margin:12px 0 0;color:#64748b;font-size:13px;">Expires in 15 minutes</p>
      </div>
      ${p(`If you didn't request a password reset, please ignore this email. Your password will not change.`)}
    `, appName),
  }),

  // 4. Password Changed Confirmation
  PASSWORD_CHANGED: ({ name, appName, frontendUrl }) => ({
    subject: `Your password has been changed — ${appName}`,
    html: wrapEmail(`
      ${h2(`Password Changed Successfully 🔒`)}
      ${p(`Hi ${name}, your ${appName} password was just changed.`)}
      ${p(`If you made this change, no action is needed.`)}
      ${p(`If you did NOT make this change, your account may be compromised. Please reset your password immediately.`)}
      <div style="text-align:center;margin:24px 0;">
        ${btn('Reset My Password', `${frontendUrl}/forgot-password`)}
      </div>
    `, appName),
  }),

  // 5. Plan Activated
  PLAN_ACTIVATED: ({ name, plan, siteLimit, expiresAt, dashboardUrl, appName }) => ({
    subject: `🎉 Your ${plan} plan is now active!`,
    html: wrapEmail(`
      ${h2(`Plan Activated! 🚀`)}
      ${p(`Hi ${name}, your payment has been verified and your plan is now active!`)}
      ${infoBox([
        ['Plan', plan.toUpperCase()],
        ['Site Limit', `${siteLimit} websites`],
        ['Active Until', new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })],
      ])}
      ${p(`You can now add up to <strong style="color:#6366f1;">${siteLimit} websites</strong> for monitoring.`)}
      <div style="text-align:center;margin:24px 0;">
        ${btn('Go to Dashboard →', dashboardUrl)}
      </div>
    `, appName),
  }),

  // 6. Payment Rejected
  PAYMENT_REJECTED: ({ name, plan, adminNote, dashboardUrl, appName }) => ({
    subject: `Payment verification failed — ${appName}`,
    html: wrapEmail(`
      ${h2(`Payment Could Not Be Verified ❌`)}
      ${p(`Hi ${name}, unfortunately we could not verify your payment for the <strong style="color:#f1f5f9;">${plan}</strong> plan.`)}
      ${adminNote ? `
      <div style="background:#0f172a;border-left:4px solid #ef4444;border-radius:0 8px 8px 0;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#94a3b8;font-size:14px;"><strong style="color:#f1f5f9;">Reason:</strong> ${adminNote}</p>
      </div>` : ''}
      ${p(`Please submit a new payment with the correct UTR number, or contact support for assistance.`)}
      <div style="text-align:center;margin:24px 0;">
        ${btn('Try Again', `${dashboardUrl}/billing`)}
      </div>
    `, appName),
  }),

  // 7. Plan Expiring Soon (7 days warning)
  PLAN_EXPIRING: ({ name, plan, expiresAt, daysLeft, dashboardUrl, appName }) => ({
    subject: `⚠️ Your ${plan} plan expires in ${daysLeft} days`,
    html: wrapEmail(`
      ${h2(`Your Plan Expires Soon ⚠️`)}
      ${p(`Hi ${name}, your <strong style="color:#f1f5f9;">${plan}</strong> plan will expire in <strong style="color:#f59e0b;">${daysLeft} days</strong>.`)}
      ${infoBox([
        ['Plan', plan.toUpperCase()],
        ['Expires On', new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })],
      ])}
      ${p(`Renew now to continue uninterrupted monitoring for all your websites.`)}
      <div style="text-align:center;margin:24px 0;">
        ${btn('Renew Plan →', `${dashboardUrl}/billing`)}
      </div>
    `, appName),
  }),

  // 8. Plan Expired
  PLAN_EXPIRED: ({ name, plan, dashboardUrl, appName }) => ({
    subject: `Your ${plan} plan has expired — ${appName}`,
    html: wrapEmail(`
      ${h2(`Your Plan Has Expired 🕐`)}
      ${p(`Hi ${name}, your <strong style="color:#f1f5f9;">${plan}</strong> plan has expired. Your account has been reverted to the free plan (1 website).`)}
      ${p(`Your monitoring data is safe. Simply renew to restore full access.`)}
      <div style="text-align:center;margin:24px 0;">
        ${btn('Renew Now →', `${dashboardUrl}/billing`)}
      </div>
    `, appName),
  }),

  // 9. Site DOWN Alert
  SITE_DOWN: ({ name, siteName, siteUrl, statusCode, responseTime, aiRootCause, checkedAt, dashboardUrl, appName }) => ({
    subject: `🔴 ALERT: ${siteName} is DOWN`,
    html: wrapEmail(`
      <div style="text-align:center;margin-bottom:24px;">
        ${badge('🔴 SITE DOWN', '#ef4444')}
      </div>
      ${h2(`${siteName} is not responding!`)}
      ${p(`We detected that your website is down. Here are the details:`)}
      ${infoBox([
        ['Website', siteName],
        ['URL', siteUrl],
        ['Status Code', statusCode || 'No Response (Network Error)'],
        ['Response Time', responseTime ? `${responseTime}ms` : 'Timeout'],
        ['Detected At', new Date(checkedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'],
      ])}
      ${aiRootCause ? `
      <div style="background:#0f172a;border-left:4px solid #6366f1;border-radius:0 8px 8px 0;padding:16px;margin:16px 0;">
        <p style="margin:0 0 8px;color:#6366f1;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">AI Analysis</p>
        <p style="margin:0;color:#94a3b8;font-size:14px;line-height:1.6;">${aiRootCause}</p>
      </div>` : ''}
      <div style="text-align:center;margin:24px 0;">
        ${btn('Check Dashboard →', dashboardUrl)}
      </div>
    `, appName),
  }),

  // 10. Site Recovered (UP after DOWN)
  SITE_UP: ({ name, siteName, siteUrl, responseTime, checkedAt, dashboardUrl, appName }) => ({
    subject: `🟢 ${siteName} is back online!`,
    html: wrapEmail(`
      <div style="text-align:center;margin-bottom:24px;">
        ${badge('🟢 RECOVERED', '#22c55e')}
      </div>
      ${h2(`${siteName} is back UP! ✅`)}
      ${p(`Great news! Your website is responding normally again.`)}
      ${infoBox([
        ['Website', siteName],
        ['URL', siteUrl],
        ['Response Time', responseTime ? `${responseTime}ms` : 'N/A'],
        ['Recovered At', new Date(checkedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'],
      ])}
      <div style="text-align:center;margin:24px 0;">
        ${btn('View History →', dashboardUrl)}
      </div>
    `, appName),
  }),

  // 11. Plan Limit Reached
  PLAN_LIMIT: ({ name, currentPlan, siteLimit, dashboardUrl, appName }) => ({
    subject: `You've hit your monitor limit — ${appName}`,
    html: wrapEmail(`
      ${h2(`Monitor Limit Reached 🚧`)}
      ${p(`Hi ${name}, you've reached the maximum number of websites for your <strong style="color:#f1f5f9;">${currentPlan}</strong> plan (${siteLimit} websites).`)}
      ${p(`Upgrade your plan to monitor more websites and unlock advanced features.`)}
      <div style="text-align:center;margin:24px 0;">
        ${btn('Upgrade Plan →', `${dashboardUrl}/billing`)}
      </div>
    `, appName),
  }),

  // 12. Payment Submitted Confirmation
  PAYMENT_SUBMITTED: ({ name, plan, finalAmount, utrNumber, dashboardUrl, appName }) => ({
    subject: `Payment received — awaiting verification 🕐`,
    html: wrapEmail(`
      ${h2(`Payment Submitted! ⏳`)}
      ${p(`Hi ${name}, we've received your payment for the <strong style="color:#f1f5f9;">${plan}</strong> plan. Our admin team will verify it within <strong style="color:#f1f5f9;">24 hours</strong>.`)}
      ${infoBox([
        ['Plan', plan?.toUpperCase() || 'N/A'],
        ['Amount Paid', `₹${finalAmount}`],
        ['UTR Number', utrNumber],
        ['Status', '⏳ Pending Verification'],
      ])}
      ${p(`You'll receive an email as soon as your payment is verified and your plan is activated.`)}
      <div style="text-align:center;margin:24px 0;">
        ${btn('Check Payment Status →', `${dashboardUrl}/billing`)}
      </div>
    `, appName),
  }),

};


// ─── Core Send Function ───────────────────────────────────────────────────────
/**
 * Sends an email using the configured SMTP settings from the database.
 *
 * Priority for template resolution:
 *   1. DB EmailTemplate (isCustom=true — admin edited)
 *   2. DB EmailTemplate (default seeded)
 *   3. Hardcoded template function (last resort fallback)
 *
 * @param {string} to - Recipient email address
 * @param {string} eventType - One of the template keys (e.g., 'SITE_DOWN')
 * @param {object} data - Template data ({ name, otp, siteName, ... })
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const sendEmail = async (to, eventType, data) => {
  try {
    // 1. Load SMTP settings from DB
    const settings = await Settings.findOne({}).select('+smtpPass').lean();

    if (!settings || !settings.emailEnabled) {
      console.log(`📧 Email disabled or no settings — skipping ${eventType} to ${to}`);
      return { success: false, error: 'Email disabled' };
    }

    if (!settings.smtpUser || !settings.smtpPass) {
      console.error('❌ Email: SMTP credentials not configured in Settings');
      return { success: false, error: 'SMTP not configured' };
    }

    // 2. Build template data (inject global settings first, then event-specific data)
    const templateData = {
      appName: settings.appName || 'WebMonitor',
      frontendUrl: settings.frontendUrl || 'http://localhost:3000',
      dashboardUrl: settings.frontendUrl || 'http://localhost:3000',
      ...data,
      // Format dates nicely if passed as Date objects
      expiresAt: data.expiresAt ? new Date(data.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined,
      checkedAt: data.checkedAt ? new Date(data.checkedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : undefined,
      responseTime: data.responseTime ? `${data.responseTime}ms` : 'Timeout',
      statusCode: data.statusCode || 'No Response',
      aiRootCause: data.aiRootCause || 'No AI analysis available.',
      adminNote: data.adminNote || 'No reason provided.',
      plan: data.plan ? data.plan.toUpperCase() : undefined,
    };

    let subject, html;

    // 3. Try DB template first (admin-customized takes highest priority)
    const dbTemplate = await EmailTemplate.findOne({ key: eventType.toUpperCase(), isActive: true });

    if (dbTemplate) {
      // Use DB template with placeholder replacement
      subject = renderTemplate(dbTemplate.subject, templateData);
      html = renderTemplate(dbTemplate.html, templateData);
      console.log(`📧 Using ${dbTemplate.isCustom ? 'custom' : 'default'} DB template [${eventType}]`);
    } else {
      // 4. Fall back to hardcoded template function
      const templateFn = templates[eventType];
      if (!templateFn) {
        console.error(`❌ Email: No template found for: ${eventType}`);
        return { success: false, error: `Unknown template: ${eventType}` };
      }
      ({ subject, html } = templateFn(templateData));
      console.log(`📧 Using hardcoded template [${eventType}]`);
    }

    // 5. Create fresh transporter
    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      secure: settings.smtpSecure,
      auth: { user: settings.smtpUser, pass: settings.smtpPass },
    });

    // 6. Send email
    await transporter.sendMail({
      from: `"${settings.fromName || 'WebMonitor'}" <${settings.fromEmail || settings.smtpUser}>`,
      to,
      subject,
      html,
    });

    console.log(`📧 Email sent: [${eventType}] → ${to}`);
    return { success: true };

  } catch (error) {
    console.error(`❌ Email failed [${eventType}] → ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };
