/**
 * @file audit.cron.js
 * @description Daily PageSpeed audit cron — runs at midnight for all active monitors.
 *
 * ── WHAT THIS DOES EVERY DAY AT MIDNIGHT ────────────────────────────────────
 * 1. Fetch all monitors where isActive === true
 * 2. For each monitor: call audit.service.runAudit()
 * 3. Save results to Monitor.seoAudit
 * 4. Log progress + errors
 *
 * ── TIMING ───────────────────────────────────────────────────────────────────
 * Cron: '0 0 * * *' = every day at 00:00 UTC (05:30 AM IST)
 * Frontend converts to user's local timezone for display.
 *
 * ── WHY SEQUENTIAL INSTEAD OF PARALLEL? ─────────────────────────────────────
 * PageSpeed API has a free quota of ~25,000 queries/day.
 * For many users, parallel requests would blow the quota instantly.
 * We process monitors sequentially with a 2-second delay between each.
 * This is slower but respects the API quota.
 * (Upgrade path: use a rate-limited BullMQ queue)
 *
 * ── OVERLAP GUARD ────────────────────────────────────────────────────────────
 * Same guard as uptime cron — prevents double-running if audit takes > 24h
 * (which would only happen with thousands of monitors).
 */

const cron = require('node-cron');
const Monitor = require('../models/Monitor.model');
const { runAudit } = require('../services/audit.service');

// Prevent overlapping runs
let isAuditRunning = false;

/**
 * Adds a delay between API calls to respect rate limits.
 * @param {number} ms - Milliseconds to wait
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Processes audit for a single monitor.
 * @param {object} monitor - Mongoose Monitor document
 */
const processAudit = async (monitor) => {
  console.log(`  🔍 Auditing: "${monitor.name}" (${monitor.url})`);

  const auditResult = await runAudit(monitor.url);

  if (auditResult) {
    await Monitor.findByIdAndUpdate(monitor._id, {
      $set: { seoAudit: auditResult },
    });
    console.log(
      `  ✅ "${monitor.name}" — Perf: ${auditResult.perfScore} | ` +
      `SEO: ${auditResult.seoScore} | ` +
      `Access: ${auditResult.accessScore} | ` +
      `LCP: ${auditResult.lcp}ms`
    );
  } else {
    console.log(`  ⚠️  "${monitor.name}" — Audit failed (skipping)`);
  }
};

// ─── The Daily Cron ───────────────────────────────────────────────────────────
/**
 * Runs every day at midnight UTC (05:30 AM IST).
 */
const startAuditCron = () => {
  cron.schedule('0 0 * * *', async () => {
    if (isAuditRunning) {
      console.log('⚠️  Audit cron skipped — previous run still in progress');
      return;
    }

    isAuditRunning = true;
    const startTime = Date.now();

    try {
      const monitors = await Monitor.find({ isActive: true }).lean();

      if (monitors.length === 0) {
        console.log('ℹ️  Audit cron: No active monitors to audit');
        isAuditRunning = false;
        return;
      }

      console.log(`\n📊 Daily audit cron started — ${monitors.length} monitor(s) to audit`);
      console.log('   (Running sequentially with 2s delay to respect API quota)\n');

      let succeeded = 0;
      let failed = 0;

      for (const monitor of monitors) {
        try {
          await processAudit(monitor);
          succeeded++;
        } catch (err) {
          console.error(`  ❌ Fatal error auditing "${monitor.name}":`, err.message);
          failed++;
        }

        // 2-second delay between requests — respects PageSpeed API rate limits
        if (monitors.indexOf(monitor) < monitors.length - 1) {
          await sleep(2000);
        }
      }

      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(`\n✅ Daily audit complete — ${succeeded} audited, ${failed} failed, took ${elapsed}s\n`);

    } catch (error) {
      console.error('❌ Audit cron fatal error:', error.message);
    } finally {
      isAuditRunning = false;
    }
  });

  console.log('📊 Daily audit cron scheduled: every day at 00:00 UTC (05:30 AM IST)');
};

module.exports = { startAuditCron };
