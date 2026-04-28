/**
 * @file notification.controller.js
 * @description Handles Telegram connect/disconnect and notification preference updates.
 */

const { User } = require('../models/User.model');
const Settings = require('../models/Settings.model');
const { verifyChatId } = require('../services/telegram.service');
const { sendEmail } = require('../services/email.service');
const { sendSuccess, sendError } = require('../utils/response.util');

// ─── getPreferences ────────────────────────────────────────────────────────────
/**
 * GET /api/notifications/preferences
 * Returns current notification settings for the logged-in user.
 */
const getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications telegramChatId isEmailVerified');
    return sendSuccess(res, 200, 'Notification preferences fetched.', {
      preferences: {
        email: user.notifications?.email ?? true,
        telegram: user.notifications?.telegram ?? false,
        whatsapp: user.notifications?.whatsapp ?? false,
      },
      telegramConnected: !!user.telegramChatId,
      isEmailVerified: user.isEmailVerified,
    });
  } catch (error) {
    console.error('❌ getPreferences Error:', error.message);
    return sendError(res, 500, 'Could not fetch preferences.', 'SERVER_ERROR');
  }
};

// ─── updatePreferences ────────────────────────────────────────────────────────
/**
 * PUT /api/notifications/preferences
 * Body: { email: true, telegram: false }
 */
const updatePreferences = async (req, res) => {
  try {
    const { email, telegram, whatsapp } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return sendError(res, 404, 'User not found.', 'USER_NOT_FOUND');

    // Only update provided fields
    if (email !== undefined) user.notifications.email = Boolean(email);
    if (telegram !== undefined) {
      // Can only enable telegram if chatId is connected
      if (telegram && !user.telegramChatId) {
        return sendError(res, 400, 'Please connect your Telegram account first.', 'TELEGRAM_NOT_CONNECTED');
      }
      user.notifications.telegram = Boolean(telegram);
    }
    if (whatsapp !== undefined) user.notifications.whatsapp = Boolean(whatsapp);

    await user.save();

    return sendSuccess(res, 200, 'Notification preferences updated.', {
      preferences: {
        email: user.notifications.email,
        telegram: user.notifications.telegram,
        whatsapp: user.notifications.whatsapp,
      },
    });
  } catch (error) {
    console.error('❌ updatePreferences Error:', error.message);
    return sendError(res, 500, 'Could not update preferences.', 'SERVER_ERROR');
  }
};

// ─── getTelegramSetup ─────────────────────────────────────────────────────────
/**
 * GET /api/notifications/telegram/setup
 * Returns bot username and instructions for user to connect Telegram.
 */
const getTelegramSetup = async (req, res) => {
  try {
    const settings = await Settings.getSingleton();

    if (!settings?.telegramEnabled || !settings?.telegramBotUsername) {
      return sendError(res, 503, 'Telegram integration is not configured yet. Please contact admin.', 'TELEGRAM_NOT_CONFIGURED');
    }

    return sendSuccess(res, 200, 'Telegram setup instructions.', {
      botUsername: settings.telegramBotUsername,
      botUrl: `https://t.me/${settings.telegramBotUsername.replace('@', '')}`,
      instructions: [
        `1. Open Telegram and search for "${settings.telegramBotUsername}"`,
        '2. Start a chat with the bot by clicking "Start" or sending /start',
        '3. The bot will reply with your unique Chat ID (a number like 123456789)',
        '4. Copy that Chat ID and paste it in the field below',
        '5. Click "Connect" — we will send a test message to verify',
      ],
    });
  } catch (error) {
    console.error('❌ getTelegramSetup Error:', error.message);
    return sendError(res, 500, 'Could not fetch setup info.', 'SERVER_ERROR');
  }
};

// ─── connectTelegram ──────────────────────────────────────────────────────────
/**
 * POST /api/notifications/telegram/connect
 * Body: { chatId: "123456789" }
 * Sends a test message to verify the chat ID is valid.
 */
const connectTelegram = async (req, res) => {
  const { chatId } = req.body;

  if (!chatId || typeof chatId !== 'string' || chatId.trim().length === 0) {
    return sendError(res, 400, 'Telegram Chat ID is required.', 'VALIDATION_ERROR');
  }

  try {
    // Verify chatId by sending a test message
    const verification = await verifyChatId(chatId.trim());

    if (!verification.success) {
      return sendError(
        res, 400,
        `Could not verify Chat ID: ${verification.error || 'Invalid chat ID'}. Make sure you have started the bot first.`,
        'TELEGRAM_VERIFY_FAILED'
      );
    }

    // Save chatId and enable Telegram notifications
    const user = await User.findById(req.user._id);
    user.telegramChatId = chatId.trim();
    user.notifications.telegram = true;
    await user.save();

    return sendSuccess(res, 200, 'Telegram connected! You will now receive notifications on Telegram.', {
      telegramConnected: true,
      chatId: chatId.trim(),
    });

  } catch (error) {
    console.error('❌ connectTelegram Error:', error.message);
    return sendError(res, 500, 'Could not connect Telegram.', 'SERVER_ERROR');
  }
};

// ─── disconnectTelegram ───────────────────────────────────────────────────────
/**
 * DELETE /api/notifications/telegram/disconnect
 */
const disconnectTelegram = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      telegramChatId: null,
      'notifications.telegram': false,
    });
    return sendSuccess(res, 200, 'Telegram disconnected.', { telegramConnected: false });
  } catch (error) {
    console.error('❌ disconnectTelegram Error:', error.message);
    return sendError(res, 500, 'Could not disconnect Telegram.', 'SERVER_ERROR');
  }
};

// ─── sendTestNotification ─────────────────────────────────────────────────────
/**
 * POST /api/notifications/test
 * Sends a test notification to verify email and telegram are working.
 */
const sendTestNotification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return sendError(res, 404, 'User not found.', 'USER_NOT_FOUND');

    const results = {};

    // Test Email
    if (user.notifications?.email !== false) {
      const emailResult = await sendEmail(user.email, 'WELCOME', {
        name: user.name,
        verifyUrl: 'https://example.com/verify-test',
      });
      results.email = emailResult.success ? 'sent' : `failed: ${emailResult.error}`;
    } else {
      results.email = 'disabled';
    }

    // Test Telegram
    if (user.notifications?.telegram && user.telegramChatId) {
      const { sendTelegram } = require('../services/telegram.service');
      const tResult = await sendTelegram(user.telegramChatId, '🧪 *Test Notification*\n\nYour WebMonitor notifications are working correctly!');
      results.telegram = tResult.success ? 'sent' : `failed: ${tResult.error}`;
    } else {
      results.telegram = user.telegramChatId ? 'disabled' : 'not connected';
    }

    return sendSuccess(res, 200, 'Test notifications sent.', { results });
  } catch (error) {
    console.error('❌ sendTestNotification Error:', error.message);
    return sendError(res, 500, 'Test notification failed.', 'SERVER_ERROR');
  }
};

module.exports = { getPreferences, updatePreferences, getTelegramSetup, connectTelegram, disconnectTelegram, sendTestNotification };
