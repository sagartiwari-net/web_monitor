/**
 * @file emailTemplate.seed.js
 * @description Default email templates — seeded on first server start.
 *
 * Templates use {{placeholder}} syntax.
 * Admin can edit these via admin panel (stored in DB as isCustom: true).
 * These defaults are used if no DB template is found.
 *
 * The HTML uses the same dark-themed design as the original hardcoded templates.
 */

// ─── Shared Layout Helpers ────────────────────────────────────────────────────
const BASE_STYLES = `
  body { margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif; }
  .wrapper { background:#0f172a;padding:40px 20px; }
  .container { max-width:600px;margin:0 auto; }
  .header { background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px 12px 0 0;padding:32px;text-align:center; }
  .header h1 { margin:0;color:#fff;font-size:24px;font-weight:700; }
  .header p { margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px; }
  .body { background:#1e293b;padding:40px;border-radius:0 0 12px 12px; }
  .btn { display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;margin:20px 0; }
  h2 { margin:0 0 16px;color:#f1f5f9;font-size:22px;font-weight:700; }
  p { margin:0 0 16px;color:#94a3b8;font-size:15px;line-height:1.7; }
  .info-table { width:100%;background:#0f172a;border-radius:8px;padding:16px;margin:16px 0;border-collapse:collapse; }
  .info-table td { padding:6px 12px;font-size:13px; }
  .info-table td:first-child { color:#64748b; }
  .info-table td:last-child { color:#e2e8f0;font-weight:600; }
  .footer { border-top:1px solid #334155;margin:32px 0 0;padding-top:20px;color:#64748b;font-size:12px;text-align:center;line-height:1.6; }
  .badge { display:inline-block;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;color:#fff; }
  .otp-box { text-align:center;background:#0f172a;border-radius:12px;padding:24px;margin:20px 0; }
  .otp-label { color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:2px;margin:0 0 8px; }
  .otp-code { color:#6366f1;font-size:40px;font-weight:800;letter-spacing:10px;margin:0; }
  .otp-expire { color:#64748b;font-size:13px;margin:12px 0 0; }
  .ai-box { background:#0f172a;border-left:4px solid #6366f1;border-radius:0 8px 8px 0;padding:16px;margin:16px 0; }
  .ai-label { color:#6366f1;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px; }
  .ai-text { color:#94a3b8;font-size:14px;line-height:1.6;margin:0; }
  .reject-box { background:#0f172a;border-left:4px solid #ef4444;border-radius:0 8px 8px 0;padding:16px;margin:16px 0; }
`;

const wrap = (content, appName = '{{appName}}') => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>🖥️ {{appName}}</h1>
        <p>Smart Website Monitoring</p>
      </div>
      <div class="body">
        ${content}
        <div class="footer">
          © 2026 {{appName}} · You received this because you signed up for website monitoring.<br>
          If you did not create this account, you can safely ignore this email.
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

// ─── Template Definitions ─────────────────────────────────────────────────────
const DEFAULT_TEMPLATES = [

  {
    key: 'WELCOME',
    name: 'Welcome & Email Verification',
    category: 'auth',
    subject: 'Welcome to {{appName}}! Verify your email ✉️',
    description: 'Sent when a new user signs up. Contains email verification link.',
    variables: ['name', 'appName', 'verifyUrl'],
    html: wrap(`
      <h2>Welcome, {{name}}! 🎉</h2>
      <p>You've successfully created your {{appName}} account. We're excited to help you monitor your websites 24/7 with AI-powered insights.</p>
      <p>Please verify your email address to activate your account and start adding your websites.</p>
      <div style="text-align:center;">
        <a class="btn" href="{{verifyUrl}}">✅ Verify Email</a>
      </div>
      <p>This link expires in <strong style="color:#f1f5f9;">24 hours</strong>. If you didn't create this account, you can safely ignore this email.</p>
    `),
  },

  {
    key: 'EMAIL_VERIFIED',
    name: 'Email Verified Confirmation',
    category: 'auth',
    subject: 'Email verified! You\'re all set 🚀',
    description: 'Sent after user clicks the email verification link.',
    variables: ['name', 'appName', 'frontendUrl'],
    html: wrap(`
      <h2>Your email is verified! ✅</h2>
      <p>Hi {{name}}, your email has been successfully verified. Your {{appName}} account is now fully active.</p>
      <p>You can now start monitoring your websites and get real-time alerts.</p>
      <div style="text-align:center;">
        <a class="btn" href="{{frontendUrl}}">Go to Dashboard →</a>
      </div>
    `),
  },

  {
    key: 'FORGOT_PASSWORD',
    name: 'Password Reset OTP',
    category: 'auth',
    subject: 'Your password reset OTP — {{appName}}',
    description: 'Sent when user requests password reset. Contains 6-digit OTP.',
    variables: ['name', 'appName', 'otp'],
    html: wrap(`
      <h2>Password Reset Request 🔐</h2>
      <p>Hi {{name}}, we received a request to reset your password. Use the OTP below:</p>
      <div class="otp-box">
        <p class="otp-label">Your OTP</p>
        <p class="otp-code">{{otp}}</p>
        <p class="otp-expire">Expires in 15 minutes</p>
      </div>
      <p>If you didn't request a password reset, please ignore this email. Your password will not change.</p>
    `),
  },

  {
    key: 'PASSWORD_CHANGED',
    name: 'Password Changed Confirmation',
    category: 'auth',
    subject: 'Your password has been changed — {{appName}}',
    description: 'Sent after a successful password reset.',
    variables: ['name', 'appName', 'frontendUrl'],
    html: wrap(`
      <h2>Password Changed Successfully 🔒</h2>
      <p>Hi {{name}}, your {{appName}} password was just changed.</p>
      <p>If you made this change, no action is needed.</p>
      <p>If you did <strong style="color:#ef4444;">NOT</strong> make this change, your account may be compromised. Please reset your password immediately.</p>
      <div style="text-align:center;">
        <a class="btn" href="{{frontendUrl}}/forgot-password">Reset My Password</a>
      </div>
    `),
  },

  {
    key: 'PLAN_ACTIVATED',
    name: 'Plan Activated',
    category: 'billing',
    subject: '🎉 Your {{plan}} plan is now active!',
    description: 'Sent when admin approves a payment and activates user plan.',
    variables: ['name', 'appName', 'plan', 'siteLimit', 'expiresAt', 'frontendUrl'],
    html: wrap(`
      <h2>Plan Activated! 🚀</h2>
      <p>Hi {{name}}, your payment has been verified and your plan is now active!</p>
      <table class="info-table">
        <tr><td>Plan</td><td>{{plan}}</td></tr>
        <tr><td>Site Limit</td><td>{{siteLimit}} websites</td></tr>
        <tr><td>Active Until</td><td>{{expiresAt}}</td></tr>
      </table>
      <p>You can now add up to <strong style="color:#6366f1;">{{siteLimit}} websites</strong> for monitoring.</p>
      <div style="text-align:center;">
        <a class="btn" href="{{frontendUrl}}">Go to Dashboard →</a>
      </div>
    `),
  },

  {
    key: 'PAYMENT_REJECTED',
    name: 'Payment Rejected',
    category: 'billing',
    subject: 'Payment verification failed — {{appName}}',
    description: 'Sent when admin rejects a payment with optional reason.',
    variables: ['name', 'appName', 'plan', 'adminNote', 'frontendUrl'],
    html: wrap(`
      <h2>Payment Could Not Be Verified ❌</h2>
      <p>Hi {{name}}, unfortunately we could not verify your payment for the <strong style="color:#f1f5f9;">{{plan}}</strong> plan.</p>
      <div class="reject-box">
        <p style="margin:0;color:#94a3b8;font-size:14px;"><strong style="color:#f1f5f9;">Reason:</strong> {{adminNote}}</p>
      </div>
      <p>Please submit a new payment with the correct UTR number, or contact support for assistance.</p>
      <div style="text-align:center;">
        <a class="btn" href="{{frontendUrl}}/billing">Try Again</a>
      </div>
    `),
  },

  {
    key: 'PLAN_EXPIRING',
    name: 'Plan Expiring Soon (7-day warning)',
    category: 'billing',
    subject: '⚠️ Your {{plan}} plan expires in {{daysLeft}} days',
    description: 'Sent 7 days before plan expiry by the daily cron job.',
    variables: ['name', 'appName', 'plan', 'expiresAt', 'daysLeft', 'frontendUrl'],
    html: wrap(`
      <h2>Your Plan Expires Soon ⚠️</h2>
      <p>Hi {{name}}, your <strong style="color:#f1f5f9;">{{plan}}</strong> plan will expire in <strong style="color:#f59e0b;">{{daysLeft}} days</strong>.</p>
      <table class="info-table">
        <tr><td>Plan</td><td>{{plan}}</td></tr>
        <tr><td>Expires On</td><td>{{expiresAt}}</td></tr>
      </table>
      <p>Renew now to continue uninterrupted monitoring for all your websites.</p>
      <div style="text-align:center;">
        <a class="btn" href="{{frontendUrl}}/billing">Renew Plan →</a>
      </div>
    `),
  },

  {
    key: 'PLAN_EXPIRED',
    name: 'Plan Expired',
    category: 'billing',
    subject: 'Your {{plan}} plan has expired — {{appName}}',
    description: 'Sent when a plan expires. User is reverted to free plan.',
    variables: ['name', 'appName', 'plan', 'frontendUrl'],
    html: wrap(`
      <h2>Your Plan Has Expired 🕐</h2>
      <p>Hi {{name}}, your <strong style="color:#f1f5f9;">{{plan}}</strong> plan has expired. Your account has been reverted to the free plan (1 website).</p>
      <p>Your monitoring data is safe. Simply renew to restore full access.</p>
      <div style="text-align:center;">
        <a class="btn" href="{{frontendUrl}}/billing">Renew Now →</a>
      </div>
    `),
  },

  {
    key: 'SITE_DOWN',
    name: 'Site Down Alert',
    category: 'monitoring',
    subject: '🔴 ALERT: {{siteName}} is DOWN',
    description: 'Sent immediately when a monitored site goes down (status change only).',
    variables: ['name', 'appName', 'siteName', 'siteUrl', 'statusCode', 'responseTime', 'aiRootCause', 'checkedAt', 'frontendUrl'],
    html: wrap(`
      <div style="text-align:center;margin-bottom:24px;">
        <span class="badge" style="background:#ef4444;">🔴 SITE DOWN</span>
      </div>
      <h2>{{siteName}} is not responding!</h2>
      <p>We detected that your website is down. Here are the details:</p>
      <table class="info-table">
        <tr><td>Website</td><td>{{siteName}}</td></tr>
        <tr><td>URL</td><td>{{siteUrl}}</td></tr>
        <tr><td>Status Code</td><td>{{statusCode}}</td></tr>
        <tr><td>Response Time</td><td>{{responseTime}}</td></tr>
        <tr><td>Detected At</td><td>{{checkedAt}}</td></tr>
      </table>
      <div class="ai-box">
        <p class="ai-label">AI Analysis</p>
        <p class="ai-text">{{aiRootCause}}</p>
      </div>
      <div style="text-align:center;">
        <a class="btn" href="{{frontendUrl}}">Check Dashboard →</a>
      </div>
    `),
  },

  {
    key: 'SITE_UP',
    name: 'Site Recovered Alert',
    category: 'monitoring',
    subject: '🟢 {{siteName}} is back online!',
    description: 'Sent when a site recovers from DOWN state.',
    variables: ['name', 'appName', 'siteName', 'siteUrl', 'responseTime', 'checkedAt', 'frontendUrl'],
    html: wrap(`
      <div style="text-align:center;margin-bottom:24px;">
        <span class="badge" style="background:#22c55e;">🟢 RECOVERED</span>
      </div>
      <h2>{{siteName}} is back UP! ✅</h2>
      <p>Great news! Your website is responding normally again.</p>
      <table class="info-table">
        <tr><td>Website</td><td>{{siteName}}</td></tr>
        <tr><td>URL</td><td>{{siteUrl}}</td></tr>
        <tr><td>Response Time</td><td>{{responseTime}}</td></tr>
        <tr><td>Recovered At</td><td>{{checkedAt}}</td></tr>
      </table>
      <div style="text-align:center;">
        <a class="btn" href="{{frontendUrl}}">View History →</a>
      </div>
    `),
  },

  {
    key: 'PLAN_LIMIT',
    name: 'Monitor Limit Reached',
    category: 'billing',
    subject: 'You\'ve hit your monitor limit — {{appName}}',
    description: 'Sent when user tries to add a monitor beyond their plan limit.',
    variables: ['name', 'appName', 'currentPlan', 'siteLimit', 'frontendUrl'],
    html: wrap(`
      <h2>Monitor Limit Reached 🚧</h2>
      <p>Hi {{name}}, you've reached the maximum number of websites for your <strong style="color:#f1f5f9;">{{currentPlan}}</strong> plan ({{siteLimit}} websites).</p>
      <p>Upgrade your plan to monitor more websites and unlock advanced features.</p>
      <div style="text-align:center;">
        <a class="btn" href="{{frontendUrl}}/billing">Upgrade Plan →</a>
      </div>
    `),
  },

  {
    key: 'PAYMENT_SUBMITTED',
    name: 'Payment Submitted Confirmation',
    category: 'billing',
    subject: 'Payment received — awaiting verification 🕐',
    description: 'Sent immediately when user submits a UTR number.',
    variables: ['name', 'appName', 'plan', 'finalAmount', 'utrNumber', 'frontendUrl'],
    html: wrap(`
      <h2>Payment Submitted! ⏳</h2>
      <p>Hi {{name}}, we've received your payment for the <strong style="color:#f1f5f9;">{{plan}}</strong> plan. Our admin team will verify it within <strong style="color:#f1f5f9;">24 hours</strong>.</p>
      <table class="info-table">
        <tr><td>Plan</td><td>{{plan}}</td></tr>
        <tr><td>Amount Paid</td><td>₹{{finalAmount}}</td></tr>
        <tr><td>UTR Number</td><td>{{utrNumber}}</td></tr>
        <tr><td>Status</td><td>⏳ Pending Verification</td></tr>
      </table>
      <p>You'll receive an email as soon as your payment is verified and your plan is activated.</p>
      <div style="text-align:center;">
        <a class="btn" href="{{frontendUrl}}/billing">Check Payment Status →</a>
      </div>
    `),
  },

];

module.exports = DEFAULT_TEMPLATES;
