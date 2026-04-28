/**
 * @file notification.routes.js
 * @description Notification preferences and Telegram connect endpoints.
 * All routes require JWT authentication.
 *
 *   GET    /api/notifications/preferences         → get email/telegram settings
 *   PUT    /api/notifications/preferences         → update on/off toggles
 *   GET    /api/notifications/telegram/setup      → get bot link + instructions
 *   POST   /api/notifications/telegram/connect    → connect chatId + verify
 *   DELETE /api/notifications/telegram/disconnect → disconnect
 *   POST   /api/notifications/test               → send test notification
 */

const express = require('express');
const { protect } = require('../middleware/auth.middleware');
const {
  getPreferences, updatePreferences,
  getTelegramSetup, connectTelegram, disconnectTelegram,
  sendTestNotification,
} = require('../controllers/notification.controller');

const router = express.Router();

// All notification routes require authentication
router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification preferences and Telegram bot integration
 */

/**
 * @swagger
 * /api/notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     description: Returns the user's current notification settings (email on/off, telegram on/off).
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     preferences:
 *                       type: object
 *                       properties:
 *                         email: { type: boolean, example: true }
 *                         telegram: { type: boolean, example: false }
 *                         whatsapp: { type: boolean, example: false }
 *                     telegramConnected: { type: boolean }
 *                     telegramChatId: { type: string, example: "899961701" }
 *       401:
 *         description: Unauthorized
 */
router.get('/preferences', getPreferences);

/**
 * @swagger
 * /api/notifications/preferences:
 *   put:
 *     summary: Update notification preferences
 *     description: >
 *       Enable or disable notification channels. Email is recommended to keep ON
 *       (OTP and auth emails only go via email). Telegram can be toggled.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: boolean
 *                 description: Enable/disable email notifications
 *                 example: true
 *               telegram:
 *                 type: boolean
 *                 description: Enable/disable Telegram alerts (must connect chatId first)
 *                 example: true
 *     responses:
 *       200:
 *         description: Preferences updated
 *       400:
 *         description: No valid fields provided
 *       401:
 *         description: Unauthorized
 */
router.put('/preferences', updatePreferences);

/**
 * @swagger
 * /api/notifications/telegram/setup:
 *   get:
 *     summary: Get Telegram bot setup instructions
 *     description: >
 *       Returns the bot username and step-by-step instructions for connecting Telegram.
 *
 *       **How to connect Telegram:**
 *       1. Search `@WebMonitors_bot` on Telegram
 *       2. Send `/start` to the bot
 *       3. The bot replies with your Chat ID
 *       4. Submit that Chat ID via `POST /api/notifications/telegram/connect`
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Setup instructions and bot info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     botUsername:
 *                       type: string
 *                       example: "@WebMonitors_bot"
 *                     botLink:
 *                       type: string
 *                       example: "https://t.me/WebMonitors_bot"
 *                     steps:
 *                       type: array
 *                       items: { type: string }
 *                     alreadyConnected: { type: boolean }
 *                     currentChatId: { type: string }
 *       503:
 *         description: Telegram not configured by admin
 */
router.get('/telegram/setup', getTelegramSetup);

/**
 * @swagger
 * /api/notifications/telegram/connect:
 *   post:
 *     summary: Connect Telegram account using Chat ID
 *     description: >
 *       Saves the user's Telegram Chat ID and sends a verification message to confirm.
 *       Get your Chat ID by messaging `@WebMonitors_bot` on Telegram.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [chatId]
 *             properties:
 *               chatId:
 *                 type: string
 *                 description: Your Telegram Chat ID (numeric)
 *                 example: "899961701"
 *     responses:
 *       200:
 *         description: Telegram connected — verification message sent
 *       400:
 *         description: Invalid or missing Chat ID
 *       503:
 *         description: Could not send verification message to Telegram
 */
router.post('/telegram/connect', connectTelegram);

/**
 * @swagger
 * /api/notifications/telegram/disconnect:
 *   delete:
 *     summary: Disconnect Telegram account
 *     description: Removes the stored Chat ID and disables Telegram notifications.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Telegram disconnected
 *       401:
 *         description: Unauthorized
 */
router.delete('/telegram/disconnect', disconnectTelegram);

/**
 * @swagger
 * /api/notifications/test:
 *   post:
 *     summary: Send a test notification (email + Telegram)
 *     description: >
 *       Sends a test notification on all enabled channels.
 *       Useful to verify that email and Telegram are correctly configured.
 *       Only monitoring-type events are sent to Telegram (OTP never goes to Telegram).
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventType:
 *                 type: string
 *                 enum: [SITE_DOWN, SITE_UP, PLAN_ACTIVATED, PLAN_EXPIRING]
 *                 default: SITE_DOWN
 *                 description: Which notification template to test
 *     responses:
 *       200:
 *         description: Test notification sent
 *       401:
 *         description: Unauthorized
 */
router.post('/test', sendTestNotification);

module.exports = router;
