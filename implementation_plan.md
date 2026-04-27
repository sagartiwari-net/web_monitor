# Smart Website Monitoring & Intelligence Platform — Implementation Plan

## Project Overview

A SaaS-grade **Website Monitoring + AI Intelligence Platform** built for a hackathon, but designed with production-scalability in mind. Users add their website URLs under plan-based limits. The system auto-pings websites for uptime, runs deep SEO/Performance audits, and uses Gemini AI for root-cause analysis and a context-aware chatbot.

---

---

## 🔁 Mandatory Workflow Rules (Before Any Code)

These rules apply to **every single feature** we implement:

### 1. API Documentation (`API_DOCS.md`)
- Every new endpoint gets documented **immediately** after being built
- Format per endpoint:
  - Method + URL
  - Auth required? (Yes/No)
  - Request body (with field types)
  - Success response (with example JSON)
  - Error responses (with codes)
- Frontend developer should be able to integrate **without asking a single question**

### 2. Tech Documentation (`/docs/` folder)
- Every new technology/library we add gets its own `docs/<tech-name>.md`
- Format:
  - What is it?
  - Why are we using it specifically in this project?
  - What problem does it solve?
  - How is it configured/used here?
- This creates a living knowledge base of every architectural decision

### 3. Git Backup Workflow
- **After every feature** (not just at end of day): `git add . && git commit && git push`
- Commit message format: `feat: <feature-name>` / `docs: <doc-name>` / `fix: <issue>`
- We never leave untracked work for more than one feature at a time
- Remote: `https://github.com/sagartiwari-net/web_monitor.git` (branch: `main`)

---

## 🗂️ Phase 0 — Database Schema Design

This is our foundation. Every other feature depends on these models being correct.

---

### 1. `User` Model

Stores authentication, role, plan info, and usage counters.

| Field | Type | Notes |
|---|---|---|
| `name` | String | Display name |
| `email` | String | Unique, indexed |
| `password` | String | bcrypt hashed |
| `role` | Enum | `user` \| `admin` |
| `plan.type` | Enum | `basic` \| `pro` \| `elite` \| `free` |
| `plan.status` | Enum | `inactive` \| `pending` \| `active` \| `expired` |
| `plan.siteLimit` | Number | Max monitors allowed (3/5/15) |
| `plan.activatedAt` | Date | When admin approved |
| `plan.expiresAt` | Date | Plan expiry |
| `isEmailVerified` | Boolean | For future use |
| `createdAt` | Date | Auto |

**Indexes:** `email` (unique)

---

### 2. `Monitor` Model

Each document = one website a user wants to track.

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId | Ref → User (tenant isolation) |
| `name` | String | Friendly label, e.g. "My Portfolio" |
| `url` | String | The actual URL to ping |
| `isActive` | Boolean | Toggle monitoring on/off |
| `checkInterval` | Number | Minutes (default: 5) |
| `lastCheckedAt` | Date | Last ping timestamp |
| `currentStatus` | Enum | `UP` \| `DOWN` \| `UNKNOWN` |
| `lastResponseTime` | Number | ms from last ping |
| `lastStatusCode` | Number | HTTP code from last ping |
| `lastAiAnalysis` | String | Cached AI root-cause for last DOWN event |
| `seoAudit` | Object | Latest PageSpeed data (embedded) |
| `seoAudit.lcp` | Number | Largest Contentful Paint (ms) |
| `seoAudit.cls` | Number | Cumulative Layout Shift |
| `seoAudit.inp` | Number | Interaction to Next Paint |
| `seoAudit.perfScore` | Number | 0–100 |
| `seoAudit.seoScore` | Number | 0–100 |
| `seoAudit.accessScore` | Number | 0–100 |
| `seoAudit.fetchedAt` | Date | When audit was last run |
| `createdAt` | Date | Auto |

**Indexes:** `userId` (for fast user-scoped queries), `isActive` (for cron job filtering)

> [!IMPORTANT]
> `seoAudit` is embedded here intentionally (not a separate collection). For a hackathon, this keeps queries simple. In production, we'd move it to a separate `Audit` collection for history tracking.

---

### 3. `Log` Model

High-volume collection. Every ping = one document. Designed for time-series queries.

| Field | Type | Notes |
|---|---|---|
| `monitorId` | ObjectId | Ref → Monitor |
| `userId` | ObjectId | Ref → User (denormalized for fast queries) |
| `status` | Enum | `UP` \| `DOWN` |
| `statusCode` | Number | HTTP response code |
| `responseTime` | Number | ms |
| `error` | String | Error message if ping failed (network error, timeout, etc.) |
| `aiRootCause` | String | Gemini-generated explanation (only for DOWN events) |
| `checkedAt` | Date | Timestamp of this ping |

**Indexes:** `monitorId + checkedAt` (compound, for uptime history charts), `userId + checkedAt` (compound, for dashboard overview), TTL on `checkedAt` (auto-delete logs older than 90 days to control DB size)

> [!TIP]
> The `userId` denormalization (storing it here instead of only in Monitor) avoids a JOIN when building the user dashboard, which could query across all monitors at once.

---

### 4. `Coupon` Model

Admin-created discount codes for the payment flow.

| Field | Type | Notes |
|---|---|---|
| `code` | String | Unique, uppercase, e.g. `LAUNCH50` |
| `discountType` | Enum | `percentage` \| `fixed` |
| `discountValue` | Number | e.g. `50` → 50% off OR ₹50 off |
| `applicablePlans` | Array | Which plans this coupon applies to |
| `maxUses` | Number | Total redemption limit |
| `usedCount` | Number | Current redemption count |
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
| `upiId` | String | Our UPI ID the user paid to |
| `utrNumber` | String | UTR / Transaction ID submitted by user |
| `status` | Enum | `pending` \| `approved` \| `rejected` |
| `adminNote` | String | Optional note by admin on rejection |
| `submittedAt` | Date | When user submitted UTR |
| `verifiedAt` | Date | When admin approved/rejected |
| `verifiedBy` | ObjectId | Ref → User (admin's ID) |

**Indexes:** `userId`, `status`, `utrNumber` (unique, prevents duplicate UTR submissions)

---

## 🏗️ Phase 1 — Project Structure

```
/backend
  /config
    db.js              # Mongoose connection
    env.js             # Centralized env variables
  /models
    User.model.js
    Monitor.model.js
    Log.model.js
    Coupon.model.js
    Payment.model.js
  /middleware
    auth.middleware.js       # JWT verify + tenant isolation
    admin.middleware.js      # Role check for admin routes
    rateLimiter.middleware.js
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
    uptime.service.js        # Ping logic (axios)
    audit.service.js         # PageSpeed API calls
    ai.service.js            # Gemini wrapper
    payment.service.js       # UPI string generation, coupon logic
  /jobs
    uptime.cron.js           # 5-min ping cron
    audit.cron.js            # Daily SEO audit cron
  /utils
    response.util.js         # Standardized API response helpers
    logger.util.js           # Console/file logger
  server.js                  # App entrypoint
```

---

## ⚙️ Phase 2 — Feature Implementation Order

| # | Feature | Dependencies |
|---|---|---|
| 1 | DB Schemas | Nothing |
| 2 | Auth (Signup/Login/JWT) | User model |
| 3 | Monitor CRUD + Plan Limit Enforcement | Auth, User, Monitor |
| 4 | Uptime Cron + Log saving | Monitor, Log |
| 5 | AI Root-Cause on DOWN event | Log, ai.service.js |
| 6 | PageSpeed Audit (manual trigger) | Monitor, audit.service.js |
| 7 | Daily Audit Cron | Audit service |
| 8 | Coupon + Payment flow (UPI) | Coupon, Payment |
| 9 | Admin approval route | Payment, User |
| 10 | AI Chatbot endpoint | ai.service.js, Monitor, Log |

---

## 💰 Plan Pricing Structure

| Plan | Sites | Price | Target |
|---|---|---|---|
| Basic | 3 | ₹ TBD | Freelancers |
| Pro | 5 | ₹ TBD | Small businesses |
| Elite | 15 | ₹ TBD | Agencies |

> [!IMPORTANT]
> **Open Question for Discussion:** What are the exact prices for Basic, Pro, and Elite plans? This affects the `Payment` model's amount validation and the UPI QR generation.

---

## 🤖 AI Integration Strategy

### Root-Cause Analysis (Automated)
- Triggered **inside the uptime cron** when `status === 'DOWN'`
- Sends: URL + HTTP status code + error message to Gemini
- System Prompt: *"You are a web reliability expert. Given this downtime event, explain the likely cause in exactly 2 sentences for a non-technical user."*
- Response saved to `Log.aiRootCause` and also cached in `Monitor.lastAiAnalysis`

### Context-Aware Chatbot
- User sends message to `/api/chat`
- Backend **dynamically builds system prompt** by injecting:
  - User's monitor list + current status
  - Last 5 uptime logs per monitor
  - Latest SEO audit scores
- Gemini responds with full context of the user's actual data

---

## 🔒 Security Considerations

- All routes (except `/auth/*`) protected by `auth.middleware.js`
- Every DB query for monitors/logs scoped to `userId` from JWT — **never trust client-sent userId**
- Admin routes protected by additional `admin.middleware.js` role check
- UTR uniqueness enforced at DB level to prevent payment replay attacks
- Rate limiting on auth endpoints

---

## ❓ Open Questions for Discussion

> [!IMPORTANT]
> **1. Plan Prices:** What are the ₹ prices for Basic/Pro/Elite? Needed for Payment model and UPI generation.

> [!IMPORTANT]
> **2. UPI ID:** What is the UPI ID to generate payment intents to? (e.g., `yourname@upi`)

> [!NOTE]
> **3. Log Retention:** How long do we keep uptime logs? I've suggested 90 days via MongoDB TTL index. Is that fine for the hackathon demo?

> [!NOTE]
> **4. Gemini API Key:** Do you already have a Gemini API key, or do we need to set one up?

> [!NOTE]
> **5. PageSpeed API Key:** Google PageSpeed Insights requires an API key for high quotas. Do you have one?

> [!NOTE]
> **6. Puppeteer:** The original spec mentions Puppeteer as a fallback. For the hackathon, should we skip Puppeteer (it's heavy) and rely purely on Axios for pings? We can add it later.

> [!CAUTION]
> **7. Deployment Target:** Where are we deploying this for the hackathon demo? (Railway, Render, VPS?) This matters for Puppeteer support and cron job reliability.

---

## ✅ Immediate Next Step (Awaiting Approval)

Once you confirm the open questions above, we start with **Phase 0** — writing all 5 Mongoose models with full comments, proper indexing, and TypeScript-style JSDoc annotations.
