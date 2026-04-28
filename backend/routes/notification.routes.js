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

router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

router.get('/telegram/setup', getTelegramSetup);
router.post('/telegram/connect', connectTelegram);
router.delete('/telegram/disconnect', disconnectTelegram);

router.post('/test', sendTestNotification);

module.exports = router;
