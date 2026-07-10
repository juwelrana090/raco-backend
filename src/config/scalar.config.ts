import { DocumentBuilder } from '@nestjs/swagger';

const getServers = () => {
  const port = process.env.PORT || '4000';
  const isDev = process.env.NODE_ENV !== 'production';
  const servers: { url: string; description: string }[] = [];

  if (isDev) {
    servers.push({
      url: `http://localhost:${port}`,
      description: 'Local (HTTP)',
    });
  }

  // ngrok URL for webhook testing (Stripe/bKash callbacks)
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
# 🛒 Raco E-commerce API

E-commerce Ordering & Payment System — NestJS + Prisma + PostgreSQL.

## 🔗 Quick Access
- [📋 Postman Collection](/postman) — Import directly into Postman
- [💚 Health & Service Status](/api-info) — System status
- [📄 OpenAPI JSON](/api-json) — Raw spec for code generation

## 🔐 Authentication
JWT Bearer Token. Click **Authorize** and paste your token.

Obtain token from: \`POST /api/v1/auth/login\`

## 💳 Payment Providers
- **Stripe** — Test mode. Use card \`4242 4242 4242 4242\`, any future expiry, any CVC.
- **bKash** — Sandbox mode. Use sandbox credentials from \`.env\`.

## 💰 Money Fields
All price/amount fields are in **poisha** (integer). Divide by 100 to get taka.
Example: \`price: 125000\` = ৳ 1,250.00
`,
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token obtained from POST /api/v1/auth/login',
        in: 'header',
      },
      'JWT',
    )
    .addTag('Auth', 'Register, login, refresh token, profile')
    .addTag('Users', 'User profile, order history, payment history')
    .addTag('Products', 'Product catalog — CRUD + image upload to S3')
    .addTag('Categories', 'Category tree — nested parent/child hierarchy')
    .addTag('Orders', 'Order creation, checkout, status tracking')
    .addTag('Payments', 'Stripe & bKash — initiate, webhook, query')
    .addTag('Health', 'Health check and API info');

  const servers = getServers();
  servers.forEach((s) => builder.addServer(s.url, s.description));

  return builder.build();
};
