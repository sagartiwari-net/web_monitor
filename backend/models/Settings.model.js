/**
 * @file Settings.model.js
 * @description Global app settings — DB-driven configuration.
 *
 * ── WHY DB-DRIVEN? ────────────────────────────────────────────────────────────
 * Admin changes any setting from the panel — no code change, no restart needed.
 *
 * ── SINGLETON PATTERN ────────────────────────────────────────────────────────
 * Always exactly ONE document. Use getSingleton() to read.
 *
 * ── WHAT IS STORED HERE ──────────────────────────────────────────────────────
 * 1. App identity (name, URLs)
 * 2. SMTP email settings
 * 3. Telegram bot
 * 4. WhatsApp (future)
 * 5. AI — Gemini API key
 * 6. PageSpeed API key
 * 7. UPI payment details
 * 8. Plan pricing (basic, pro, elite)
 */

const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    // ── App Identity ──────────────────────────────────────────────────────────
    appName: { type: String, default: 'WebMonitor' },
    appUrl: { type: String, default: process.env.APP_URL || 'http://localhost:8000' },
    frontendUrl: { type: String, default: process.env.FRONTEND_URL || 'http://localhost:3000' },

    // ── Email / SMTP ──────────────────────────────────────────────────────────
    smtpHost: { type: String, default: 'smtp.gmail.com' },
    smtpPort: { type: Number, default: 587 },
    smtpSecure: { type: Boolean, default: false }, // false=STARTTLS(587), true=SSL(465)
    smtpUser: { type: String, default: null },
    smtpPass: { type: String, default: null, select: false },
    fromName: { type: String, default: 'WebMonitor' },
    fromEmail: { type: String, default: null },
    emailEnabled: { type: Boolean, default: true },

    // ── Telegram ──────────────────────────────────────────────────────────────
    telegramBotToken: { type: String, default: null, select: false },
    telegramBotUsername: { type: String, default: null }, // e.g. '@WebMonitors_bot'
    telegramEnabled: { type: Boolean, default: false },

    // ── WhatsApp (Future) ─────────────────────────────────────────────────────
    whatsappEnabled: { type: Boolean, default: false },
    whatsappApiKey: { type: String, default: null, select: false },
    whatsappPhoneId: { type: String, default: null },

    // ── AI — Gemini ───────────────────────────────────────────────────────────
    // Admin sets this from panel — no .env change needed
    geminiApiKey: {
      type: String,
      default: null,
      select: false, // Sensitive — hidden from GET
    },
    geminiModel: {
      type: String,
      default: 'gemini-2.5-flash',
      // Admin can switch to gemini-1.5-pro etc.
    },

    // ── PageSpeed API ─────────────────────────────────────────────────────────
    pagespeedApiKey: {
      type: String,
      default: null,
      select: false, // Google API key — sensitive
    },

    // ── UPI Payment ───────────────────────────────────────────────────────────
    upiId: {
      type: String,
      default: null,
      // e.g. 'yourname@upi'
    },
    upiPayeeName: {
      type: String,
      default: 'WebMonitor',
      // Shown in UPI apps
    },
    upiEnabled: {
      type: Boolean,
      default: true,
    },

    // ── Plan Pricing (INR) ────────────────────────────────────────────────────
    // Admin can change prices without code deployment
    pricing: {
      basic: { type: Number, default: 299 },   // 3 sites
      pro: { type: Number, default: 599 },     // 5 sites
      elite: { type: Number, default: 1499 },  // 15 sites
    },

    // ── Plan Features (site limits) ───────────────────────────────────────────
    // What each plan includes
    planLimits: {
      free: { type: Number, default: 1 },
      basic: { type: Number, default: 3 },
      pro: { type: Number, default: 5 },
      elite: { type: Number, default: 15 },
    },
  },
  { timestamps: true }
);

// ─── Static Methods ───────────────────────────────────────────────────────────

/**
 * Gets the singleton Settings document.
 * @param {boolean} includeSensitive - Include smtpPass, telegramBotToken, geminiApiKey, pagespeedApiKey
 */
settingsSchema.statics.getSingleton = async function (includeSensitive = false) {
  const query = this.findOne({});
  if (includeSensitive) {
    query.select('+smtpPass +telegramBotToken +whatsappApiKey +geminiApiKey +pagespeedApiKey');
  }
  return query.lean();
};

/**
 * Updates settings. Partial update — only provided fields are changed.
 * @param {object} updates - Fields to update
 */
settingsSchema.statics.updateSettings = async function (updates) {
  // Build $set object with dot notation for nested fields
  // e.g. { pricing: { basic: 299 } } → { 'pricing.basic': 299 }
  const setOps = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Flatten nested object to dot-notation
      for (const [subKey, subVal] of Object.entries(value)) {
        setOps[`${key}.${subKey}`] = subVal;
      }
    } else {
      setOps[key] = value;
    }
  }
  await this.findOneAndUpdate({}, { $set: setOps }, { new: true });
  return this.getSingleton(false);
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
