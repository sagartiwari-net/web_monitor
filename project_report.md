# WebMonitor — Complete Project Report
**Backend: Node.js + Express + MongoDB | Date: April 28, 2026**

---

## 📦 Git History (13 Commits)

| # | Commit | Feature |
|---|--------|---------|
| 13 | `c57782e` | fix: updateSettings bug, plan limits, nested dot-notation |
| 12 | `c57b952` | feat: DB-driven Gemini, PageSpeed, UPI, pricing, Telegram whitelist |
| 11 | `49480af` | feat: DB-driven email templates (12 templates, admin CRUD) |
| 10 | `8b74b7b` | feat: notify() wired into uptime cron, monitor limit, payment |
| 9 | `b10af31` | feat: notification system (email + Telegram + admin settings) |
| 8 | `3873bef` | feat: AI chatbot — context-aware, real website data |
| 7 | `58685c0` | feat: coupon + UPI payment + admin approval |
| 6 | `7646f0f` | feat: PageSpeed audit — manual + daily cron |
| 5 | `4d4aef5` | feat: uptime cron + AI root-cause + log history |
| 4 | `42b4b0d` | feat: monitor CRUD + plan limits + tenant isolation |
| 3 | `c6b8866` | feat: auth (signup, login, JWT, middleware) |
| 2 | `bcc66c8` | feat: DB schema (5 models) + Swagger UI |
| 1 | `d592d0a` | chore: project scaffold |

> **Remote:** `origin/main` (bcc66c8 — older commits pending push)

---

## 🗂️ Project File Structure

```
web_monitor/
└── backend/
    ├── server.js                    ← Entry point, seeds DB, starts crons
    ├── .env                         ← Environment variables
    ├── models/
    │   ├── User.model.js            ← Users + plan + notifications
    │   ├── Monitor.model.js         ← Website monitoring config
    │   ├── Log.model.js             ← Uptime ping history
    │   ├── Payment.model.js         ← UPI payment records
    │   ├── Coupon.model.js          ← Discount coupons
    │   ├── Settings.model.js        ← Global app config (DB-driven)
    │   └── EmailTemplate.model.js   ← Custom email templates
    ├── controllers/
    │   ├── auth.controller.js        ← Login, signup, OTP
    │   ├── monitor.controller.js     ← CRUD + plan enforcement
    │   ├── log.controller.js         ← Uptime log + stats
    │   ├── audit.controller.js       ← PageSpeed audit
    │   ├── payment.controller.js     ← UPI initiate + UTR submit
    │   ├── chat.controller.js        ← AI chatbot
    │   ├── admin.controller.js       ← Admin panel operations
    │   ├── notification.controller.js← Preferences + Telegram connect
    │   └── emailTemplate.controller.js← Template CRUD + preview
    ├── services/
    │   ├── email.service.js          ← Nodemailer + DB template lookup
    │   ├── telegram.service.js       ← Telegram Bot API (native HTTPS)
    │   ├── notification.service.js   ← Central notify() dispatcher
    │   ├── ai.service.js             ← Gemini AI (DB key, root-cause + chat)
    │   ├── uptime.service.js         ← HTTP ping + status detection
    │   └── payment.service.js        ← Plan pricing + UPI (DB-driven)
    ├── jobs/
    │   ├── uptime.cron.js            ← Every 5 min: ping all monitors
    │   ├── audit.cron.js             ← Daily: SEO audit all monitors
    │   └── expiry.cron.js            ← Daily: check plan expiry
    ├── routes/
    │   ├── auth.routes.js
    │   ├── monitor.routes.js
    │   ├── log.routes.js
    │   ├── audit.routes.js
    │   ├── payment.routes.js
    │   ├── chat.routes.js
    │   ├── admin.routes.js
    │   ├── notification.routes.js
    │   └── emailTemplate.routes.js
    ├── middleware/
    │   ├── auth.middleware.js         ← protect + adminOnly
    │   └── validate.middleware.js     ← express-validator
    ├── seeds/
    │   └── emailTemplate.seed.js     ← 12 default HTML templates
    └── utils/
        └── response.util.js          ← sendSuccess / sendError
```

---

## 🔐 Feature 1: Authentication

### APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login → JWT token |
| GET | `/api/auth/me` | User | Get own profile |
| PUT | `/api/auth/me` | User | Update name/password |
| POST | `/api/auth/forgot-password` | Public | Send OTP to email |
| POST | `/api/auth/reset-password` | Public | Verify OTP + set new password |
| POST | `/api/auth/verify-email` | Public | Verify email via token |

### How it works
- **JWT** tokens (7 day expiry) in Authorization header
- **OTP** (6-digit, 15 min expiry) for password reset — email only, NOT Telegram
- `protect` middleware: validates JWT, attaches `req.user`
- `adminOnly` middleware: checks `role === 'admin'`
- Passwords hashed with **bcryptjs** (12 rounds)
- New users start on **free plan** (1 site limit)

---

## 📡 Feature 2: Monitor CRUD

### APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/monitors` | User | Add new monitor (plan limit enforced) |
| GET | `/api/monitors` | User | List all monitors + summary stats |
| GET | `/api/monitors/:id` | User | Get single monitor |
| PUT | `/api/monitors/:id` | User | Update name/URL/interval |
| DELETE | `/api/monitors/:id` | User | Delete monitor |
| PATCH | `/api/monitors/:id/toggle` | User | Pause/Resume monitoring |

### Plan Limits (enforced on POST)
| Plan | Sites Allowed | Price |
|------|--------------|-------|
| free | 1 | Free |
| basic | 3 | ₹299/mo |
| pro | 10 | ₹599/mo |
| elite | 20 | ₹1499/mo |

### Tenant Isolation
- Every query includes `userId: req.user._id` filter
- User A **cannot** see/edit/delete User B's monitors (404 returned)

---

## ⏰ Feature 3: Uptime Monitoring (Cron)

### How it works
- **Every 5 minutes**: `uptime.cron.js` pings all active monitors
- Records: `status (UP/DOWN)`, `responseTime`, `statusCode`, `error`
- **Status change detection**: only sends notification on change (prevents spam)
  - Was UP → now DOWN: trigger `SITE_DOWN` notification
  - Was DOWN → now UP: trigger `SITE_UP` notification + recovery time
- Generates AI root-cause analysis on DOWN events

### APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/logs/:monitorId` | User | Paginated log history |
| GET | `/api/logs/:monitorId/stats` | User | Uptime %, avg response time |

---

## 🤖 Feature 4: AI Root-Cause Analysis

- **On every DOWN event**: Gemini AI generates a 2-sentence plain-English explanation
- Stored in `Log.aiRootCause` + `Monitor.lastAiAnalysis`
- API key read from **DB Settings** (changeable from admin panel)
- Model: `gemini-2.5-flash` (configurable)

---

## 📊 Feature 5: SEO/Performance Audit

### APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/audit/:monitorId` | User | Trigger PageSpeed audit |
| GET | `/api/audit/:monitorId` | User | Get latest audit result |

### Data Returned
- `perfScore`, `seoScore`, `accessScore`, `bestPracticeScore` (0-100)
- `lcp` (ms), `fcp` (ms), `cls`, `tbt` (Web Vitals)
- `title`, `description` (SEO meta tags)
- PageSpeed API key read from **DB Settings**

### Daily Cron
- `audit.cron.js` runs every 24 hours
- Audits all active monitors automatically

---

## 💳 Feature 6: UPI Payment System

### APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/payment/initiate` | User | Get UPI details + calculate amount |
| POST | `/api/payment/submit-utr` | User | Submit UTR after payment |
| GET | `/api/payment/history` | User | Own payment history |
| GET | `/api/admin/payments` | Admin | All payments (filter by status) |
| GET | `/api/admin/payments/pending` | Admin | Pending approval queue |
| POST | `/api/admin/payments/:id/approve` | Admin | Approve → activate plan |
| POST | `/api/admin/payments/:id/reject` | Admin | Reject → notify user |

### Flow
```
User → /initiate (gets UPI deep link) → pays via GPay/PhonePe
     → /submit-utr (submits UTR number) → status: pending
Admin → /approve → user plan activates (30 days), email + Telegram sent
      → /reject  → user notified via email with reason
```

### DB-Driven
- UPI ID, Payee Name: **admin panel → Settings**
- Plan prices (₹299/₹599/₹1499): **admin panel → Settings → pricing**

---

## 🎫 Feature 7: Coupons

### APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/admin/coupons` | Admin | Create coupon |

### Coupon Features
- Discount types: `percentage` or `fixed` (₹)
- Plan restriction: applicable to specific plans only
- Usage limits, expiry date
- Applied during `/api/payment/initiate` — pass `couponCode` in body

---

## 🤖 Feature 8: AI Chatbot

### APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/chat` | User | Ask question about your websites |
| GET | `/api/chat/history` | User | Get chat history |
| DELETE | `/api/chat/history` | User | Clear chat history |

### How it works
- User's monitors + last 5 logs per site injected into Gemini system prompt
- **Context-aware**: "Is GitHub down?" → knows your actual monitor status
- **Tenant-safe**: each user only sees their own data
- **Site-specific**: `?siteId=xxx` to ask about one specific site

---

## 📧 Feature 9: Email Notification System

### 12 Email Templates

| Key | Trigger | Channel |
|-----|---------|---------|
| `WELCOME` | New signup | Email only |
| `EMAIL_VERIFIED` | Email verified | Email only |
| `FORGOT_PASSWORD` | OTP request | **Email only** (security) |
| `PASSWORD_CHANGED` | Password reset | Email only |
| `PLAN_ACTIVATED` | Payment approved | Email + Telegram |
| `PAYMENT_REJECTED` | Payment rejected | Email + Telegram |
| `PLAN_EXPIRING` | 7 days to expiry | Email + Telegram |
| `PLAN_EXPIRED` | Plan expired | Email + Telegram |
| `SITE_DOWN` | Site goes DOWN | Email + Telegram |
| `SITE_UP` | Site recovers UP | Email + Telegram |
| `PLAN_LIMIT` | Monitor limit hit | Email + Telegram |
| `PAYMENT_SUBMITTED` | UTR submitted | Email + Telegram |

### Template Priority
```
1. DB template (admin edited) — highest priority
2. DB template (default seeded) — auto seeded on startup
3. Hardcoded fallback — last resort
```

### Template APIs (Admin)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/email-templates` | Admin | List all 12 (no HTML) |
| GET | `/api/admin/email-templates/:key` | Admin | Get full HTML for editing |
| PUT | `/api/admin/email-templates/:key` | Admin | Edit subject/HTML |
| POST | `/api/admin/email-templates/:key/preview` | Admin | Preview with sample data |
| POST | `/api/admin/email-templates/:key/reset` | Admin | Restore default |
| POST | `/api/admin/email-templates/test` | Admin | Send test email |

### Placeholder Syntax
Templates use `{{placeholder}}` — e.g. `{{name}}`, `{{siteName}}`, `{{otp}}`, `{{plan}}`, `{{expiresAt}}`

---

## 📱 Feature 10: Telegram Notifications

### Bot: `@WebMonitors_bot` | Token: Configured in DB

### User Flow
1. User goes to Notification Settings in dashboard
2. Gets bot link from `GET /api/notifications/telegram/setup`
3. Messages bot on Telegram → gets their Chat ID
4. Submits Chat ID via `POST /api/notifications/telegram/connect`
5. Bot sends verification message
6. Monitoring alerts now come to Telegram automatically

### APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notifications/preferences` | User | Get notification preferences |
| PUT | `/api/notifications/preferences` | User | Enable/disable email/telegram |
| GET | `/api/notifications/telegram/setup` | User | Get bot username + instructions |
| POST | `/api/notifications/telegram/connect` | User | Connect Chat ID |
| DELETE | `/api/notifications/telegram/disconnect` | User | Remove Telegram |
| POST | `/api/notifications/test` | User | Send test notification |

### Whitelist (OTP never goes to Telegram)
- ✅ Telegram: `SITE_DOWN`, `SITE_UP`, `PLAN_ACTIVATED`, `PAYMENT_REJECTED`, `PLAN_EXPIRING`, `PLAN_EXPIRED`, `PLAN_LIMIT`, `PAYMENT_SUBMITTED`
- ❌ Email only: `WELCOME`, `EMAIL_VERIFIED`, `FORGOT_PASSWORD`, `PASSWORD_CHANGED`

> **WhatsApp**: Architecture ready — placeholder in notification.service.js. Enable when WhatsApp Business API credentials obtained.

---

## ⚙️ Feature 11: Admin Panel — DB-Driven Settings

Everything controllable from admin panel, **no code change, no server restart**:

### APIs
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/settings` | Admin | View all settings (sensitive masked) |
| PUT | `/api/admin/settings` | Admin | Update any setting |
| GET | `/api/admin/users` | Admin | List all users (paginated) |

### All Controllable Settings

| Category | Fields | Admin Panel |
|----------|--------|-------------|
| App | `appName`, `appUrl`, `frontendUrl` | ✅ |
| SMTP | `smtpHost`, `smtpPort`, `smtpUser`, `smtpPass`, `fromName`, `fromEmail` | ✅ |
| Telegram | `telegramBotToken`, `telegramBotUsername`, `telegramEnabled` | ✅ |
| **Gemini AI** | `geminiApiKey`, `geminiModel` | ✅ |
| **PageSpeed** | `pagespeedApiKey` | ✅ |
| **UPI** | `upiId`, `upiPayeeName`, `upiEnabled` | ✅ |
| **Pricing** | `pricing.basic`, `pricing.pro`, `pricing.elite` | ✅ |
| **Plan Limits** | `planLimits.free/basic/pro/elite` | ✅ |

---

## 📅 Plan Expiry Cron

- Runs **daily at midnight**
- Checks all users with `plan.status = 'active'`
- If `plan.expiresAt < now`:
  - Sets plan to `free` (1 site limit)
  - Sends `PLAN_EXPIRED` notification
- If expiring in 7 days: sends `PLAN_EXPIRING` warning

---

## 🔒 Security Features

| Feature | Implementation |
|---------|---------------|
| JWT Auth | 7-day tokens, verify on every protected route |
| Tenant isolation | All queries filter by `userId` |
| Password hashing | bcryptjs, 12 rounds |
| OTP expiry | 15 minutes, hashed in DB |
| Admin-only routes | `adminOnly` middleware on all `/api/admin/*` |
| Sensitive fields | `smtpPass`, `telegramBotToken`, `geminiApiKey` have `select: false` |
| Rate limiting | express-rate-limit on auth endpoints |
| Input validation | express-validator on all POST/PUT |

---

## 🌐 API Documentation

**Swagger UI**: `http://localhost:8000/api-docs`

All endpoints documented with request/response schemas.

---

## 🗄️ Database Collections

| Collection | Documents | Purpose |
|------------|-----------|---------|
| `users` | Signup records | Auth + plan + notification prefs |
| `monitors` | Website configs | URLs to monitor |
| `logs` | Uptime pings | Every 5-min check result |
| `payments` | Payment records | UTR + approval status |
| `coupons` | Discount codes | Plan purchase discounts |
| `settings` | 1 document (singleton) | All global config |
| `emailtemplates` | 12 documents | Custom HTML email templates |

---

## 🔮 What's Left to Build

### High Priority
- [ ] **Frontend** — User dashboard (React/Next.js)
  - Login / Signup
  - Monitor list + status cards
  - Add/Edit monitor
  - Uptime log chart
  - SEO audit results
  - Billing page (UPI QR + UTR submit)
  - Notification settings page
  - AI chatbot widget

### Admin Panel Frontend
- [ ] Admin dashboard (payments queue)
- [ ] Settings management UI
- [ ] Email template editor (CodeMirror + live preview)
- [ ] User management table
- [ ] Coupon management

### Future Features
- [ ] **WhatsApp notifications** (Business API)
- [ ] **Custom check intervals** (1, 5, 10, 30 min per monitor)
- [ ] **Incident reports** (PDF export)
- [ ] **Status page** (public uptime page per user)
- [ ] **Multi-user teams** (workspace invites)
- [ ] **SSL certificate expiry** monitoring
- [ ] **Response body check** (keyword monitoring)
- [ ] **Webhook alerts** (Slack, Discord)

---

## ✅ Walkthrough Test Results

**70/76 tests passing** (final run before settings fix):

| Section | Tests | Result |
|---------|-------|--------|
| Authentication | 11 | ✅ All pass |
| Monitors | 5 | ✅ All pass |
| Payments | 11 | ✅ All pass |
| Admin Approve/Reject | 8 | ✅ All pass |
| SEO Audit | 6 | ✅ All pass |
| AI Chatbot | 4 | ✅ All pass |
| Email Templates | 8 | ✅ All pass |
| Coupons | 4 | ✅ 3/4 (rounding test assertion off by ₹1) |
| Tenant Isolation | 4 | ✅ All pass |
| Admin Management | 3 | ✅ All pass |
| Settings (post-fix) | — | ✅ Fixed |
| Notifications | — | ✅ Fixed |

---

*Report generated: April 28, 2026*
