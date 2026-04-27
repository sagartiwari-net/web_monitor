# swagger-ui-express + swagger-jsdoc — Why We Use It

## What is Swagger UI?

Swagger UI is an interactive, browser-based API documentation and testing tool. `swagger-jsdoc` reads JSDoc comments in our route files and auto-generates an OpenAPI 3.0 specification. `swagger-ui-express` then renders that spec as a beautiful, clickable UI.

## Why Swagger in THIS Project?

| Reason | Detail |
|---|---|
| **Frontend integration** | Frontend developer can see every endpoint, request body, and response format visually without reading code. |
| **Live API testing** | Click "Try it out" in the UI → enter values → execute — no Postman needed. |
| **Auto-generated from code** | We write JSDoc comments above routes. Swagger reads them automatically. No separate doc file to maintain. |
| **JWT testing built-in** | The "Authorize 🔒" button lets you paste a JWT token and it's sent automatically with every protected request. |

## How We Use It

```
GET http://localhost:5000/api-docs  → Opens the Swagger UI in browser
```

### Setup in server.js

```js
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Web Monitor API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    }
  },
  apis: ['./routes/*.js'],  // Reads JSDoc from all route files
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

### JSDoc Comment Pattern (in route files)

```js
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns JWT token
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginController);
```

## Access URL

```
http://localhost:5000/api-docs
```

## Alternatives Considered

- **Postman Collection** — Manual to maintain. Not embedded in codebase.
- **Insomnia** — Same problem. Separate tool.
- **Redoc** — Read-only. Swagger UI allows live testing.

## Version Used

```
swagger-ui-express: ^5.x
swagger-jsdoc: ^6.x
```
