/**
 * @file server.js
 * @description Main application entrypoint.
 *
 * Startup sequence:
 * 1. Load environment variables (dotenv)
 * 2. Connect to MongoDB
 * 3. Initialize Express app with middleware
 * 4. Mount routes
 * 5. Mount Swagger UI at /api-docs
 * 6. Start HTTP server
 * 7. Start cron jobs (after server is ready)
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');

const connectDB = require('./config/db');
const swaggerSpec = require('./config/swagger');
const { sendSuccess, sendError } = require('./utils/response.util');

// ─── Initialize Express ────────────────────────────────────────────────────────
const app = express();

// ─── Global Middleware ─────────────────────────────────────────────────────────

// Parse JSON request bodies
app.use(express.json({ limit: '10kb' })); // Limit body size for security

// CORS — Allow frontend to communicate with this backend
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*', // Set FRONTEND_URL in .env for production
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate Limiting — Prevent brute-force attacks on auth routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per IP per 15 minutes
  message: { success: false, message: 'Too many requests, please try again later.', data: null },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// ─── Swagger UI ────────────────────────────────────────────────────────────────
/**
 * Interactive API documentation + testing UI.
 * Access at: http://localhost:5000/api-docs
 *
 * Features:
 * - Click any endpoint to expand it
 * - Click "Try it out" → fill fields → "Execute" to test
 * - Click "Authorize 🔒" → paste JWT token → all protected routes send it automatically
 */
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: '🌐 Web Monitor API Docs',
    customCss: '.swagger-ui .topbar { display: none }', // Hide the default Swagger topbar
    swaggerOptions: {
      persistAuthorization: true, // Remember JWT token across page refreshes
    },
  })
);

// ─── Health Check Routes ───────────────────────────────────────────────────────

/**
 * @swagger
 * /:
 *   get:
 *     summary: Root — API is alive
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is running
 */
app.get('/', (req, res) => {
  sendSuccess(res, 200, '🌐 Web Monitor API is running', {
    version: '1.0.0',
    docs: '/api-docs',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check — returns server status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 */
app.get('/health', (req, res) => {
  sendSuccess(res, 200, 'Server is healthy', {
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────────
// Add new route files here as they are built.
app.use('/api/auth', require('./routes/auth.routes'));     // ✅ Feature 2 — Auth
app.use('/api/monitors', require('./routes/monitor.routes')); // ✅ Feature 3 — Monitor CRUD
app.use('/api/logs', require('./routes/log.routes'));          // ✅ Feature 4 — Log History
app.use('/api/audit', require('./routes/audit.routes'));       // ✅ Feature 6 — PageSpeed Audit
// app.use('/api/chat', require('./routes/chat.routes'));         // ⏳ Feature 11
// app.use('/api/admin', require('./routes/admin.routes'));       // ⏳ Feature 10

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  sendError(res, 404, `Route ${req.method} ${req.path} not found`, 'ROUTE_NOT_FOUND');
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return sendError(res, 400, messages.join(', '), 'VALIDATION_ERROR');
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return sendError(res, 409, `${field} already exists`, 'DUPLICATE_KEY');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 401, 'Invalid token', 'INVALID_TOKEN');
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 401, 'Token expired', 'TOKEN_EXPIRED');
  }

  // Default server error
  sendError(
    res,
    err.statusCode || 500,
    err.message || 'Internal Server Error',
    'SERVER_ERROR'
  );
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // 1. Connect to database first
  await connectDB();

  // 2. Start HTTP server
  app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 API Docs (Swagger UI): http://localhost:${PORT}/api-docs`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  });

  // 3. Start cron jobs AFTER server is ready
  const { startUptimeCron } = require('./jobs/uptime.cron');
  startUptimeCron(); // ✅ Feature 4+5 — Uptime ping + AI root-cause
  const { startAuditCron } = require('./jobs/audit.cron');
  startAuditCron(); // ✅ Feature 7 — Daily SEO audit cron
};

startServer();
