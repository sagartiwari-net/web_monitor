# API Documentation — Web Monitor Platform

> **For Frontend Developers:** Every endpoint is documented here. You should never need to guess a field name, response structure, or error code.

---

## Base URL

```
http://localhost:5000/api
```

---

## Auth Headers

All protected routes require:

```
Authorization: Bearer <jwt_token>
```

---

## Conventions

- All responses are JSON
- Success: `{ success: true, data: {...} }`
- Error: `{ success: false, message: "...", code: "ERROR_CODE" }`
- Timestamps are ISO 8601 strings

---

> 📌 Endpoints will be added here as each feature is built.

