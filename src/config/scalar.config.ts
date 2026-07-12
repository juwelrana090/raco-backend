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

A production-quality NestJS backend for e-commerce with multi-provider payment support, category-based recommendations, and comprehensive testing.

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
{ "email": "admin@racocommerce.com", "password": "Admin@123" }
\`\`\`

**Token lifetime:** 15 minutes (access), 7 days (refresh)

## API Overview

| Module | Endpoints | Auth | Description |
|--------|-----------|------|-------------|
| **Auth** | 6 | Public / JWT | Register, login, refresh, logout, validate |
| **Users** | 7 | JWT / Admin | Profile, orders, payments, user management |
| **Products** | 8 | Public / Admin | Catalog, CRUD, image upload, recommendations |
| **Categories** | 8 | Public / Admin | Tree hierarchy, CRUD, image upload |
| **Orders** | 6 | JWT / Admin | Create, checkout, cancel, admin list |
| **Payments** | 6 | JWT / Public | Create, webhooks, query, admin list |
| **Health** | 2 | Public | Service health and status |

**Total: 43 endpoints**

## Payment Providers

| Provider | Mode | Test Card / Credentials |
|----------|------|------------------------|
| **Stripe** | Test mode | \`4242 4242 4242 4242\` — any future expiry, any CVC |
| **bKash** | Sandbox | Use sandbox credentials from \`.env\` |

## Money / Price Fields

All \`price\`, \`amount\`, and \`totalAmount\` fields are stored in **poisha** (integer minor units).

| Poisha value | Display |
|---|---|
| \`100\` | ৳ 1.00 |
| \`125000\` | ৳ 1,250.00 |
| \`1000000\` | ৳ 10,000.00 |

**Rule:** Divide by 100 to convert to taka for display. Never use floating point for money.

## Category Tree

Categories support nested parent/child hierarchy.
\`GET /api/v1/categories\` returns the full tree in a single request (cached in Redis).

## Error Response Format

All errors follow a consistent structure:

\`\`\`json
{
  "success": false,
  "message": "Error description",
  "data": null,
  "error": "Additional error details",
  "path": "/api/v1/products",
  "timestamp": "2026-07-10T14:30:00.000Z"
}
\`\`\`

## Pagination Format

List endpoints return paginated results:

\`\`\`json
{
  "success": true,
  "message": "Retrieved successfully",
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10
    }
  }
}
\`\`\`
`,
    )
    .setVersion('1.0.0')
    .setContact('Raco Team', 'https://github.com/raco', 'dev@racocommerce.com')
    .setLicense('UNLICENSED', 'https://unlicense.org/')
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
    .addTag(
      'Auth',
      'User authentication — register, login, token refresh, logout, token validation',
    )
    .addTag(
      'Users',
      'User management — profile, order history, payment history, admin user list',
    )
    .addTag(
      'Products',
      'Product catalog — CRUD operations, image upload/delete, category-based recommendations',
    )
    .addTag(
      'Categories',
      'Category hierarchy — nested tree structure, CRUD, image upload, product listing',
    )
    .addTag(
      'Orders',
      'Order management — create from cart, checkout initiation, order cancellation, admin list',
    )
    .addTag(
      'Payments',
      'Payment processing — Stripe and bKash, webhooks, payment status queries, admin list',
    )
    .addTag('Health', 'Service health check and system status');

  const servers = getServers();
  servers.forEach((s) => builder.addServer(s.url, s.description));

  return builder.build();
};
