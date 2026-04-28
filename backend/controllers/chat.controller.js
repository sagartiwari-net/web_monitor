/**
 * @file chat.controller.js
 * @description Context-aware AI chatbot for website monitoring insights.
 *
 * ── HOW IT WORKS ─────────────────────────────────────────────────────────────
 * No vector DB, no complex memory system.
 * Simple but powerful: we inject ALL of the user's real website data
 * into Gemini's system prompt on every request.
 *
 * Flow:
 *   1. User sends: { message: "why is my site slow?" }
 *   2. Fetch all user's monitors (tenant isolated)
 *   3. Fetch last 5 ping logs per monitor
 *   4. Bundle everything → pass to ai.service.chatWithContext()
 *   5. Gemini answers based on their ACTUAL data
 *   6. Return AI response
 *
 * ── WHAT THE AI KNOWS ────────────────────────────────────────────────────────
 * For each monitor the AI sees:
 *   - Current status (UP/DOWN/UNKNOWN)
 *   - Last response time, status code
 *   - PageSpeed scores (performance, SEO, accessibility)
 *   - Core Web Vitals (LCP, FCP, TTFB)
 *   - Last 5 ping history with timestamps
 *   - AI root-cause analysis (if site was DOWN)
 *
 * ── CONTEXT WINDOW MANAGEMENT ────────────────────────────────────────────────
 * We limit to last 5 logs per monitor to keep the prompt size reasonable.
 * Elite plan (15 sites × 5 logs) = ~75 log entries = comfortably within token limits.
 *
 * ── CONVERSATION HISTORY ─────────────────────────────────────────────────────
 * For hackathon: Each request is stateless (no memory between messages).
 * Client sends last few messages in history[] array for multi-turn context.
 * In production: use a conversation storage with TTL.
 */

const Monitor = require('../models/Monitor.model');
const Log = require('../models/Log.model');
const { chatWithContext } = require('../services/ai.service');
const { sendSuccess, sendError } = require('../utils/response.util');

// ─── chat ─────────────────────────────────────────────────────────────────────
/**
 * POST /api/chat
 *
 * Request body:
 * {
 *   message: "why is my main site so slow?",
 *   history: [                         // optional — for multi-turn conversation
 *     { role: "user", text: "hello" },
 *     { role: "assistant", text: "Hi! I can see you have 2 sites..." }
 *   ]
 * }
 *
 * Response:
 * {
 *   reply: "Your site 'Google' is currently UP with a response time of 207ms...",
 *   context: { monitorsAnalyzed: 2, logsAnalyzed: 10 }
 * }
 */
const chat = async (req, res) => {
  const { message, history = [] } = req.body;

  // Validate message
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return sendError(res, 400, 'Message is required.', 'VALIDATION_ERROR');
  }
  if (message.trim().length > 1000) {
    return sendError(res, 400, 'Message cannot exceed 1000 characters.', 'MESSAGE_TOO_LONG');
  }

  // Validate history if provided
  if (!Array.isArray(history)) {
    return sendError(res, 400, 'history must be an array.', 'VALIDATION_ERROR');
  }
  if (history.length > 20) {
    return sendError(res, 400, 'History cannot exceed 20 messages.', 'VALIDATION_ERROR');
  }
  for (const item of history) {
    if (!item.role || !item.text) {
      return sendError(res, 400, 'Each history item must have role and text.', 'VALIDATION_ERROR');
    }
    if (!['user', 'assistant'].includes(item.role)) {
      return sendError(res, 400, 'History role must be user or assistant.', 'VALIDATION_ERROR');
    }
  }

  const trimmedMessage = message.trim();

  try {
    // 1. Fetch all monitors for this user (tenant isolated)
    const monitors = await Monitor.find({ userId: req.user._id }).lean();

    // 2. Fetch last 5 logs for each monitor (in parallel)
    const monitorsWithLogs = await Promise.all(
      monitors.map(async (monitor) => {
        const recentLogs = await Log.find({ monitorId: monitor._id })
          .sort({ checkedAt: -1 })
          .limit(5)
          .lean();

        return { monitor, recentLogs };
      })
    );

    // 3. Build conversation context string if history provided
    //    Prepend recent history to the message for multi-turn support
    let fullMessage = trimmedMessage;
    if (history.length > 0) {
      // Take last 4 exchanges (8 messages) to avoid huge prompts
      const recentHistory = history.slice(-8);
      const historyText = recentHistory
        .map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}`)
        .join('\n');
      fullMessage = `[Previous conversation]\n${historyText}\n\n[Current question]\n${trimmedMessage}`;
    }

    // 4. Call AI service — this is the core intelligence
    const reply = await chatWithContext(fullMessage, monitorsWithLogs);

    if (!reply) {
      return sendError(
        res,
        503,
        'AI service is temporarily unavailable. Please try again in a moment.',
        'AI_UNAVAILABLE'
      );
    }

    // 5. Return response + metadata for frontend
    return sendSuccess(res, 200, 'Chat response generated.', {
      reply,
      context: {
        monitorsAnalyzed: monitors.length,
        logsAnalyzed: monitorsWithLogs.reduce((sum, m) => sum + m.recentLogs.length, 0),
      },
    });

  } catch (error) {
    console.error('❌ Chat Error:', error.message);
    return sendError(res, 500, 'Chat failed. Please try again.', 'SERVER_ERROR');
  }
};

module.exports = { chat };
