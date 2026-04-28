/**
 * @file telegram.service.js
 * @description Telegram Bot API integration — sends notifications to users.
 *
 * ── HOW IT WORKS ─────────────────────────────────────────────────────────────
 * 1. Admin sets bot token in Settings (via admin panel)
 * 2. User messages the bot on Telegram → gets their chat_id
 * 3. User submits chat_id to /api/notifications/telegram/connect
 * 4. When event happens, we call sendTelegram(chatId, message)
 *
 * ── API USED ─────────────────────────────────────────────────────────────────
 * Telegram Bot API: sendMessage
 * POST https://api.telegram.org/bot{TOKEN}/sendMessage
 * Body: { chat_id, text, parse_mode: 'Markdown' }
 *
 * ── NO EXTRA PACKAGE NEEDED ──────────────────────────────────────────────────
 * We use native https module — no node-telegram-bot-api needed.
 * Keeps bundle small and avoids package dependency issues.
 *
 * ── ERROR HANDLING ────────────────────────────────────────────────────────────
 * Never throws — returns { success, error }.
 */

const https = require('https');
const Settings = require('../models/Settings.model');

/**
 * Makes a POST request to Telegram Bot API.
 * @param {string} token - Bot token
 * @param {string} method - API method (e.g., 'sendMessage')
 * @param {object} body - Request body
 */
const telegramRequest = (token, method, body) => {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${token}/${method}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => (responseData += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(responseData));
        } catch {
          resolve({ ok: false, description: 'Invalid response' });
        }
      });
    });

    req.on('error', (err) => resolve({ ok: false, description: err.message }));
    req.write(data);
    req.end();
  });
};

/**
 * Sends a Telegram message to a specific chat ID.
 * Bot token is read fresh from DB on each call.
 *
 * @param {string} chatId - User's Telegram chat ID
 * @param {string} message - Message text (supports Markdown)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const sendTelegram = async (chatId, message) => {
  try {
    // Read bot token from DB settings
    const settings = await Settings.findOne({}).select('+telegramBotToken').lean();

    if (!settings?.telegramEnabled || !settings?.telegramBotToken) {
      return { success: false, error: 'Telegram not enabled or bot token not set' };
    }

    const result = await telegramRequest(settings.telegramBotToken, 'sendMessage', {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
    });

    if (result.ok) {
      console.log(`📱 Telegram sent → ${chatId}`);
      return { success: true };
    } else {
      console.error(`❌ Telegram failed → ${chatId}:`, result.description);
      return { success: false, error: result.description };
    }

  } catch (error) {
    console.error('❌ Telegram error:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Verifies a chat ID by sending a welcome test message.
 * Used when user connects their Telegram account.
 *
 * @param {string} chatId - Chat ID to verify
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const verifyChatId = async (chatId) => {
  const settings = await Settings.findOne({}).select('+telegramBotToken').lean();

  if (!settings?.telegramEnabled || !settings?.telegramBotToken) {
    return { success: false, error: 'Telegram bot not configured. Ask admin to set up the bot.' };
  }

  const result = await telegramRequest(settings.telegramBotToken, 'sendMessage', {
    chat_id: chatId,
    text: `✅ *WebMonitor Connected!*\n\nYou will now receive monitoring alerts on Telegram.\n\n_You can disconnect anytime from your notification settings._`,
    parse_mode: 'Markdown',
  });

  if (result.ok) {
    return { success: true };
  }
  return { success: false, error: result.description || 'Invalid chat ID' };
};

// ─── Telegram Message Templates ───────────────────────────────────────────────
/**
 * Builds Telegram text messages for each event type.
 * Returns plain Markdown text (no HTML).
 */
const buildTelegramMessage = (eventType, data) => {
  const d = data;

  switch (eventType) {
    case 'WELCOME':
      return `👋 *Welcome to WebMonitor, ${d.name}!*\n\nYour account is ready. Start monitoring your websites now.`;

    case 'FORGOT_PASSWORD':
      return `🔐 *Password Reset OTP*\n\nYour OTP: \`${d.otp}\`\n\n_Expires in 15 minutes. Do not share this with anyone._`;

    case 'PASSWORD_CHANGED':
      return `🔒 *Password Changed*\n\nYour WebMonitor password was just changed. If this wasn't you, reset it immediately.`;

    case 'PLAN_ACTIVATED':
      return `🎉 *Plan Activated!*\n\n✅ Plan: ${d.plan?.toUpperCase()}\n📊 Sites: Up to ${d.siteLimit} websites\n📅 Valid until: ${new Date(d.expiresAt).toLocaleDateString('en-IN')}`;

    case 'PAYMENT_REJECTED':
      return `❌ *Payment Rejected*\n\nYour payment for the ${d.plan} plan could not be verified.\n\nReason: ${d.adminNote || 'Not specified'}`;

    case 'PLAN_EXPIRING':
      return `⚠️ *Plan Expiring Soon*\n\nYour ${d.plan} plan expires in *${d.daysLeft} days*.\nExpiry: ${new Date(d.expiresAt).toLocaleDateString('en-IN')}\n\nRenew to continue monitoring.`;

    case 'PLAN_EXPIRED':
      return `🕐 *Plan Expired*\n\nYour ${d.plan} plan has expired. You are now on the free plan (1 website).\n\nRenew to restore full access.`;

    case 'SITE_DOWN':
      return `🔴 *ALERT: ${d.siteName} is DOWN!*\n\n🌐 URL: ${d.siteUrl}\n📊 Status: ${d.statusCode || 'No response'}\n⏰ Time: ${new Date(d.checkedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST${d.aiRootCause ? `\n\n🤖 AI: ${d.aiRootCause}` : ''}`;

    case 'SITE_UP':
      return `🟢 *${d.siteName} is back UP!*\n\n🌐 URL: ${d.siteUrl}\n⚡ Response: ${d.responseTime}ms\n⏰ Time: ${new Date(d.checkedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`;

    case 'PLAN_LIMIT':
      return `🚧 *Monitor Limit Reached*\n\nYou've reached the limit of ${d.siteLimit} websites on your ${d.currentPlan} plan.\n\nUpgrade to add more websites.`;

    default:
      return `📢 *WebMonitor Notification*\n\nEvent: ${eventType}`;
  }
};

module.exports = { sendTelegram, verifyChatId, buildTelegramMessage };
