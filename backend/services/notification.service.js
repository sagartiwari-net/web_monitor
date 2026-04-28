/**
 * @file notification.service.js
 * @description Central notification orchestrator — single entry point for ALL notifications.
 *
 * ── HOW TO USE ────────────────────────────────────────────────────────────────
 * Import and call from anywhere in the codebase:
 *
 *   const { notify } = require('../services/notification.service');
 *   await notify(userId, 'SITE_DOWN', { monitor, log });
 *
 * That's it. This service handles:
 *   1. Fetching user's notification preferences
 *   2. Building correct data object for each channel
 *   3. Calling email.service + telegram.service in parallel
 *   4. Logging success/failure per channel
 *
 * ── ADDING NEW CHANNELS ───────────────────────────────────────────────────────
 * 1. Create services/newchannel.service.js with sendNewChannel(identifier, message)
 * 2. Add a block in notify() for the new channel
 * 3. Add preference field to User model
 * Done — all existing notify() calls automatically use the new channel.
 *
 * ── ERROR HANDLING ────────────────────────────────────────────────────────────
 * Never throws. Failed notifications are logged but never crash the caller.
 * The uptime cron, payment flow, etc. continue even if email/Telegram fails.
 */

const { User } = require('../models/User.model');
const Settings = require('../models/Settings.model');
const { sendEmail } = require('./email.service');
const { sendTelegram, buildTelegramMessage } = require('./telegram.service');

/**
 * Main notification dispatcher.
 *
 * @param {string|ObjectId} userId - The user to notify
 * @param {string} eventType - Event name (e.g., 'SITE_DOWN', 'PLAN_ACTIVATED')
 * @param {object} data - Event-specific data passed to templates
 */
const notify = async (userId, eventType, data = {}) => {
  try {
    // 1. Fetch user with notification preferences
    const user = await User.findById(userId).select('name email notifications telegramChatId').lean();
    if (!user) return;

    // 2. Fetch app settings (for URLs, appName etc.)
    const settings = await Settings.getSingleton(false);

    // 3. Build full data object (merge event data with global settings)
    const fullData = {
      name: user.name,
      appName: settings?.appName || 'WebMonitor',
      frontendUrl: settings?.frontendUrl || 'http://localhost:3000',
      dashboardUrl: settings?.frontendUrl || 'http://localhost:3000',
      ...data,
    };

    // 4. Send to each channel in parallel (fire and forget per channel)
    const sends = [];

    // ── Email ────────────────────────────────────────────────────────────────
    if (user.notifications?.email !== false) { // default true
      sends.push(
        sendEmail(user.email, eventType, fullData)
          .then((r) => r.success && console.log(`📧 [${eventType}] email → ${user.email}`))
          .catch((e) => console.error(`❌ Email notify error [${eventType}]:`, e.message))
      );
    }

    // ── Telegram ─────────────────────────────────────────────────────────────
    if (user.notifications?.telegram && user.telegramChatId) {
      const message = buildTelegramMessage(eventType, fullData);
      sends.push(
        sendTelegram(user.telegramChatId, message)
          .then((r) => r.success && console.log(`📱 [${eventType}] telegram → ${user.telegramChatId}`))
          .catch((e) => console.error(`❌ Telegram notify error [${eventType}]:`, e.message))
      );
    }

    // ── WhatsApp (Future) ─────────────────────────────────────────────────────
    // if (user.notifications?.whatsapp && user.whatsappNumber) {
    //   sends.push(sendWhatsApp(user.whatsappNumber, buildWhatsAppMessage(eventType, fullData)));
    // }

    // Wait for all channels (but don't block caller — use .catch on the whole thing)
    await Promise.allSettled(sends);

  } catch (error) {
    // Notification failure NEVER crashes the caller
    console.error(`❌ notify() failed [${eventType}] for user ${userId}:`, error.message);
  }
};

/**
 * Sends a notification to a specific email address (not a user in DB).
 * Used for email verification before user is fully created.
 *
 * @param {string} email - Direct email address
 * @param {string} eventType - Template type
 * @param {object} data - Template data
 */
const notifyDirect = async (email, eventType, data = {}) => {
  try {
    const settings = await Settings.getSingleton(false);
    const fullData = {
      appName: settings?.appName || 'WebMonitor',
      frontendUrl: settings?.frontendUrl || 'http://localhost:3000',
      dashboardUrl: settings?.frontendUrl || 'http://localhost:3000',
      ...data,
    };
    await sendEmail(email, eventType, fullData);
  } catch (error) {
    console.error(`❌ notifyDirect() failed [${eventType}] → ${email}:`, error.message);
  }
};

module.exports = { notify, notifyDirect };
