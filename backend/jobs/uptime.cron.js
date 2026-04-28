/**
 * @file uptime.cron.js
 * @description The Heartbeat — pings all active monitors every 5 minutes.
 *
 * ── WHAT THIS DOES EVERY 5 MINUTES ──────────────────────────────────────────
 * 1. Fetch all monitors where isActive === true
 * 2. Ping each URL via uptime.service.pingUrl()
 * 3. Save a Log document (status, statusCode, responseTime, error)
 * 4. Update Monitor: currentStatus, lastCheckedAt, lastResponseTime, lastStatusCode
 * 5. If status === DOWN:
 *    a. Call ai.service.generateRootCause() for a 2-sentence explanation
 *    b. Save aiRootCause to the Log document
 *    c. Cache it in Monitor.lastAiAnalysis
 * 6. If status === UP (and was previously DOWN):
 *    a. Clear Monitor.lastAiAnalysis (site is back up)
 *
 * ── ARCHITECTURE NOTE ────────────────────────────────────────────────────────
 * Currently using node-cron (monolith). To migrate to BullMQ in future:
 * - Remove cron.schedule() from here
 * - Create a BullMQ Worker that processes jobs from a queue
 * - The pingUrl + log saving logic in this file stays the same
 * - Only the scheduling mechanism changes
 *
 * ── CONCURRENCY ──────────────────────────────────────────────────────────────
 * We use Promise.allSettled() to ping ALL monitors in parallel.
 * This means 100 monitors take the same time as 1 monitor (network bound).
 * A guard prevents the cron from running if a previous run is still in progress.
 */

const cron = require('node-cron');
const Monitor = require('../models/Monitor.model');
const Log = require('../models/Log.model');
const { pingUrl } = require('../services/uptime.service');
const { generateRootCause } = require('../services/ai.service');
const { notify } = require('../services/notification.service');

// Prevent overlapping cron runs (if ping takes > 5 min for many sites)
let isRunning = false;

/**
 * Processes a single monitor: ping → save log → update monitor → AI if DOWN
 * @param {object} monitor - Mongoose Monitor document
 */
const processMonitor = async (monitor) => {
  // 1. Ping the URL
  const pingResult = await pingUrl(monitor.url);

  // 2. Build log data
  const logData = {
    monitorId: monitor._id,
    userId: monitor.userId,
    status: pingResult.status,
    statusCode: pingResult.statusCode,
    responseTime: pingResult.responseTime,
    error: pingResult.error,
    checkedAt: new Date(),
  };

  // 3. If DOWN → get AI root-cause explanation
  if (pingResult.status === 'DOWN') {
    const rootCause = await generateRootCause(
      monitor.url,
      pingResult.statusCode,
      pingResult.error
    );
    if (rootCause) {
      logData.aiRootCause = rootCause;
    }
  }

  // 4. Save the log document
  await Log.create(logData);

  // 5. Update the monitor's cached status fields
  const monitorUpdate = {
    currentStatus: pingResult.status,
    lastCheckedAt: logData.checkedAt,
    lastResponseTime: pingResult.responseTime,
    lastStatusCode: pingResult.statusCode,
  };

  // 6. Sync AI analysis cache on monitor
  if (pingResult.status === 'DOWN' && logData.aiRootCause) {
    monitorUpdate.lastAiAnalysis = logData.aiRootCause;
  } else if (pingResult.status === 'UP') {
    monitorUpdate.lastAiAnalysis = null;
  }

  await Monitor.findByIdAndUpdate(monitor._id, { $set: monitorUpdate });

  // 7. Send notifications ONLY on status CHANGE (not every ping)
  //    This prevents spamming user with emails on every 5-min check
  const previousStatus = monitor.currentStatus; // 'UP' | 'DOWN' | 'UNKNOWN'
  const currentStatus = pingResult.status;

  if (previousStatus !== currentStatus) {
    if (currentStatus === 'DOWN') {
      // Site just went DOWN → alert user
      notify(monitor.userId, 'SITE_DOWN', {
        siteName: monitor.name,
        siteUrl: monitor.url,
        statusCode: pingResult.statusCode,
        responseTime: pingResult.responseTime,
        aiRootCause: logData.aiRootCause || null,
        checkedAt: logData.checkedAt,
      }).catch((e) => console.error('❌ DOWN notify failed:', e.message));

    } else if (currentStatus === 'UP' && previousStatus === 'DOWN') {
      // Site just recovered → recovery alert
      notify(monitor.userId, 'SITE_UP', {
        siteName: monitor.name,
        siteUrl: monitor.url,
        responseTime: pingResult.responseTime,
        checkedAt: logData.checkedAt,
      }).catch((e) => console.error('❌ UP notify failed:', e.message));
    }
  }

  // 8. Console log for visibility during development
  const icon = pingResult.status === 'UP' ? '🟢' : '🔴';
  const changed = previousStatus !== currentStatus ? ' [STATUS CHANGED]' : '';
  console.log(
    `${icon} [${new Date().toISOString()}] ${monitor.name} (${monitor.url}) ` +
    `→ ${pingResult.status} | ${pingResult.responseTime}ms | HTTP ${pingResult.statusCode || 'N/A'}${changed}`
  );
};

// ─── The Cron Job ─────────────────────────────────────────────────────────────
/**
 * Runs every 5 minutes.
 * Cron syntax: '* /5 * * * *' (every 5 minutes)
 */
const startUptimeCron = () => {
  cron.schedule('*/5 * * * *', async () => {
    // Guard: skip if previous run is still in progress
    if (isRunning) {
      console.log('⚠️  Uptime cron skipped — previous run still in progress');
      return;
    }

    isRunning = true;
    const startTime = Date.now();

    try {
      // Fetch ALL active monitors across ALL users
      const monitors = await Monitor.find({ isActive: true }).lean();

      if (monitors.length === 0) {
        console.log('ℹ️  Uptime cron: No active monitors to check');
        isRunning = false;
        return;
      }

      console.log(`\n⏰ Uptime cron started — checking ${monitors.length} monitor(s)...`);

      // Ping all monitors in parallel — Promise.allSettled never throws
      const results = await Promise.allSettled(
        monitors.map((monitor) => processMonitor(monitor))
      );

      // Log any unexpected processing errors (not ping failures — those are handled inside)
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          console.error(`❌ Failed to process monitor "${monitors[i].name}":`, result.reason?.message);
        }
      });

      const elapsed = Date.now() - startTime;
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      console.log(`✅ Uptime cron done — ${succeeded}/${monitors.length} processed in ${elapsed}ms\n`);

    } catch (error) {
      console.error('❌ Uptime cron fatal error:', error.message);
    } finally {
      isRunning = false;
    }
  });

  console.log('⏰ Uptime cron scheduled: every 5 minutes');
};

module.exports = { startUptimeCron };
