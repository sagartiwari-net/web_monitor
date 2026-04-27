# axios — Why We Use It

## What is axios?

Axios is a promise-based HTTP client for Node.js and browsers. We use it to make outbound HTTP requests — specifically to ping user websites and call the Google PageSpeed Insights API.

## Why axios in THIS Project?

| Reason | Detail |
|---|---|
| **Uptime pinging** | We send a `GET` request to each user's website URL and measure response time + HTTP status code. |
| **PageSpeed API** | We call `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=...` and parse the response. |
| **Timeout control** | `axios` lets us set a request timeout (e.g., 10 seconds). If a site doesn't respond → it's DOWN. |
| **Error interception** | axios errors contain `.response.status` for HTTP errors or no `.response` for network errors (DNS fail, refused connection). |
| **Response time measurement** | We wrap requests with `Date.now()` before and after to calculate ping latency in ms. |

## How We Use It — Uptime Ping Pattern

```js
// services/uptime.service.js
const axios = require('axios');

async function pingUrl(url) {
  const start = Date.now();
  try {
    const response = await axios.get(url, {
      timeout: 10000,                   // 10 second timeout
      validateStatus: () => true,       // Don't throw on 4xx/5xx — we want to log them
    });
    const responseTime = Date.now() - start;
    return {
      status: response.status < 500 ? 'UP' : 'DOWN',
      statusCode: response.status,
      responseTime,
      error: null,
    };
  } catch (err) {
    return {
      status: 'DOWN',
      statusCode: null,
      responseTime: Date.now() - start,
      error: err.message,   // e.g. "ECONNREFUSED", "ETIMEDOUT"
    };
  }
}
```

## Key Options Used

| Option | Value | Purpose |
|---|---|---|
| `timeout` | `10000` (10s) | Mark as DOWN if no response within 10s |
| `validateStatus: () => true` | Always true | Capture all status codes without throwing |

## Alternatives Considered

- **node-fetch** — Lighter, but less feature-rich error handling.
- **got** — Excellent, but slightly more complex API for our use case.
- **Built-in `fetch` (Node 18+)** — Works but lacks timeout control out of the box.

## Version Used

```
axios: ^1.x
```
