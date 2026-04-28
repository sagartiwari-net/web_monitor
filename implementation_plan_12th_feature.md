# Feature 12 — Multi-Channel Notification System

## Overview

Abhi platform pe koi bhi notification nahi hai. Yeh feature add karega:
- **Email** — Nodemailer + Gmail SMTP (signup, password reset, plan events, DOWN alerts)
- **Telegram** — Bot API (same events, user opt-in)
- **WhatsApp** — Structure taiyaar rakho, baad mein implement karenge

---

## Architecture — Notification Orchestrator Pattern

```
Koi bhi event trigger ho (cron, controller, etc.)
           ↓
notification.service.js → notify(userId, eventType, data)
           ↓
    User ke preferences fetch karo
    ├── email enabled?  → email.service.js  → Gmail SMTP
    ├── telegram enabled? → telegram.service.js → Bot API
    └── whatsapp enabled? → whatsapp.service.js → (placeholder)
```

Ek jagah se sabhi channels handle honge. Naye channel add karna = sirf ek new service + ek condition in orchestrator.

---

## User Review Required

> [!IMPORTANT]
> **Gmail SMTP Setup Required**
> Notifications ke liye ek Gmail account chahiye with **App Password** enabled.
> Normal password kaam nahi karega — Gmail account mein 2FA ON karke App Password generate karna hoga.
> `.env` mein add karna hoga: `SMTP_USER`, `SMTP_PASS`

> [!IMPORTANT]
> **Telegram Bot Setup Required**
> Telegram pe @BotFather se ek new bot banana hoga.
> Token milega jo `.env` mein `TELEGRAM_BOT_TOKEN` mein dalna hoga.
> Aapko sirf token dena hoga — baaki sab automatically handle hoga.

> [!NOTE]
> **Email Confirmation Optional Decision**
> Do options hain:
> - **Option A (Strict):** User signup ke baad verify karna padega — tab tak login block
> - **Option B (Soft):** User login kar sakta hai, par banner dikhega "Please verify your email"
> **Recommendation: Option B** — better UX for hackathon demo

---

## Open Questions

> [!WARNING]
> **Q1: Email address kaha se aayega?**
> Kya aapke paas ek Gmail account available hai notifications ke liye? (e.g. `webmonitor.alerts@gmail.com`)

> [!WARNING]
> **Q2: Site DOWN email frequency?**
> Agar ek site baar baar DOWN ho — kya har ping pe email bhejein ya sirf pehli baar?
> **Recommendation:** Sirf pehli DOWN pe email bhejo, recovery pe bhi email bhejo.

---

## New Files To Build

### New Services
```
backend/services/
  ├── email.service.js        [NEW] — Nodemailer wrapper, all email templates
  ├── telegram.service.js     [NEW] — Telegram Bot API wrapper
  ├── whatsapp.service.js     [NEW] — Placeholder (stub only, for future)
  └── notification.service.js [NEW] — Central orchestrator
```

### New Controllers + Routes
```
backend/controllers/
  └── notification.controller.js [NEW] — Telegram connect, preferences update

backend/routes/
  └── notification.routes.js     [NEW] — /api/notifications/*
```

---

## User Model Changes

`User.model.js` mein yeh fields add honge:

```js
// Email Verification
isEmailVerified: { type: Boolean, default: false }
emailVerificationToken: { type: String, default: null, select: false }
emailVerificationExpires: { type: Date, default: null, select: false }

// Password Reset (OTP based)
passwordResetOtp: { type: String, default: null, select: false }
passwordResetExpires: { type: Date, default: null, select: false }

// Telegram
telegramChatId: { type: String, default: null }

// Notification Preferences
notifications: {
  email: { type: Boolean, default: true },
  telegram: { type: Boolean, default: false },
  whatsapp: { type: Boolean, default: false },  // future
  whatsappNumber: { type: String, default: null } // future
}
```

---

## New Auth Endpoints

### Existing auth.routes.js mein add honge:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/auth/verify-email?token=xxx` | Email verify karo (signup ke baad) |
| `GET` | `/api/auth/resend-verification` | Verification email dobara bhejo |
| `POST` | `/api/auth/forgot-password` | OTP email pe bhejo |
| `POST` | `/api/auth/reset-password` | OTP verify karke new password set karo |

---

## New Notification Endpoints

### `/api/notifications/*` (all protected)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notifications/telegram/setup` | Bot ka link + instructions return karo |
| `POST` | `/api/notifications/telegram/connect` | User apna chatId submit kare + verify karo |
| `DELETE` | `/api/notifications/telegram/disconnect` | Telegram disconnect karo |
| `PUT` | `/api/notifications/preferences` | Email/Telegram on/off toggle karo |
| `GET` | `/api/notifications/preferences` | Current notification settings fetch karo |
| `POST` | `/api/notifications/test` | Test notification bhejo (email + telegram) |

---

## Email Templates (sabhi HTML formatted)

| Event | Trigger Point | Subject |
|---|---|---|
| **Welcome + Verify** | `auth.controller.register()` | "Verify your WebMonitor account" |
| **Email Verified** | `GET /verify-email` | "Email verified! Welcome to WebMonitor" |
| **Forgot Password OTP** | `POST /forgot-password` | "Your password reset OTP" |
| **Password Changed** | `POST /reset-password` | "Your password has been changed" |
| **Plan Activated** | `admin.controller.approvePayment()` | "🎉 Your {plan} plan is now active!" |
| **Payment Rejected** | `admin.controller.rejectPayment()` | "Payment could not be verified" |
| **Plan Expiry Warning** | New daily cron (7 days before) | "⚠️ Your plan expires in 7 days" |
| **Plan Expired** | New daily cron (on expiry date) | "Your plan has expired" |
| **Site DOWN Alert** | `uptime.cron.js` (first DOWN) | "🔴 {siteName} is DOWN" |
| **Site Recovered** | `uptime.cron.js` (UP after DOWN) | "🟢 {siteName} is back UP!" |
| **Plan Limit Reached** | `monitor.controller.createMonitor()` | "You've hit your monitor limit" |

---

## Telegram Templates (same events, plain text)

Same events as email, lekin simple text format:
```
🔴 ALERT: Your site "My Portfolio" is DOWN!
URL: https://mysite.com
Time: 28 Apr 2026, 10:45 AM IST
AI Analysis: The server appears to be overloaded...

Check your dashboard: http://localhost:3000/monitors
```

---

## WhatsApp (Placeholder Structure)

`whatsapp.service.js` sirf stub banega:
```js
// Future: Twilio WhatsApp API ya Meta Business API
const sendWhatsApp = async (phoneNumber, message) => {
  // TODO: Implement when WhatsApp Business API is ready
  console.log('[WhatsApp Placeholder]', phoneNumber, message);
  return null;
};
```

User model mein field ready rahega — jab implement karna ho, sirf service fill karni hai.

---

## Integration With Existing Code

### 1. `uptime.cron.js` — DOWN/UP alerts
```
DOWN ho → notify(userId, 'SITE_DOWN', { monitor, log })
     → only if status changed (was UP before, now DOWN)
UP ho (after DOWN) → notify(userId, 'SITE_UP', { monitor })
```

### 2. `auth.controller.js` — Signup + forgot password
```
register() → notify(userId, 'WELCOME', { user })
```

### 3. `admin.controller.js` — Plan events
```
approvePayment() → notify(userId, 'PLAN_ACTIVATED', { plan, expiresAt })
rejectPayment()  → notify(userId, 'PAYMENT_REJECTED', { adminNote })
```

### 4. `monitor.controller.js` — Limit reached
```
createMonitor() plan limit hit → notify(userId, 'PLAN_LIMIT', { currentPlan })
```

### 5. New `expiry.cron.js` — Plan expiry warnings
```
Daily midnight → find users where plan.expiresAt is within 7 days
              → notify(userId, 'PLAN_EXPIRING_SOON', { expiresAt })
Daily midnight → find users where plan.expiresAt < now AND plan.status = 'active'
              → Update plan.status = 'expired'
              → notify(userId, 'PLAN_EXPIRED', {})
```

---

## New Environment Variables Needed

```env
# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourapp@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx   ← Gmail App Password (16 chars)
FROM_EMAIL=WebMonitor <yourapp@gmail.com>

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...   ← From @BotFather

# App URL (for email links)
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
```

---

## Packages To Install

```bash
npm install nodemailer
# Telegram: using native https (no extra package needed)
# Or optionally: npm install node-telegram-bot-api
```

---

## Build Order

```
1. Update User.model.js (add new fields)
2. email.service.js (templates + send function)
3. telegram.service.js (Bot API wrapper)
4. whatsapp.service.js (placeholder)
5. notification.service.js (orchestrator)
6. Auth endpoints: forgot-password, reset-password, verify-email
7. notification.controller.js + notification.routes.js
8. expiry.cron.js (plan expiry warnings)
9. Integrate notify() calls into existing files (cron, controllers)
10. Test all flows end-to-end
```

---

## Verification Plan

### Automated Tests:
- Signup → verification email received (check SMTP log)
- Forgot password → OTP received → password reset successful
- Admin approve payment → plan activated email received
- Submit UTR while site DOWN → DOWN alert email received

### Manual Verification:
- Real email received in Gmail inbox
- Telegram message received on phone
- MongoDB Compass mein User doc check: `isEmailVerified`, `telegramChatId`

---

## Feature Status After This

| # | Feature | Status |
|---|---|---|
| Feature 11 | AI Chatbot | ⏳ (build next after this) |
| **Feature 12** | **Notification System** | **⏳ Planning** |

---

## Summary of New Files (8 files)

| File | Purpose |
|---|---|
| `services/email.service.js` | Nodemailer wrapper + all HTML templates |
| `services/telegram.service.js` | Telegram Bot API |
| `services/whatsapp.service.js` | Placeholder for future |
| `services/notification.service.js` | Central orchestrator |
| `controllers/notification.controller.js` | Telegram connect, preferences |
| `routes/notification.routes.js` | `/api/notifications/*` |
| `jobs/expiry.cron.js` | Daily plan expiry checker |
| `User.model.js` | Modified — new fields |
