# Smart Website Monitoring & Intelligence Platform — Implementation Plan v2

## Project Overview

A SaaS-grade **Website Monitoring + AI Intelligence Platform** built for a hackathon, but designed with production-scalability in mind. Users add their website URLs under plan-based limits. The system auto-pings websites for uptime, runs deep SEO/Performance audits using Google PageSpeed Insights, and uses Gemini AI for root-cause analysis and a context-aware chatbot. Payments are manual UPI-based with admin approval.

**Role:** Senior MERN Stack Developer + AI Systems Architect  
**My Role:** Backend Lead

---

## 🔁 Mandatory Workflow Rules (Every Feature)

### 1. API Documentation (`API_DOCS.md`)
Every new endpoint gets documented **immediately** after being built:
- Method + URL
- Auth required? (Yes/No)
- Request body (with field types)
- Success response (with example JSON)
- Error responses (with codes)

Frontend developer should be able to integrate **without asking a single question.**

### 2. Tech Documentation (`/docs/` folder)
Every new library/technology gets its own `docs/<tech-name>.md`:
- What is it?
- Why are we using it in this project specifically?
- What problem does it solve?
- How is it configured/used here?

### 3. Git Backup Workflow
- After **every feature** (not just end of day): `git add . && git commit && git push`
- Commit message format: `feat: <feature-name>` / `docs: <doc-name>` / `fix: <issue>`
- Remote: `https://github.com/sagartiwari-net/web_monitor.git` (branch: `main`)

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js + Express.js | HTTP server, routing |
| Database | MongoDB + Mongoose | Data persistence + schema validation |
| Auth | `jsonwebtoken` + `bcryptjs` | JWT tokens + password hashing |
| Cron Jobs | `node-cron` | 5-min uptime cron + daily audit cron |
| HTTP Pinging | `axios` | Pinging monitored URLs |
| Browser | `puppeteer` | Optional: screenshots / JS-rendered checks |
| AI | `@google/generative-ai` | Root-cause analysis + chatbot |
| Audit | Google PageSpeed Insights API (REST) | LCP, CLS, INP, Lighthouse scores |
| Config | `dotenv`, `cors` | Environment + CORS |

### Architecture Note: Monolith → Microservice Path
We are using a **monolith** for the hackathon (single Node.js server + `node-cron`). However, the codebase will be **modular by design**:
- All cron logic lives in `/jobs/` — can be moved to BullMQ Workers later
- All business logic lives in `/services/` — fully decoupled from routes/controllers
- This means: future swap of `node-cron` → `BullMQ + Redis` requires only changes in `/jobs/` layer, nothing else

---

## 🔐 Credentials (Already Configured in `.env`)

| Key | Status |
|---|---|
| `MONGO_URI` | ✅ Set (DB: `web_monitor`) |
| `JWT_SECRET` | ✅ Set |
| `GEMINI_API_KEY` | ✅ Set |
| `PAGESPEED_API_KEY` | ✅ Set |
| `UPI_ID` | ✅ `9555045411@ybl` |
| `UPI_PAYEE_NAME` | ✅ `Web Monitor Platform` |
| `PRICE_BASIC/PRO/ELITE` | ✅ 299 / 599 / 1499 |

---

## 💰 Plan Structure

| Plan | Sites Allowed | Price (INR) |
|---|---|---|
| Free (default) | 1 | ₹0 |
| Basic | 3 | ₹299 |
| Pro | 5 | ₹599 |
| Elite | 15 | ₹1499 |

Plan limits are enforced **server-side only** — never trust the client.

---

## 🗂️ Phase 0 — Database Schema Design

This is our foundation. Every other feature depends on these models being correct. **Write models first, then features.**

---

### 1. `User` Model

Stores authentication, role, plan info, and usage counters.

| Field | Type | Notes |
|---|---|---|
| `name` | String | Display name |
| `email` | String | Unique, indexed |
| `password` | String | bcrypt hashed, `select: false` — never returned in responses |
| `role` | Enum | `user` \| `admin` — default: `user` |
| `plan.type` | Enum | `free` \| `basic` \| `pro` \| `elite` — default: `free` |
| `plan.status` | Enum | `inactive` \| `pending` \| `active` \| `expired` — default: `inactive` |
| `plan.siteLimit` | Number | 1 / 3 / 5 / 15 based on plan |
| `plan.activatedAt` | Date | When admin approved the payment |
| `plan.expiresAt` | Date | Plan expiry (30 days from activation) |
| `isEmailVerified` | Boolean | Future use — default `false` |
| `createdAt` | Date | Auto via timestamps |

**Indexes:** `email` (unique)

> **Note:** `password` field must have `select: false` in Mongoose so it is NEVER accidentally returned in any query. Always use `.select('+password')` explicitly only in login flow.

---

### 2. `Monitor` Model

Each document = one website a user wants to track.

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId | Ref → User. **Tenant isolation key — every query must filter by this.** |
| `name` | String | Friendly label, e.g. "My Portfolio" |
| `url` | String | The actual URL to ping (validated as URL format) |
| `isActive` | Boolean | Toggle monitoring on/off. Cron only fetches `isActive: true` |
| `checkInterval` | Number | Minutes between pings — default: 5 |
| `lastCheckedAt` | Date | Last ping timestamp |
| `currentStatus` | Enum | `UP` \| `DOWN` \| `UNKNOWN` — default: `UNKNOWN` |
| `lastResponseTime` | Number | ms from last ping |
| `lastStatusCode` | Number | HTTP code from last ping (200, 404, 502 etc.) |
| `lastAiAnalysis` | String | Cached Gemini explanation for last DOWN event |
| `seoAudit.lcp` | Number | Largest Contentful Paint (ms) |
| `seoAudit.cls` | Number | Cumulative Layout Shift (unitless) |
| `seoAudit.inp` | Number | Interaction to Next Paint (ms) |
| `seoAudit.perfScore` | Number | Lighthouse Performance (0–100) |
| `seoAudit.seoScore` | Number | Lighthouse SEO (0–100) |
| `seoAudit.accessScore` | Number | Lighthouse Accessibility (0–100) |
| `seoAudit.fetchedAt` | Date | When audit was last run |
| `createdAt` | Date | Auto via timestamps |

**Indexes:** `userId` (tenant scoping), `isActive` (cron job filter)

> **Note:** `seoAudit` is **embedded** (not a separate collection). For the hackathon, this keeps queries simple — one document fetch gives you everything. In production, we'd move it to a separate `Audit` collection for historical trend tracking.

---

### 3. `Log` Model

High-volume collection. Every 5-min ping = one document. Designed for time-series queries.

| Field | Type | Notes |
|---|---|---|
| `monitorId` | ObjectId | Ref → Monitor |
| `userId` | ObjectId | Ref → User — **denormalized** to avoid joins on dashboard queries |
| `status` | Enum | `UP` \| `DOWN` |
| `statusCode` | Number | HTTP response code |
| `responseTime` | Number | ms |
| `error` | String | Network error / timeout message (only on DOWN) |
| `aiRootCause` | String | Gemini-generated explanation (only for DOWN events) |
| `checkedAt` | Date | Timestamp of this ping |

**Indexes:**
- Compound: `monitorId + checkedAt` → fast uptime history charts per site
- Compound: `userId + checkedAt` → fast dashboard overview across all sites
- TTL on `checkedAt`: **auto-delete logs older than 90 days** — controls DB size

> **Tip:** The `userId` denormalization (duplicating it here instead of only having it in Monitor) avoids an extra lookup when building the user's master dashboard which queries across ALL monitors at once.

---

### 4. `Coupon` Model

Admin-created discount codes for the payment flow.

| Field | Type | Notes |
|---|---|---|
| `code` | String | Unique, stored UPPERCASE (e.g. `LAUNCH50`) |
| `discountType` | Enum | `percentage` \| `fixed` |
| `discountValue` | Number | `50` → 50% off OR ₹50 off |
| `applicablePlans` | Array | Which plans this coupon works on (e.g. `['pro', 'elite']`) |
| `maxUses` | Number | Total redemption cap |
| `usedCount` | Number | Current redemption count (auto-incremented on use) |
| `validFrom` | Date | Activation date |
| `validUntil` | Date | Expiry date |
| `isActive` | Boolean | Admin toggle |
| `createdAt` | Date | Auto |

**Indexes:** `code` (unique), `isActive`

---

### 5. `Payment` Model

Tracks manual UPI payment submissions from users.

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId | Ref → User |
| `plan` | Enum | Which plan was purchased (`basic`/`pro`/`elite`) |
| `amount` | Number | Final amount after coupon |
| `originalAmount` | Number | Price before discount |
| `couponId` | ObjectId | Ref → Coupon (nullable) |
| `couponCode` | String | Denormalized for record-keeping |
| `discountApplied` | Number | ₹ value of discount |
| `upiId` | String | Our UPI ID the user paid to (`9555045411@ybl`) |
| `utrNumber` | String | UTR / Transaction ID submitted by user |
| `status` | Enum | `pending` \| `approved` \| `rejected` — default: `pending` |
| `adminNote` | String | Optional note by admin on rejection |
| `submittedAt` | Date | When user submitted UTR |
| `verifiedAt` | Date | When admin approved/rejected |
| `verifiedBy` | ObjectId | Ref → User (admin's user ID) |

**Indexes:** `userId`, `status`, `utrNumber` (unique — prevents duplicate UTR replay attacks)

---

## 🏗️ Phase 1 — Project Structure

```
/backend
  /config
    db.js              # Mongoose connection with error handling
    env.js             # Centralized env variable exports (never use process.env directly in feature files)
  /models
    User.model.js
    Monitor.model.js
    Log.model.js
    Coupon.model.js
    Payment.model.js
  /middleware
    auth.middleware.js       # JWT verify + attach req.user
    admin.middleware.js      # Role check: req.user.role === 'admin'
    rateLimiter.middleware.js # express-rate-limit for auth endpoints
  /routes
    auth.routes.js
    monitor.routes.js
    log.routes.js
    audit.routes.js
    payment.routes.js
    admin.routes.js
    chat.routes.js
  /controllers
    auth.controller.js
    monitor.controller.js
    log.controller.js
    audit.controller.js
    payment.controller.js
    admin.controller.js
    chat.controller.js
  /services
    uptime.service.js        # Ping logic (axios) — returns {status, responseTime, statusCode, error}
    audit.service.js         # PageSpeed API calls — returns structured audit object
    ai.service.js            # Gemini wrapper — rootCause() and chat()
    payment.service.js       # UPI string generation, coupon validation & discount calc
  /jobs
    uptime.cron.js           # 5-min cron: ping all active monitors
    audit.cron.js            # Daily midnight cron: run SEO audit on all active monitors
  /utils
    response.util.js         # Standardized API response helpers: success(), error()
    logger.util.js           # Console/file logger
  server.js                  # App entrypoint: connects DB, registers routes, starts crons
  .env                       # Real credentials — gitignored
  .env.example               # Template with placeholder values — safe to commit
```

---

## ⚙️ Phase 2 — Feature Implementation Order

Each feature is a self-contained unit. Complete → document → commit → move to next.

| # | Feature | Depends On | Key Logic |
|---|---|---|---|
| 1 | DB Schemas (5 models) | Nothing | Mongoose models with indexes + JSDoc |
| 2 | Auth (Signup/Login/JWT) | User model | bcrypt hash, JWT sign/verify, authMiddleware |
| 3 | Monitor CRUD + Plan Limit Enforcement | Auth, User, Monitor | Check `plan.siteLimit` before adding; scope all queries to `req.user._id` |
| 4 | Uptime Cron + Log Saving | Monitor, Log, uptime.service | 5-min cron, axios ping, save Log document |
| 5 | AI Root-Cause on DOWN Events | Log, ai.service | Trigger inside cron only on DOWN, save to `Log.aiRootCause` + `Monitor.lastAiAnalysis` |
| 6 | PageSpeed Audit (Manual Trigger) | Monitor, audit.service | Controller calls PageSpeed API, updates `Monitor.seoAudit` |
| 7 | Daily Audit Cron | audit.service, Monitor | Midnight cron runs audit for all active monitors |
| 8 | Coupon Validation + UPI String Generation | Coupon, payment.service | `/apply-coupon` + return `upi://pay?pa=...` string |
| 9 | Payment Submission (UTR) | Payment, User | User submits UTR → Payment doc created with status `pending` |
| 10 | Admin Approval Route | Payment, User | Admin approves → User plan set to `active`, `siteLimit` updated, `expiresAt` set |
| 11 | AI Chatbot Endpoint | ai.service, Monitor, Log | Fetch user's monitor data + last 5 logs per site → inject into Gemini system prompt |

---

## 🔁 Feature Deep-Dives

### Feature 2 — Authentication

**Signup Flow:**
1. Validate input (name, email, password)
2. Check if email already exists
3. Hash password with `bcryptjs` (saltRounds: 12)
4. Create User with `plan.type: 'free'`, `plan.status: 'inactive'`, `plan.siteLimit: 1`
5. Return JWT token

**Login Flow:**
1. Find user by email using `.select('+password')`
2. `bcrypt.compare(inputPassword, user.password)`
3. If match → sign JWT with `{ id: user._id, role: user.role }`
4. Return token

**authMiddleware:**
1. Extract `Bearer <token>` from `Authorization` header
2. `jwt.verify(token, JWT_SECRET)` → decoded payload
3. Attach `req.user = { _id, role }` — **never trust client-sent userId anywhere**
4. Call `next()`

---

### Feature 4 — Uptime Cron Engine

**`uptime.cron.js`** — runs every 5 minutes:

```
cron.schedule('*/5 * * * *', async () => {
  1. Fetch all monitors where isActive: true AND user plan.status: 'active'
  2. For each monitor: call uptime.service.pingUrl(url)
  3. uptime.service returns: { status, responseTime, statusCode, error }
  4. Save Log document
  5. Update Monitor: currentStatus, lastCheckedAt, lastResponseTime, lastStatusCode
  6. If status === 'DOWN': trigger ai.service.rootCause(url, statusCode, error)
     → Save result to Log.aiRootCause AND Monitor.lastAiAnalysis
})
```

**`uptime.service.js`** ping logic:
- Use `axios.get(url, { timeout: 10000 })`
- Measure response time with `Date.now()` before/after
- `try/catch`: success → `{ status: 'UP', statusCode: res.status, responseTime }`
- `catch` → `{ status: 'DOWN', statusCode: err.response?.status || 0, error: err.message }`

---

### Feature 6 — PageSpeed Audit

**`audit.service.js`** — calls Google PageSpeed Insights REST API:

```
GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed
  ?url=<site_url>
  &key=<PAGESPEED_API_KEY>
  &strategy=mobile
  &category=performance&category=seo&category=accessibility
```

Extracts from response JSON:
- `lighthouseResult.categories.performance.score * 100` → `perfScore`
- `lighthouseResult.categories.seo.score * 100` → `seoScore`
- `lighthouseResult.categories.accessibility.score * 100` → `accessScore`
- `lighthouseResult.audits['largest-contentful-paint'].numericValue` → `lcp`
- `lighthouseResult.audits['cumulative-layout-shift'].numericValue` → `cls`
- `lighthouseResult.audits['interaction-to-next-paint'].numericValue` → `inp`

Updates `Monitor.seoAudit` + `seoAudit.fetchedAt = Date.now()`

- **Manual Trigger:** `POST /api/audit/:monitorId` — calls audit.service immediately, returns fresh data
- **Daily Cron:** `audit.cron.js` — runs at midnight: `cron.schedule('0 0 * * *', ...)`

---

### Feature 8 — Coupon + UPI Payment

**Coupon Validation (`POST /api/payment/apply-coupon`):**
1. Find coupon by `code` (case-insensitive)
2. Check: `isActive`, `validFrom <= now <= validUntil`, `usedCount < maxUses`, plan in `applicablePlans`
3. Calculate discount:
   - `percentage`: `finalAmount = originalAmount - (originalAmount * discountValue / 100)`
   - `fixed`: `finalAmount = originalAmount - discountValue`
4. Return: `{ originalAmount, discountApplied, finalAmount, couponId }`

**UPI String Generation (`POST /api/payment/initiate`):**
```
upiString = `upi://pay?pa=${UPI_ID}&pn=${UPI_PAYEE_NAME}&am=${finalAmount}&tn=${plan}Plan&cu=INR`
```
Return `{ upiString }` — frontend passes this to any QR code library.

**Payment Submission (`POST /api/payment/submit-utr`):**
1. Create `Payment` document with `status: 'pending'`, `utrNumber`, `userId`, `plan`, `amount`
2. Check UTR uniqueness at DB level (unique index will throw duplicate key error)
3. Update `User.plan.status = 'pending'`

---

### Feature 10 — Admin Approval

**`POST /api/admin/approve-payment/:paymentId`** (protected by adminMiddleware):
1. Find Payment document
2. Update: `Payment.status = 'approved'`, `verifiedAt = now`, `verifiedBy = admin._id`
3. Update User:
   - `plan.type` = payment.plan
   - `plan.status = 'active'`
   - `plan.siteLimit` = `{ basic: 3, pro: 5, elite: 15 }[payment.plan]`
   - `plan.activatedAt = now`
   - `plan.expiresAt = now + 30 days`
4. Increment `Coupon.usedCount` if coupon was used

**`POST /api/admin/reject-payment/:paymentId`:**
1. `Payment.status = 'rejected'`, `adminNote = req.body.note`
2. `User.plan.status = 'inactive'`

---

### Feature 11 — AI Context-Aware Chatbot

**`POST /api/chat`** — how context is built:
1. Fetch user's monitors: `Monitor.find({ userId: req.user._id })`
2. For each monitor, fetch last 5 logs: `Log.find({ monitorId }).sort({ checkedAt: -1 }).limit(5)`
3. Build system prompt dynamically:
   ```
   You are a website monitoring AI assistant. The user has the following websites:
   - Site: "My Portfolio" (https://example.com) | Status: UP | Perf Score: 72 | SEO: 85
     Last 5 pings: UP(120ms), UP(118ms), DOWN(0ms - Connection refused), UP(115ms), UP(122ms)
     Last AI Analysis: "Connection refused suggests the web server process crashed..."

   Answer the user's question based ONLY on this real data. Be concise and helpful.
   ```
4. Pass conversation to Gemini with system prompt injected
5. Return Gemini's response

This approach gives the chatbot **perfect context** without any heavy vector DB or memory system.

---

## 🔒 Security Model

| Rule | Implementation |
|---|---|
| All routes protected (except `/api/auth/*`) | `authMiddleware` applied globally in `server.js` |
| Every DB query scoped to `req.user._id` | Never accept `userId` from request body/params |
| Admin routes double-protected | `authMiddleware` + `adminMiddleware` both required |
| UTR replay attacks prevented | Unique index on `Payment.utrNumber` |
| Password never returned | `password` field has `select: false` in schema |
| Rate limiting on auth endpoints | `express-rate-limit` on `/api/auth/*` |
| CORS locked down | Only allow frontend origin in production |

---

## 📋 Packages to Install (First Thing in Terminal)

```bash
# Core
npm install express mongoose dotenv cors

# Auth & Security
npm install jsonwebtoken bcryptjs express-rate-limit

# Automation & API
npm install node-cron axios

# AI
npm install @google/generative-ai

# Optional (screenshots/JS-rendered checks)
npm install puppeteer

# Dev
npm install --save-dev nodemon
```

---

## ✅ All Open Questions — Resolved

| Question | Answer |
|---|---|
| Plan prices? | Basic ₹299, Pro ₹599, Elite ₹1499 ✅ |
| UPI ID? | `9555045411@ybl` ✅ |
| Gemini API key? | Set in `.env` ✅ |
| PageSpeed API key? | Set in `.env` ✅ |
| Log retention? | 90 days TTL — confirmed ✅ |
| Puppeteer? | Optional — skip for now, add as bonus if time permits ✅ |
| Deployment? | TBD — design for Railway/Render (no persistent filesystem dependency) |

---

## 🚀 Immediate Next Step (Awaiting Approval)

**Phase 0 — Write all 5 Mongoose models** with full JSDoc comments, proper indexing, and `timestamps: true`:
1. `User.model.js`
2. `Monitor.model.js`
3. `Log.model.js`
4. `Coupon.model.js`
5. `Payment.model.js`
