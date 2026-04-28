# 🖥️ Smart Website Monitoring Platform — Full Project Overview

> **Status:** 10/11 Features Complete | Last Updated: 28 April 2026
> **Server:** `http://localhost:8000` | **Swagger Docs:** `http://localhost:8000/api-docs`

---

## 📁 Complete File Structure

```
web_monitor/
└── backend/
    ├── server.js                          ← Entry point, Express app, all routes mounted
    ├── .env                               ← All secrets (never commit)
    ├── .env.example                       ← Template for new developers
    │
    ├── config/
    │   ├── db.js                          ← MongoDB connection (mongoose.connect)
    │   └── swagger.js                     ← Swagger/OpenAPI config for /api-docs
    │
    ├── models/          ← 5 MongoDB schemas (Mongoose)
    │   ├── User.model.js                  ← Users + plan management
    │   ├── Monitor.model.js               ← Websites being monitored
    │   ├── Log.model.js                   ← Uptime ping history (TTL: 90 days)
    │   ├── Payment.model.js               ← UPI payment records
    │   └── Coupon.model.js                ← Discount coupon codes
    │
    ├── middleware/
    │   └── auth.middleware.js             ← protect() + adminOnly() — JWT guard
    │
    ├── controllers/     ← Business logic
    │   ├── auth.controller.js             ← register, login, getMe
    │   ├── monitor.controller.js          ← CRUD + toggle + plan limit check
    │   ├── log.controller.js              ← Ping history + uptime stats
    │   ├── audit.controller.js            ← PageSpeed trigger + result fetch
    │   ├── payment.controller.js          ← Initiate payment, submit UTR, history
    │   └── admin.controller.js            ← Approve/reject, users list, coupon create
    │
    ├── routes/          ← Express routers
    │   ├── auth.routes.js                 ← /api/auth/*
    │   ├── monitor.routes.js              ← /api/monitors/*
    │   ├── log.routes.js                  ← /api/logs/*
    │   ├── audit.routes.js                ← /api/audit/*
    │   ├── payment.routes.js              ← /api/payment/*
    │   └── admin.routes.js                ← /api/admin/*
    │
    ├── services/        ← External API wrappers (pure functions, never throw)
    │   ├── uptime.service.js              ← pingUrl() — axios ping, structured result
    │   ├── ai.service.js                  ← generateRootCause() + chatWithContext()
    │   ├── audit.service.js               ← runAudit() — PageSpeed Insights API
    │   └── payment.service.js             ← validateCoupon(), calculateAmount(), generateUpiString()
    │
    ├── jobs/            ← Background cron jobs
    │   ├── uptime.cron.js                 ← Every 5 min: ping all active monitors
    │   └── audit.cron.js                  ← Daily midnight: PageSpeed audit all monitors
    │
    └── utils/
        └── response.util.js               ← sendSuccess() + sendError() — uniform JSON format
```

---

## 🗄️ Database Models (5 Collections)

### 1. `User` — `users` collection
| Field | Type | Description |
|---|---|---|
| `name` | String | User's display name |
| `email` | String | Unique, lowercase, indexed |
| `password` | String | bcrypt hashed, `select:false` |
| `role` | String | `'user'` or `'admin'` |
| `plan.type` | String | `'free'`, `'basic'`, `'pro'`, `'elite'` |
| `plan.status` | String | `'inactive'`, `'pending'`, `'active'`, `'expired'` |
| `plan.siteLimit` | Number | Max monitors allowed (1/3/5/15) |
| `plan.activatedAt` | Date | When plan was activated |
| `plan.expiresAt` | Date | Plan expiry (30 days from activation) |

**Site limits per plan:**
```
free=1 | basic=3 | pro=5 | elite=15
```

---

### 2. `Monitor` — `monitors` collection
| Field | Type | Description |
|---|---|---|
| `userId` | ObjectId | Owner (tenant isolation key) |
| `name` | String | Friendly label (e.g. "My Portfolio") |
| `url` | String | Full URL with http/https |
| `isActive` | Boolean | Paused = false, cron skips it |
| `checkInterval` | Number | Minutes (default 5, fixed) |
| `currentStatus` | String | `'UP'`, `'DOWN'`, `'UNKNOWN'` |
| `lastCheckedAt` | Date | Timestamp of last ping |
| `lastResponseTime` | Number | ms |
| `lastStatusCode` | Number | HTTP code |
| `lastAiAnalysis` | String | Cached Gemini explanation (DOWN only) |
| `seoAudit.*` | Object | Embedded PageSpeed results |
| `seoAudit.perfScore` | Number | 0-100 |
| `seoAudit.seoScore` | Number | 0-100 |
| `seoAudit.accessScore` | Number | 0-100 |
| `seoAudit.bestPracticesScore` | Number | 0-100 |
| `seoAudit.lcp` | Number | ms (Largest Contentful Paint) |
| `seoAudit.fcp` | Number | ms (First Contentful Paint) |
| `seoAudit.ttfb` | Number | ms (Time to First Byte) |
| `seoAudit.fetchedAt` | Date | When last audit ran |

---

### 3. `Log` — `logs` collection
| Field | Type | Description |
|---|---|---|
| `monitorId` | ObjectId | Which monitor |
| `userId` | ObjectId | Owner (for tenant-isolated queries) |
| `status` | String | `'UP'` or `'DOWN'` |
| `statusCode` | Number | HTTP code |
| `responseTime` | Number | ms |
| `error` | String | Network error message (null for UP) |
| `aiRootCause` | String | Gemini explanation (DOWN only) |
| `checkedAt` | Date | Exact ping time |
> **TTL Index:** Logs auto-deleted after **90 days**

---

### 4. `Payment` — `payments` collection
| Field | Type | Description |
|---|---|---|
| `userId` | ObjectId | Who paid |
| `plan` | String | `'basic'`, `'pro'`, `'elite'` |
| `originalAmount` | Number | Full price before discount (INR) |
| `discountApplied` | Number | Discount amount in INR |
| `finalAmount` | Number | Amount user paid |
| `couponId` | ObjectId | Coupon ref (null if none) |
| `couponCode` | String | Denormalized for audit trail |
| `upiId` | String | Our UPI ID at time of payment |
| `utrNumber` | String | Unique UTR — prevents duplicate submissions |
| `status` | String | `'pending'`, `'approved'`, `'rejected'` |
| `adminNote` | String | Admin's message (rejection reason) |
| `verifiedAt` | Date | Admin action timestamp |
| `verifiedBy` | ObjectId | Admin user ID |

---

### 5. `Coupon` — `coupons` collection
| Field | Type | Description |
|---|---|---|
| `code` | String | Uppercase, unique (e.g. `SAVE30`) |
| `discountType` | String | `'percentage'` or `'fixed'` |
| `discountValue` | Number | % or ₹ amount |
| `applicablePlans` | [String] | Which plans this coupon works on |
| `maxUses` | Number | `null` = unlimited |
| `usedCount` | Number | Atomic $inc on each redemption |
| `validUntil` | Date | `null` = no expiry |
| `isActive` | Boolean | Admin can instantly deactivate |
| `createdBy` | ObjectId | Admin who created it |

---

## 🔌 All API Endpoints

### 🔐 Auth — `/api/auth`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | ❌ No | Register new user |
| `POST` | `/api/auth/login` | ❌ No | Login, get JWT |
| `GET` | `/api/auth/me` | ✅ Yes | Get current user profile |

**Rate limit:** 10 requests / 15 min per IP (on auth endpoints)

---

### 📡 Monitors — `/api/monitors`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/monitors` | ✅ Yes | Add new monitor (checks plan limit) |
| `GET` | `/api/monitors` | ✅ Yes | List all user's monitors + summary stats |
| `GET` | `/api/monitors/:id` | ✅ Yes | Get single monitor |
| `PUT` | `/api/monitors/:id` | ✅ Yes | Update name/url/interval |
| `DELETE` | `/api/monitors/:id` | ✅ Yes | Delete monitor |
| `PATCH` | `/api/monitors/:id/toggle` | ✅ Yes | Pause/resume monitoring |

---

### 📊 Logs — `/api/logs`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/logs/:monitorId` | ✅ Yes | Paginated ping history (`?limit=50&page=1&status=DOWN`) |
| `GET` | `/api/logs/:monitorId/stats` | ✅ Yes | Uptime %, avg/min/max response time, DOWN events (`?days=7`) |

---

### 🔍 Audit — `/api/audit`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/audit/:monitorId` | ✅ Yes | Trigger fresh PageSpeed audit (takes 15-30s) |
| `GET` | `/api/audit/:monitorId` | ✅ Yes | Get last cached audit result |

---

### 💳 Payment — `/api/payment`
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/payment/initiate` | ✅ Yes | Get UPI details + pricing (Step 1) |
| `POST` | `/api/payment/submit-utr` | ✅ Yes | Submit UTR after paying (Step 3) |
| `GET` | `/api/payment/history` | ✅ Yes | All user's payment records |
| `GET` | `/api/payment/status` | ✅ Yes | Current plan + latest payment status |

---

### 👑 Admin — `/api/admin` _(Admin role required)_
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/payments/pending` | ✅ Admin | List all pending payments (FIFO queue) |
| `GET` | `/api/admin/payments` | ✅ Admin | All payments with filter (`?status=pending`) |
| `POST` | `/api/admin/payments/:id/approve` | ✅ Admin | Approve payment → activate user plan |
| `POST` | `/api/admin/payments/:id/reject` | ✅ Admin | Reject payment + optional note |
| `GET` | `/api/admin/users` | ✅ Admin | List all users |
| `POST` | `/api/admin/coupons` | ✅ Admin | Create discount coupon |

---

### 🤖 Chat — `/api/chat` _(Feature 11 — Not Built Yet)_
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/chat` | ✅ Yes | Context-aware AI chatbot |

---

## ⚙️ Services (External API Wrappers)

### `uptime.service.js` → `pingUrl(url)`
- Uses `axios.get()` with 10s timeout
- Returns `{ status, statusCode, responseTime, error }`
- **UP** = HTTP < 500 (even 404 = UP, server is alive)
- **DOWN** = HTTP ≥ 500 or network error (ENOTFOUND, ETIMEDOUT, ECONNREFUSED)
- **Never throws** — always returns structured object

### `ai.service.js` → `generateRootCause(url, statusCode, error)`
- Calls **Gemini 2.5-flash** API
- Returns 2-sentence plain English explanation
- Called automatically by uptime cron when status = DOWN
- Cached on `Monitor.lastAiAnalysis`
- **Never throws** — returns `null` on failure

### `ai.service.js` → `chatWithContext(message, monitorsWithLogs)`
- Injects ALL user's monitor data + recent logs into system prompt
- Gemini answers based on real user data
- Used by Feature 11 (chat endpoint — pending)

### `audit.service.js` → `runAudit(url)`
- Calls **Google PageSpeed Insights v5 API** (mobile strategy)
- Returns `{ perfScore, seoScore, accessScore, bestPracticesScore, lcp, fcp, ttfb, fetchedAt }`
- Builds URL manually for correct repeated `?category=` params
- Timeout: 60 seconds
- **Never throws** — returns `null` on failure

### `payment.service.js`
- `validatePlan(plan)` — checks plan name, returns price
- `validateCoupon(code, plan)` — checks active, not expired, limit not reached, plan eligible
- `calculateAmount(price, coupon)` — handles both `percentage` and `fixed` discount types
- `generateUpiString(amount, plan, userId)` — builds `upi://pay?...` deep link

---

## ⏰ Cron Jobs (Background Automation)

### `uptime.cron.js` — Every 5 Minutes
```
Every 5 min:
  1. Fetch all monitors WHERE isActive = true
  2. Ping each URL in PARALLEL (Promise.allSettled)
  3. Save Log document
  4. Update Monitor: currentStatus, lastCheckedAt, lastResponseTime
  5. If DOWN → call Gemini for root-cause → save to Log.aiRootCause
  6. If UP (was DOWN) → clear Monitor.lastAiAnalysis
```
- **Overlap guard:** If previous run still going, skip next trigger
- **Console output:** 🟢 UP / 🔴 DOWN per monitor

### `audit.cron.js` — Daily at 00:00 UTC (05:30 AM IST)
```
Daily midnight:
  1. Fetch all monitors WHERE isActive = true
  2. Audit each URL SEQUENTIALLY with 2s delay (API quota protection)
  3. Save results to Monitor.seoAudit embedded object
```
- 2-second delay between requests (PageSpeed free quota)

---

## 🛡️ Security Architecture

### Authentication Pattern (PHP-style centralized guard)
```js
// In every route file:
router.use(protect);          // Secures ALL routes below in one line

// Admin routes — double guard:
router.use(protect, adminOnly);
```

### `protect` middleware flow:
1. Extract JWT from `Authorization: Bearer <token>`
2. Verify with `jwt.verify()`
3. Fetch user from DB (not from token payload)
4. Attach to `req.user`
5. Return 401 with code `NO_TOKEN` / `INVALID_TOKEN` / `USER_NOT_FOUND`

### Tenant Isolation — Every DB query includes userId:
```js
// Example — never fetch without userId:
Monitor.findOne({ _id: monitorId, userId: req.user._id })
// If monitor belongs to another user → returns null → 404
// This prevents cross-user data access completely
```

### Data Safety:
- `password` field: `select: false` — never returned in any API response
- UTR: `unique: true` index — prevents payment replay attacks
- Coupon `usedCount`: atomic `$inc` — prevents race conditions

---

## 💰 Payment Flow (Step by Step)

```
Step 1: POST /api/payment/initiate
        User: { plan: 'pro', couponCode: 'SAVE30' }
        Server: Validate plan → Validate coupon → Calculate price
        Response: { upiId, upiString, originalAmount: 599, finalAmount: 419 }
        (NO DB record created yet)

Step 2: User opens UPI app (GPay/PhonePe) → pays ₹419 → gets UTR number

Step 3: POST /api/payment/submit-utr
        User: { plan: 'pro', utrNumber: 'UTR123456789012' }
        Server: Create Payment(status:'pending') → User.plan.status='pending'
        Response: { payment._id, status: 'pending' }

Step 4: Admin sees it in GET /api/admin/payments/pending
        Admin: POST /api/admin/payments/:id/approve
        Server: Payment.status='approved' → User: plan.type='pro',
                plan.status='active', plan.siteLimit=5, plan.expiresAt=+30days

OR

Step 4b: POST /api/admin/payments/:id/reject { adminNote: 'UTR not found' }
         Server: Payment.status='rejected' → User.plan.status='inactive'
```

---

## 📊 Uniform API Response Format

### Success:
```json
{
  "success": true,
  "message": "Monitors fetched successfully.",
  "data": { "monitors": [...], "summary": {...} },
  "code": null
}
```

### Error:
```json
{
  "success": false,
  "message": "You have reached your plan's site limit.",
  "data": null,
  "code": "PLAN_LIMIT_REACHED"
}
```

### Error Codes Reference:
| Code | When |
|---|---|
| `NO_TOKEN` | Authorization header missing |
| `INVALID_TOKEN` | JWT expired or invalid |
| `USER_NOT_FOUND` | User deleted after token issued |
| `ADMIN_ONLY` | Non-admin hits admin route |
| `VALIDATION_ERROR` | express-validator fails |
| `PLAN_LIMIT_REACHED` | Monitor count >= plan.siteLimit |
| `MONITOR_NOT_FOUND` | Monitor doesn't exist or wrong user |
| `DUPLICATE_UTR` | Same UTR submitted twice |
| `PAYMENT_ALREADY_PENDING` | User already has a pending payment |
| `PAYMENT_NOT_PENDING` | Trying to approve already approved/rejected |
| `INVALID_COUPON` | Coupon expired / limit reached / wrong plan |
| `AUDIT_FAILED` | PageSpeed API returned error |
| `SERVER_ERROR` | Unexpected internal error |

---

## 🌍 Environment Variables

```env
# Database
MONGO_URI=mongodb+srv://...

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# AI
GEMINI_API_KEY=AIza...

# PageSpeed
PAGESPEED_API_KEY=AIza...

# UPI Payment
UPI_ID=9555045411@ybl
UPI_PAYEE_NAME=Web Monitor
PRICE_BASIC=299
PRICE_PRO=599
PRICE_ELITE=1499
```

---

## ✅ Features Status

| # | Feature | Status | Files |
|---|---|---|---|
| Phase 0 | 5 DB Models | ✅ Done | `models/*.model.js` |
| Phase 1 | Server + Config | ✅ Done | `server.js`, `config/`, `utils/` |
| Feature 2 | Auth System | ✅ Done | `auth.controller.js`, `auth.routes.js`, `auth.middleware.js` |
| Feature 3 | Monitor CRUD | ✅ Done | `monitor.controller.js`, `monitor.routes.js` |
| Feature 4 | Uptime Cron + Logs | ✅ Done | `uptime.cron.js`, `uptime.service.js`, `log.controller.js`, `log.routes.js` |
| Feature 5 | AI Root-Cause | ✅ Done | `ai.service.js` (integrated in uptime cron) |
| Feature 6 | PageSpeed Audit API | ✅ Done | `audit.controller.js`, `audit.routes.js`, `audit.service.js` |
| Feature 7 | Daily Audit Cron | ✅ Done | `audit.cron.js` |
| Feature 8 | Coupon + UPI Initiate | ✅ Done | `payment.controller.js`, `payment.routes.js`, `payment.service.js` |
| Feature 9 | UTR Submission | ✅ Done | (same files as Feature 8) |
| Feature 10 | Admin Approval | ✅ Done | `admin.controller.js`, `admin.routes.js` |
| **Feature 11** | **AI Chatbot** | **⏳ Pending** | `chat.controller.js`, `chat.routes.js` (to build) |

---

## 🔗 Git Commits History

```
feat: monitor CRUD — create, read, update, delete, toggle + plan limit + tenant isolation
feat: uptime cron + AI root-cause + log history API — Feature 4+5 complete
feat: PageSpeed audit — manual trigger + daily cron — Feature 6+7 complete
feat: coupon + UPI payment + admin approval — Feature 8+9+10 complete
```

---

## 📌 What's Left: Feature 11 — AI Chatbot

**Files to build:**
- `controllers/chat.controller.js`
- `routes/chat.routes.js`

**How it works:**
1. User asks: "Why is my site slow?" 
2. Backend fetches all user's monitors + last 5 logs each
3. Injects this real data into Gemini's system prompt
4. Gemini answers based on actual website health data
5. Response returned to user

**Endpoint:** `POST /api/chat` with body `{ message: "why is my site down?" }`
