# Express.js — Why We Use It

## What is Express.js?

Express.js is a minimal, unopinionated web framework for Node.js. It provides a thin layer over Node's built-in `http` module to handle routing, middleware, and request/response management.

## Why Express.js in THIS Project?

| Reason | Detail |
|---|---|
| **Speed of development** | Hackathon project — we need to build fast. Express has near-zero boilerplate. |
| **Middleware ecosystem** | We use `cors`, `express-rate-limit`, `express-validator` — all designed for Express. |
| **Familiarity** | Widest adoption in MERN stack; best community support for debugging. |
| **No opinion on architecture** | We can design our own modular folder structure (controllers/services/routes pattern). |

## How We Use It

```js
// server.js
const express = require('express');
const app = express();

app.use(express.json());         // Parse JSON request bodies
app.use('/api/auth', authRoutes);
app.use('/api/monitors', monitorRoutes);
```

## Alternatives Considered

- **Fastify** — Faster, but less middleware compatibility. Not worth the switch for a hackathon.
- **Hono** — Edge-optimized, overkill for this use case.

## Version Used

```
express: ^4.18.x
```
