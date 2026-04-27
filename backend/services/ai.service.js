/**
 * @file ai.service.js
 * @description Gemini AI wrapper for root-cause analysis and chatbot.
 *
 * Two functions exported:
 *
 * 1. generateRootCause(url, statusCode, errorMsg)
 *    → Called by uptime cron when a monitor goes DOWN
 *    → Returns a 2-sentence explanation for a non-technical user
 *    → Saved to Log.aiRootCause + Monitor.lastAiAnalysis
 *
 * 2. chatWithContext(userMessage, contextData)
 *    → Called by the chat endpoint
 *    → contextData = user's monitors + recent logs injected into system prompt
 *    → Returns Gemini's response string
 *    → Gives the AI full awareness of the user's actual website health data
 *
 * Error handling:
 *    Both functions return null on failure (never throw).
 *    The cron job and chat controller handle null gracefully.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini client once — reused across all calls
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Use gemini-2.5-flash — better free tier quota, fast and capable
const MODEL_NAME = 'gemini-2.5-flash';

// ─── generateRootCause ────────────────────────────────────────────────────────
/**
 * Generates a 2-sentence root-cause explanation for a DOWN event.
 * Called automatically by the uptime cron when status === 'DOWN'.
 *
 * @param {string} url - The URL that went down
 * @param {number|null} statusCode - HTTP status code (null if network error)
 * @param {string|null} errorMsg - Error message from uptime.service
 * @returns {Promise<string|null>} - 2-sentence explanation or null on failure
 */
const generateRootCause = async (url, statusCode, errorMsg) => {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `You are a web reliability expert helping a non-technical user understand why their website is down.

Website URL: ${url}
HTTP Status Code: ${statusCode || 'No response (network error)'}
Error Details: ${errorMsg || 'Unknown error'}

Explain the most likely cause of this downtime in exactly 2 short, simple sentences. 
- Use plain English, no technical jargon.
- First sentence: what likely happened.
- Second sentence: what the website owner should check or do.
- Do NOT add any extra text, greetings, or disclaimers.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    return text || null;

  } catch (error) {
    console.error('❌ AI Root-Cause Error:', error.message);
    return null; // Non-fatal — cron continues without AI analysis
  }
};

// ─── chatWithContext ──────────────────────────────────────────────────────────
/**
 * Context-aware chatbot: answers user questions using their actual website data.
 *
 * The secret: we inject ALL user's monitor data + last 5 logs per site
 * into the system prompt. This gives Gemini complete context without
 * any vector DB or conversation memory system.
 *
 * @param {string} userMessage - The user's question
 * @param {Array} monitorsWithLogs - Array of { monitor, recentLogs } objects
 * @returns {Promise<string|null>} - AI response or null on failure
 */
const chatWithContext = async (userMessage, monitorsWithLogs) => {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Build the context section from real user data
    let contextSection = '';

    if (monitorsWithLogs.length === 0) {
      contextSection = 'The user has no websites being monitored yet.';
    } else {
      contextSection = monitorsWithLogs.map(({ monitor, recentLogs }) => {
        const logSummary = recentLogs.length === 0
          ? 'No ping history yet.'
          : recentLogs.map((log) =>
              `    [${new Date(log.checkedAt).toISOString()}] ${log.status} | ` +
              `${log.responseTime}ms | HTTP ${log.statusCode || 'N/A'}` +
              (log.error ? ` | Error: ${log.error}` : '') +
              (log.aiRootCause ? ` | AI: ${log.aiRootCause}` : '')
            ).join('\n');

        return `
Website: "${monitor.name}" (${monitor.url})
  Current Status: ${monitor.currentStatus}
  Active: ${monitor.isActive ? 'Yes' : 'Paused'}
  Last Checked: ${monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toISOString() : 'Never'}
  Last Response Time: ${monitor.lastResponseTime ? monitor.lastResponseTime + 'ms' : 'N/A'}
  Performance Score: ${monitor.seoAudit?.perfScore ?? 'No audit yet'}
  SEO Score: ${monitor.seoAudit?.seoScore ?? 'No audit yet'}
  Accessibility Score: ${monitor.seoAudit?.accessScore ?? 'No audit yet'}
  LCP: ${monitor.seoAudit?.lcp ? monitor.seoAudit.lcp + 'ms' : 'N/A'}
  Last AI Analysis: ${monitor.lastAiAnalysis || 'None'}
  Recent Ping History (newest first):
${logSummary}`;
      }).join('\n\n---\n');
    }

    const systemPrompt = `You are an intelligent website monitoring assistant. You have real-time access to the user's website health data shown below.

IMPORTANT RULES:
- Answer ONLY based on the data provided. Do not make up information.
- If data is unavailable (null/N/A), say so honestly.
- Be concise, helpful, and friendly.
- If the user asks about a site not in the list, say you don't have data for it.
- Suggest actionable steps when problems are detected.

=== USER'S WEBSITE DATA ===
${contextSection}
=== END OF DATA ===

Now answer the user's question based on this data.`;

    // Build the full prompt with system context + user message
    const fullPrompt = `${systemPrompt}\n\nUser's Question: ${userMessage}`;

    const result = await model.generateContent(fullPrompt);
    const text = result.response.text().trim();

    return text || null;

  } catch (error) {
    console.error('❌ AI Chat Error:', error.message);
    return null;
  }
};

module.exports = { generateRootCause, chatWithContext };
