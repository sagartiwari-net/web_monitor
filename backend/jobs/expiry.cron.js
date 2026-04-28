/**
 * @file expiry.cron.js
 * @description Daily cron — checks plan expiry and sends warnings.
 *
 * Runs daily at 01:00 UTC (06:30 AM IST).
 *
 * Two jobs in one cron:
 * 1. EXPIRY WARNING — Find plans expiring in exactly 7 days → send warning email
 * 2. EXPIRE PLANS   — Find active plans past expiresAt → mark as expired + notify
 */

const cron = require('node-cron');
const { User } = require('../models/User.model');
const { notify } = require('../services/notification.service');

const runExpiryCheck = async () => {
  console.log('\n⏰ [Expiry Cron] Starting plan expiry check...');

  try {
    const now = new Date();

    // ── 1. Expire overdue plans ─────────────────────────────────────────────
    const expiredUsers = await User.find({
      'plan.status': 'active',
      'plan.expiresAt': { $lte: now },
    });

    for (const user of expiredUsers) {
      const oldPlan = user.plan.type;
      user.plan.status = 'expired';
      user.plan.type = 'free';
      user.plan.siteLimit = 1;
      await user.save();

      // Notify user
      await notify(user._id, 'PLAN_EXPIRED', { name: user.name, plan: oldPlan });
      console.log(`❌ Plan expired: ${user.email} (${oldPlan} → free)`);
    }

    // ── 2. Send 7-day expiry warnings ───────────────────────────────────────
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const sevenDayStart = new Date(sevenDaysFromNow);
    sevenDayStart.setHours(0, 0, 0, 0);
    const sevenDayEnd = new Date(sevenDaysFromNow);
    sevenDayEnd.setHours(23, 59, 59, 999);

    const expiringUsers = await User.find({
      'plan.status': 'active',
      'plan.expiresAt': { $gte: sevenDayStart, $lte: sevenDayEnd },
    });

    for (const user of expiringUsers) {
      const daysLeft = Math.ceil((user.plan.expiresAt - now) / (1000 * 60 * 60 * 24));
      await notify(user._id, 'PLAN_EXPIRING', {
        name: user.name,
        plan: user.plan.type,
        expiresAt: user.plan.expiresAt,
        daysLeft,
      });
      console.log(`⚠️ Expiry warning sent: ${user.email} (${daysLeft} days left)`);
    }

    console.log(`✅ [Expiry Cron] Done: ${expiredUsers.length} expired, ${expiringUsers.length} warned`);

  } catch (error) {
    console.error('❌ [Expiry Cron] Error:', error.message);
  }
};

const startExpiryCron = () => {
  // Daily at 01:00 UTC (06:30 AM IST)
  cron.schedule('0 1 * * *', runExpiryCheck, { timezone: 'UTC' });
  console.log('⏰ Expiry cron scheduled: daily at 01:00 UTC (06:30 AM IST)');
};

module.exports = { startExpiryCron, runExpiryCheck };
