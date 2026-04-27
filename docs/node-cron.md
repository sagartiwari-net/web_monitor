# node-cron — Why We Use It

## What is node-cron?

`node-cron` is a task scheduler for Node.js based on GNU cron syntax. It runs functions on a defined time interval (e.g., every 5 minutes, every day at midnight).

## Why node-cron in THIS Project?

| Reason | Detail |
|---|---|
| **Zero infrastructure** | No Redis, no separate worker process. Runs inside the same Node.js server — perfect for a hackathon monolith. |
| **Two cron jobs needed** | (1) Uptime ping every 5 minutes. (2) SEO audit every 24 hours. |
| **Cron syntax** | Simple, well-understood scheduling syntax. |
| **Future-swap ready** | Our cron files just call a `service.js` function. Swapping to BullMQ later = only change the cron file, service stays the same. |

## How We Use It

```js
// jobs/uptime.cron.js
const cron = require('node-cron');
const { runUptimeChecks } = require('../services/uptime.service');

// Every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('[CRON] Running uptime checks...');
  await runUptimeChecks();
});
```

## Cron Schedule Reference

| Schedule | Meaning |
|---|---|
| `*/5 * * * *` | Every 5 minutes |
| `0 0 * * *` | Every day at midnight |
| `0 */6 * * *` | Every 6 hours |

## ⚠️ Important Limitation

`node-cron` runs **in-process**. If the server restarts mid-cron, the job stops. For production:
- Use a process manager (`pm2`) to auto-restart
- Or migrate to **BullMQ + Redis** for persistent job queues

## Alternatives Considered

- **BullMQ** — Production-grade, but requires Redis. Overkill for hackathon.
- **Agenda** — MongoDB-backed scheduler. Good middle ground but adds complexity.
- **cron (npm)** — Very similar to node-cron, less documentation.

## Version Used

```
node-cron: ^3.x
```
