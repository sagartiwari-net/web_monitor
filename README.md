# 🌐 Smart Website Monitoring & Intelligence Platform

A SaaS-grade website monitoring platform with AI-powered root-cause analysis, SEO audits, and a context-aware chatbot.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Background Jobs | node-cron |
| HTTP Pinging | axios |
| AI Integration | @google/generative-ai (Gemini) |
| Performance Audit | Google PageSpeed Insights API |

## Project Structure

```
web_monitor/
├── backend/
│   ├── config/         # DB connection, env config
│   ├── models/         # Mongoose schemas
│   ├── middleware/     # JWT auth, admin guard, rate limiter
│   ├── routes/         # Express route definitions
│   ├── controllers/    # Request handlers
│   ├── services/       # Core business logic (decoupled)
│   ├── jobs/           # Cron job definitions
│   └── utils/          # Helpers (response, logger)
├── docs/               # Tech documentation (why we use each library)
├── API_DOCS.md         # Full API reference for frontend integration
└── README.md
```

## Plans

| Plan | Sites | Status |
|---|---|---|
| Basic | 3 | ₹ TBD |
| Pro | 5 | ₹ TBD |
| Elite | 15 | ₹ TBD |

## Developer Notes

- Every API endpoint is documented in `API_DOCS.md`
- Every technology choice is explained in `docs/<tech>.md`
- Git backup is taken after every feature (`git add . && git commit && git push`)
