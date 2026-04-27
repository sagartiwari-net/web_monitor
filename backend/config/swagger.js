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
      title: '🌐 Web Monitor API',
      version: '1.0.0',
      description:
        'Smart Website Monitoring & Intelligence Platform — Backend API. ' +
        'Use the **Authorize** button (top right) to paste your JWT token for protected routes.',
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        // Defines the "Authorize 🔒" button in Swagger UI
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token (without the "Bearer " prefix)',
        },
      },
    },
    // Default security for all endpoints — individual routes can override
    security: [],
    tags: [
      { name: 'Auth', description: 'User registration, login, and profile' },
      { name: 'Monitors', description: 'Website monitor CRUD and status' },
      { name: 'Logs', description: 'Uptime ping history' },
      { name: 'Audits', description: 'SEO & PageSpeed audit results' },
      { name: 'Payments', description: 'UPI payment flow and subscription' },
      { name: 'Coupons', description: 'Discount coupon management' },
      { name: 'Chat', description: 'AI-powered context-aware chatbot' },
      { name: 'Admin', description: 'Admin-only routes (requires admin role)' },
      { name: 'Health', description: 'Server health check' },
    ],
  },
  // Read JSDoc comments from all route files
  apis: ['./routes/*.js', './server.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
