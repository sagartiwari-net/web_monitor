# Google PageSpeed Insights API — Why We Use It

## What is the PageSpeed Insights API?

Google PageSpeed Insights (PSI) is a free REST API by Google that runs Lighthouse audits on any public URL. It returns Core Web Vitals and Lighthouse scores for both mobile and desktop.

## Why PSI in THIS Project?

| Reason | Detail |
|---|---|
| **Official data source** | Results come from Google's own Lighthouse engine — the same tool used for Google Search ranking signals. |
| **Free** | Up to 25,000 queries/day on the free tier with an API key. |
| **No browser needed** | Unlike running Lighthouse locally (which needs Chrome/Puppeteer), the PSI API handles everything server-side. |
| **Returns all metrics we need** | LCP, CLS, INP, TBT, plus Lighthouse scores for Performance, SEO, Accessibility, Best Practices. |

## API Endpoint

```
GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed
  ?url=<TARGET_URL>
  &key=<API_KEY>
  &strategy=mobile   (or desktop)
```

## Metrics We Extract

| Metric | Field Path in Response | What It Measures |
|---|---|---|
| LCP | `lighthouseResult.audits['largest-contentful-paint'].numericValue` | Loading speed (ms) |
| CLS | `lighthouseResult.audits['cumulative-layout-shift'].numericValue` | Visual stability |
| INP | `lighthouseResult.audits['interaction-to-next-paint'].numericValue` | Interactivity |
| Performance Score | `lighthouseResult.categories.performance.score * 100` | Overall perf (0–100) |
| SEO Score | `lighthouseResult.categories.seo.score * 100` | SEO rating (0–100) |
| Accessibility | `lighthouseResult.categories.accessibility.score * 100` | A11y rating (0–100) |

## How We Use It

```js
// services/audit.service.js
const axios = require('axios');

async function runPageSpeedAudit(url) {
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`;
  const response = await axios.get(apiUrl, {
    params: {
      url,
      key: process.env.PAGESPEED_API_KEY,
      strategy: 'mobile',
    },
    timeout: 60000,   // PSI can take up to 30–60 seconds
  });

  const lhr = response.data.lighthouseResult;
  return {
    lcp: lhr.audits['largest-contentful-paint'].numericValue,
    cls: lhr.audits['cumulative-layout-shift'].numericValue,
    inp: lhr.audits['interaction-to-next-paint']?.numericValue ?? null,
    perfScore: Math.round(lhr.categories.performance.score * 100),
    seoScore: Math.round(lhr.categories.seo.score * 100),
    accessScore: Math.round(lhr.categories.accessibility.score * 100),
    fetchedAt: new Date(),
  };
}
```

## ⚠️ Important Notes

- PSI API can take **30–60 seconds** per URL — never call it synchronously in a user request
- Always call it from the **daily cron job** or as a background trigger
- Results are for the **mobile strategy** by default (affects SEO ranking)

## Alternatives Considered

- **Running Lighthouse locally** — Needs Puppeteer + Chrome. Too heavy for a shared server.
- **WebPageTest API** — More detailed but complex response format. Paid for high usage.

## Version Used

```
No npm package — direct REST API call via axios
API Key required: https://console.cloud.google.com/apis/library/pagespeedonline.googleapis.com
```
