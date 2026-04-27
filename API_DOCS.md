# API Documentation — Web Monitor Platform

> **For Frontend Developers:** Every endpoint is documented here. You should never need to guess a field name, response structure, or error code.

---

## Base URL

```
http://localhost:8000/api
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
- Success: `{ success: true, message: "...", data: {...}, code: null }`
- Error: `{ success: false, message: "...", data: null, code: "ERROR_CODE" }`
- Timestamps are ISO 8601 strings

---

## 🔐 Auth Endpoints

### POST `/api/auth/signup`
Register a new user account.

**Auth Required:** No | **Rate Limit:** 10 requests / 15 min per IP

**Request Body:**
```json
{
  "name": "Sagar Tiwari",
  "email": "sagar@example.com",
  "password": "mypassword123"
}
```

**Success `201`:**
```json
{
  "success": true,
  "message": "Account created successfully.",
  "data": {
    "token": "<jwt_token>",
    "user": {
      "_id": "69efe8a4...",
      "name": "Sagar Tiwari",
      "email": "sagar@example.com",
      "role": "user",
      "plan": { "type": "free", "status": "inactive", "siteLimit": 1, "activatedAt": null, "expiresAt": null },
      "isEmailVerified": false,
      "createdAt": "2026-04-27T17:00:00.000Z"
    }
  },
  "code": null
}
```

**Errors:** `VALIDATION_ERROR` (400) | `EMAIL_EXISTS` (409)

---

### POST `/api/auth/login`
Login and get JWT token.

**Auth Required:** No | **Rate Limit:** 10 requests / 15 min per IP

**Request Body:**
```json
{ "email": "sagar@example.com", "password": "mypassword123" }
```

**Success `200`:** Same shape as signup response with `message: "Login successful."`

**Errors:** `VALIDATION_ERROR` (400) | `INVALID_CREDENTIALS` (401)

---

### GET `/api/auth/me`
Get currently logged-in user's profile.

**Auth Required:** Yes

**Success `200`:**
```json
{
  "success": true,
  "message": "Profile fetched successfully.",
  "data": { "user": { "...same user object..." } },
  "code": null
}
```

**Errors:** `NO_TOKEN` (401) | `INVALID_TOKEN` (401) | `TOKEN_EXPIRED` (401) | `USER_NOT_FOUND` (404)

---

> ⏳ More endpoints will be added as features are built (Monitors, Logs, Payments, Chat, Admin).
