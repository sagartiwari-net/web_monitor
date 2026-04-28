/**
 * @file swagger.js
 * @description Swagger/OpenAPI 3.0 configuration.
 *
 * swagger-jsdoc reads JSDoc comments from all route files (./routes/*.js)
 * and builds an OpenAPI specification object.
 *
 * swagger-ui-express serves that spec as an interactive UI at /api-docs.
 *
 * How to add a new endpoint to Swagger:
 * → Add a JSDoc comment block above the route definition in its routes file.
 * → See existing route files for the comment format.
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '🌐 WebMonitor API',
      version: '1.0.0',
      description:
        '**Smart Website Monitoring & Intelligence Platform** — Complete Backend API Reference.\n\n' +
        '## Quick Start\n' +
        '1. Call `POST /api/auth/login` with `demo@webmonitor.com` / `demo1234`\n' +
        '2. Copy the `token` from the response\n' +
        '3. Click **Authorize 🔒** (top right) and paste the token\n' +
        '4. All protected routes will now work\n\n' +
        '## Test Credentials\n' +
        '- **User:** `demo@webmonitor.com` / `demo1234`\n' +
        '- **Admin:** `admin@webmonitor.com` / `admin1234`\n\n' +
        '## Channel Routing\n' +
        '- 🔐 **Email Only:** WELCOME, FORGOT_PASSWORD, EMAIL_VERIFIED, PASSWORD_CHANGED\n' +
        '- 📱 **Email + Telegram:** SITE_DOWN, SITE_UP, PLAN_ACTIVATED, PLAN_EXPIRING, PLAN_EXPIRED, PAYMENT_SUBMITTED, PAYMENT_REJECTED, PLAN_LIMIT',
      contact: {
        name: 'WebMonitor Support',
        email: 'admin@webmonitor.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: '🖥️ Local Development Server',
      },
    ],
    components: {
      securitySchemes: {
        // Defines the "Authorize 🔒" button in Swagger UI
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token (without the "Bearer " prefix). Get it from POST /api/auth/login',
        },
      },
    },
    // Default security for all endpoints — individual routes can override
    security: [],
    tags: [
      { name: 'Auth',            description: '🔐 User registration, login, email verification and password reset' },
      { name: 'Monitors',        description: '📡 Website monitor CRUD — add, edit, delete, pause/resume sites' },
      { name: 'Logs',            description: '📊 Uptime ping history — 5-minute check logs and statistics' },
      { name: 'Audits',          description: '🔍 SEO & PageSpeed audit — Google Lighthouse scores and Core Web Vitals' },
      { name: 'Payments',        description: '💳 UPI payment flow — initiate, submit UTR, view history' },
      { name: 'Chat',            description: '🤖 AI-powered context-aware chatbot — knows your site status in real time' },
      { name: 'Notifications',   description: '🔔 Notification preferences and Telegram bot integration' },
      { name: 'Admin',           description: '⚙️ Admin-only — payments, users, coupons, settings (requires admin role)' },
      { name: 'Email Templates', description: '✉️ Admin — manage 12 custom HTML email templates with live preview' },
      { name: 'Health',          description: '💚 Server health check' },
    ],
  },
  // Read JSDoc comments from all route files
  apis: ['./routes/*.js', './server.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
