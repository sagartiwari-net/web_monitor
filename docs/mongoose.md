# Mongoose — Why We Use It

## What is Mongoose?

Mongoose is an ODM (Object Document Mapper) for MongoDB in Node.js. It adds a schema layer on top of MongoDB's schemaless documents, giving us type safety, validation, and lifecycle hooks.

## Why Mongoose in THIS Project?

| Reason | Detail |
|---|---|
| **Schema enforcement** | MongoDB is schema-less by default. Mongoose enforces field types, required fields, and enums — critical for data integrity in a SaaS. |
| **Built-in validation** | We validate `url`, `email`, enum values at the model level before any DB write. |
| **Middleware hooks** | `pre('save')` hook used to hash passwords automatically on User model. |
| **Indexing API** | We define indexes (compound, TTL, unique) directly in the schema — no separate migration files. |
| **Populate** | Easy reference resolution (e.g., Payment → User, Log → Monitor). |

## How We Use It

```js
// config/db.js
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);

// models/User.model.js
const userSchema = new mongoose.Schema({ ... });
module.exports = mongoose.model('User', userSchema);
```

## Key Patterns in This Project

- **TTL Index on Log** — Auto-deletes ping logs older than 90 days
- **Compound Index on Log** — `{ monitorId, checkedAt }` for fast uptime history queries
- **Unique Index on Payment** — `utrNumber` to prevent duplicate UTR submissions

## Alternatives Considered

- **Native MongoDB Driver** — More performant but no schema layer. Too risky for a fast hackathon build.
- **Prisma (with MongoDB)** — Prisma's MongoDB support is still limited (no transactions, limited indexing).

## Version Used

```
mongoose: ^8.x
```
