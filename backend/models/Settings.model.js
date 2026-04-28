/**
 * @file Settings.model.js
 * @description Global app settings — DB-driven configuration.
 *
 * ── WHY DB-DRIVEN? ────────────────────────────────────────────────────────────
 * Instead of hardcoding SMTP credentials in .env (which requires code redeployment
 * to change), we store them in MongoDB. Admin can update via the admin panel
 * without touching any code or restarting the server.
 *
 * ── SINGLETON PATTERN ────────────────────────────────────────────────────────
 * There is always exactly ONE Settings document.
 * On server start, if no document exists, it is seeded from .env values.
 * Always use: Settings.getSingleton() to read, Settings.updateSettings() to write.
 *
 * ── WHAT IS STORED HERE ──────────────────────────────────────────────────────
 * - SMTP email settings (host, port, user, pass, from name)
 * - Telegram bot token + bot username
 * - WhatsApp placeholder (future)
 * - App name + URL (for email links)
 *
 * ── SECURITY ─────────────────────────────────────────────────────────────────
 * smtpPass and telegramBotToken are sensitive.
 * They are NOT returned in GET /api/admin/settings — only masked versions.
 * The admin must re-enter them to update.
 */

const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    // ── App Identity ──────────────────────────────────────────────────────────
    appName: {
      type: String,
      default: 'WebMonitor',
    },
    appUrl: {
      type: String,
      default: process.env.APP_URL || 'http://localhost:8000',
      // Used in email links (e.g., "Click here to verify your email")
    },
    frontendUrl: {
      type: String,
      default: process.env.FRONTEND_URL || 'http://localhost:3000',
      // Used for "Go to Dashboard" links in emails
    },

    // ── Email / SMTP ──────────────────────────────────────────────────────────
    smtpHost: {
      type: String,
      default: 'smtp.gmail.com',
    },
    smtpPort: {
      type: Number,
      default: 587,
    },
    smtpSecure: {
      type: Boolean,
      default: false, // false for port 587 (STARTTLS), true for port 465 (SSL)
    },
    smtpUser: {
      type: String,
      default: null, // Seeded from EMAIL_USERNAME in .env
    },
    smtpPass: {
      type: String,
      default: null, // Seeded from EMAIL_PASSWORD in .env — never returned in API
      select: false, // Hidden from GET queries by default
    },
    fromName: {
      type: String,
      default: 'WebMonitor',
    },
    fromEmail: {
      type: String,
      default: null, // Usually same as smtpUser
    },
    emailEnabled: {
      type: Boolean,
      default: true, // Master switch — disable all emails at once
    },

    // ── Telegram ──────────────────────────────────────────────────────────────
    telegramBotToken: {
      type: String,
      default: null, // Set by admin from Telegram @BotFather
      select: false, // Hidden from GET queries
    },
    telegramBotUsername: {
      type: String,
      default: null, // e.g. "@WebMonitorBot" — shown to users for setup
    },
    telegramEnabled: {
      type: Boolean,
      default: false, // Only enabled when bot token is set
    },

    // ── WhatsApp (Future) ─────────────────────────────────────────────────────
    whatsappEnabled: {
      type: Boolean,
      default: false,
    },
    whatsappApiKey: {
      type: String,
      default: null,
      select: false,
    },
    whatsappPhoneId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Static Methods ───────────────────────────────────────────────────────────

/**
 * Gets the singleton Settings document.
 * Always use this instead of findOne() directly.
 * @param {boolean} includeSensitive - Include smtpPass and telegramBotToken
 */
settingsSchema.statics.getSingleton = async function (includeSensitive = false) {
  const query = this.findOne({});
  if (includeSensitive) {
    query.select('+smtpPass +telegramBotToken +whatsappApiKey');
  }
  return query.lean();
};

/**
 * Updates settings. Partial update — only provided fields are changed.
 * @param {object} updates - Fields to update
 * @returns {Promise<object>} - Updated settings (without sensitive fields)
 */
settingsSchema.statics.updateSettings = async function (updates) {
  const settings = await this.findOne({});
  if (!settings) throw new Error('Settings not initialized');

  Object.assign(settings, updates);
  await settings.save();

  // Return without sensitive fields
  return this.getSingleton(false);
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
