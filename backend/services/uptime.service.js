/**
 * @file uptime.service.js
 * @description Pings a URL and returns structured result.
 *
 * This is the core "heartbeat" function. Called by the uptime cron job
 * every 5 minutes for each active monitor.
 *
 * Return shape (always, never throws):
 * {
 *   status: 'UP' | 'DOWN',
 *   statusCode: number | null,
 *   responseTime: number,   // milliseconds
 *   error: string | null,   // network error message (null for UP)
 * }
 *
 * Status logic:
 *   UP   → HTTP response received with status < 500 (even 404 = UP, site is reachable)
 *   DOWN → HTTP >= 500, network error, DNS failure, timeout
 *
 * Why 404 = UP?
 *   A 404 means the server is running and responding. The site is reachable.
 *   A 502/503 or connection refusal means the server itself is down.
 */

const axios = require('axios');

/**
 * Pings a URL and returns the result.
 * @param {string} url - The full URL to ping (e.g. https://example.com)
 * @returns {Promise<{status, statusCode, responseTime, error}>}
 */
const pingUrl = async (url) => {
  const startTime = Date.now();

  try {
    const response = await axios.get(url, {
      timeout: 10000, // 10 seconds max wait time

      // Follow redirects (301, 302) — we care if the final destination is up
      maxRedirects: 5,

      // Don't throw on HTTP errors (4xx, 5xx) — we want to capture the status code
      // axios by default throws on 4xx/5xx, but we handle it ourselves
      validateStatus: () => true,

      // Minimal headers to avoid bot detection issues
      headers: {
        'User-Agent': 'WebMonitor-Bot/1.0 (Uptime Checker)',
      },
    });

    const responseTime = Date.now() - startTime;

    // Treat HTTP >= 500 as DOWN (server errors)
    // Treat HTTP < 500 as UP (even 404 = server is alive)
    const isDown = response.status >= 500;

    return {
      status: isDown ? 'DOWN' : 'UP',
      statusCode: response.status,
      responseTime,
      error: isDown ? `HTTP ${response.status} — Server error` : null,
    };

  } catch (err) {
    // Network-level failures: DNS resolution failure, connection refused, timeout
    const responseTime = Date.now() - startTime;

    // Extract a clean error message
    let errorMessage = err.message;
    if (err.code === 'ECONNREFUSED') errorMessage = 'Connection refused — server may be down';
    if (err.code === 'ENOTFOUND') errorMessage = 'DNS resolution failed — domain not found';
    if (err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') errorMessage = 'Request timed out after 10 seconds';
    if (err.code === 'ECONNRESET') errorMessage = 'Connection reset by server';

    return {
      status: 'DOWN',
      statusCode: err.response?.status || null, // null if no HTTP response at all
      responseTime,
      error: errorMessage,
    };
  }
};

module.exports = { pingUrl };
