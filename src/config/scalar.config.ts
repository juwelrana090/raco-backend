import { DocumentBuilder } from '@nestjs/swagger';

const getServers = () => {
  const port = process.env.PORT || '4000';
  const isDev = process.env.NODE_ENV !== 'production';
  const servers: { url: string; description: string }[] = [];

  if (isDev) {
    servers.push({
      url: `http://localhost:${port}`,
      description: 'Local development',
    });
  }

  const ngrokUrl = process.env.NGROK_URL;
  if (ngrokUrl) {
    servers.push({ url: ngrokUrl, description: 'ngrok (webhook testing)' });
  }

  const prodUrl = process.env.PRODUCTION_URL || 'https://your-backend.com';
  servers.push({ url: prodUrl, description: 'Production' });

  return servers;
};

export const createScalarDocument = () => {
  const builder = new DocumentBuilder()
    .setTitle('Raco E-commerce API')
    .setDescription(
      `
# Raco E-commerce API

E-commerce Ordering & Payment System built with NestJS + Prisma + PostgreSQL.

## Quick Access
- [Postman Collection](/postman) — Import directly into Postman
- [Health & Service Status](/api-info) — System health and services
- [OpenAPI JSON](/api-json) — Raw spec for code generation

## Authentication
JWT Bearer Token required for protected endpoints.
Click **Authorize** at the top right and enter your token.

**Get a token:**
\`\`\`
POST /api/v1/auth/login
{ "email": "admin@raco.com", "password": "Admin@1234" }
\`\`\`

## Payment Providers
| Provider | Mode | Test Card |
|----------|------|-----------|
| **Stripe** | Test mode | \`4242 4242 4242 4242\` — any future expiry, any CVC |
| **bKash** | Sandbox | Use sandbox credentials from \`.env\` |

## Money / Price Fields
All \`price\`, \`amount\`, and \`totalAmount\` fields are stored in **poisha** (integer minor units).

| Poisha value | Display |
|---|---|
| \`100\` | ৳ 1.00 |
| \`125000\` | ৳ 1,250.00 |
| \`1000000\` | ৳ 10,000.00 |

Divide by 100 to convert to taka for display.

## Category Tree
Categories support nested parent/child hierarchy.
\`GET /api/v1/categories\` returns the full tree in a single request (cached in Redis).
`,
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'JWT access token. Obtain from POST /api/v1/auth/login. Expires in 15 minutes.',
        in: 'header',
      },
      'JWT',
    )
    .addTag('Auth', 'Register, login, token refresh, logout')
    .addTag('Users', 'User profile, order history, payment history')
    .addTag('Products', 'Product catalog — CRUD, image upload, recommendations')
    .addTag('Categories', 'Category tree with DFS traversal and Redis caching')
    .addTag('Orders', 'Create orders, initiate checkout, cancel orders')
    .addTag(
      'Payments',
      'Stripe and bKash — create payment, webhooks, query status',
    )
    .addTag('Health', 'Service health check and system status');

  const servers = getServers();
  servers.forEach((s) => builder.addServer(s.url, s.description));

  return builder.build();
};
