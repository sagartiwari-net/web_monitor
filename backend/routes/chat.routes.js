/**
 * @file chat.routes.js
 * @description AI chatbot route — context-aware website monitoring assistant.
 *
 * ALL routes protected by: protect middleware
 *
 *   POST /api/chat   → chat (send a message, get AI response)
 *
 * Rate limiting:
 *   Gemini free tier is generous but chat requests are expensive (large prompts).
 *   We don't add extra rate limiting for hackathon — plan limits act as
 *   a natural cap (more sites = more tokens, but still within free tier).
 *
 * Note on stateless design:
 *   Each request is independent. For multi-turn, the client sends
 *   the conversation history[] array in the request body.
 *   This avoids session storage on the backend.
 */

const express = require('express');
const { body } = require('express-validator');
const { chat } = require('../controllers/chat.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Secure all chat routes
router.use(protect);

// ─── Validation ───────────────────────────────────────────────────────────────
const chatValidation = [
  body('message')
    .notEmpty().withMessage('Message is required')
    .isString().withMessage('Message must be a string')
    .isLength({ max: 1000 }).withMessage('Message cannot exceed 1000 characters'),
];

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Send a message to the AI monitoring assistant
 *     description: >
 *       Context-aware chatbot that knows about your specific websites.
 *       The AI has access to all your monitor statuses, response times,
 *       PageSpeed scores, and recent ping history.
 *
 *       Example questions:
 *       - "Why is my site slow?"
 *       - "Which of my sites has the best SEO score?"
 *       - "Has any site been down recently?"
 *       - "What should I fix on my website first?"
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Why is my main site responding so slowly?"
 *               history:
 *                 type: array
 *                 description: Previous conversation turns for multi-turn chat
 *                 maxItems: 20
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     text:
 *                       type: string
 *     responses:
 *       200:
 *         description: AI response with context metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     reply:
 *                       type: string
 *                       example: "Your site 'Google' is UP with 207ms response time..."
 *                     context:
 *                       type: object
 *                       properties:
 *                         monitorsAnalyzed:
 *                           type: integer
 *                           example: 2
 *                         logsAnalyzed:
 *                           type: integer
 *                           example: 10
 *       400:
 *         description: Message missing or too long
 *       503:
 *         description: AI service temporarily unavailable
 *       401:
 *         description: Unauthorized
 */
router.post('/', chatValidation, chat);

module.exports = router;
