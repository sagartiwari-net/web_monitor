# JWT (jsonwebtoken) — Why We Use It

## What is JWT?

JSON Web Token is a compact, URL-safe token format used for stateless authentication. A token contains a signed payload (user ID, role) that the server verifies on every request — no session storage needed.

## Why JWT in THIS Project?

| Reason | Detail |
|---|---|
| **Stateless** | No server-side session store. The token itself carries identity. Scales horizontally. |
| **Tenant Isolation** | We embed `userId` and `role` in the token. Every protected route extracts this — we **never trust a client-sent userId**. |
| **Frontend compatibility** | Frontend stores the token in `localStorage` / `httpOnly cookie` and sends it in `Authorization: Bearer <token>`. |
| **Standard** | Works with any frontend (React, Next.js, mobile app) without any changes. |

## How We Use It

```js
// Sign on login
const token = jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

// Verify in middleware
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded; // { id, role }
```

## Tenant Isolation Pattern

```js
// In any controller — ALWAYS use req.user.id, NEVER req.body.userId
const monitors = await Monitor.find({ userId: req.user.id });
```

## Alternatives Considered

- **Sessions (express-session)** — Requires server-side store (Redis). Adds complexity without benefit for an API-first backend.
- **Passport.js** — Overkill. We only need email/password + JWT, not OAuth strategies.

## Version Used

```
jsonwebtoken: ^9.x
bcryptjs: ^2.x   (for password hashing)
```
