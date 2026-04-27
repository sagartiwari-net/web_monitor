/**
 * @file audit.service.js
 * @description Google PageSpeed Insights API integration.
 *
 * Calls the PageSpeed API and returns a clean, structured audit result
 * that maps directly to the Monitor.seoAudit embedded schema.
 *
 * Return shape (maps to Monitor.seoAudit schema fields):
 * {
 *   perfScore: 0-100,
 *   seoScore: 0-100,
 *   accessScore: 0-100,
 *   bestPracticesScore: 0-100,
 *   lcp: ms, fcp: ms, ttfb: ms,
 *   fetchedAt: Date    ← matches schema field name
 * }
 *
 * Error handling: Returns null on failure, never throws.
 */

const axios = require('axios');

const toScore = (raw) => (raw == null ? null : Math.round(raw * 100));

const extractMs = (audits, key) => {
  try {
    const value = audits[key]?.numericValue;
    return value != null ? Math.round(value) : null;
  } catch {
    return null;
  }
};

const runAudit = async (url) => {
  try {
    const apiUrl = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

    // PageSpeed API needs categories as REPEATED query params (not array):
    // ?category=PERFORMANCE&category=SEO&category=ACCESSIBILITY&category=BEST_PRACTICES
    // We build the full URL manually to ensure correct format
    const categories = ['PERFORMANCE', 'SEO', 'ACCESSIBILITY', 'BEST_PRACTICES'];
    const catParams = categories.map((c) => 'category=' + c).join('&');
    const fullUrl = `${apiUrl}?url=${encodeURIComponent(url)}&key=${process.env.PAGESPEED_API_KEY}&strategy=mobile&${catParams}`;

    const response = await axios.get(fullUrl, { timeout: 60000 });
    const data = response.data;

    const cats = data.lighthouseResult?.categories;
    const audits = data.lighthouseResult?.audits;

    if (!cats || !audits) {
      console.error('❌ Audit: Unexpected PageSpeed response for', url);
      return null;
    }

    return {
      perfScore:          toScore(cats?.performance?.score),
      seoScore:           toScore(cats?.seo?.score),
      accessScore:        toScore(cats?.accessibility?.score),
      bestPracticesScore: toScore(cats['best-practices']?.score),
      lcp:  extractMs(audits, 'largest-contentful-paint'),
      fcp:  extractMs(audits, 'first-contentful-paint'),
      ttfb: extractMs(audits, 'server-response-time'),
      fetchedAt: new Date(), // matches Monitor.seoAudit.fetchedAt schema field
    };

  } catch (error) {
    if (error.response?.status === 400) {
      console.error(`❌ Audit: Bad request for "${url}":`, error.response?.data?.error?.message);
    } else if (error.response?.status === 429) {
      console.error(`❌ Audit: PageSpeed API quota exceeded for "${url}"`);
    } else if (error.code === 'ECONNABORTED') {
      console.error(`❌ Audit: Timeout >60s for "${url}"`);
    } else {
      console.error(`❌ Audit failed for "${url}":`, error.message);
    }
    return null;
  }
};

module.exports = { runAudit };
