Found the root cause. The controllers use **lowercase** tags (`auth`, `users`, `products`, `orders`, `categories`) but `scalar.config.ts` defines **Title Case** tags (`Auth`, `Users`, `Products`). They don't match → Scalar creates **duplicate empty sections** + **raw lowercase sections** → messy sidebar.

Also still has emoji in config despite earlier cleanup.

````
Fix Scalar API documentation — tag name mismatch causes duplicate empty
sections in the sidebar. Also remove remaining emoji, improve descriptions.

## Root Cause
Controllers use lowercase @ApiTags ('auth', 'users', 'products', 'orders',
'categories') but scalar.config.ts addTag() uses Title Case ('Auth', 'Users').
Scalar shows BOTH — empty titled sections AND populated lowercase sections.
Fix: make all controllers match scalar.config.ts exactly (Title Case).

---

## Fix 1 — src/modules/auth/auth.controller.ts

Change:
```typescript
@ApiTags('auth')
````

To:

```typescript
@ApiTags('Auth')
```

## Fix 2 — src/modules/users/users.controller.ts

Change:

```typescript
@ApiTags('users')
```

To:

```typescript
@ApiTags('Users')
```

## Fix 3 — src/modules/products/products.controller.ts

Change:

```typescript
@ApiTags('products')
```

To:

```typescript
@ApiTags('Products')
```

## Fix 4 — src/modules/categories/categories.controller.ts

Change:

```typescript
@ApiTags('categories')
```

To:

```typescript
@ApiTags('Categories')
```

## Fix 5 — src/modules/orders/orders.controller.ts

Change:

```typescript
@ApiTags('orders')
```

To:

```typescript
@ApiTags('Orders')
```

## Fix 6 — src/config/scalar.config.ts

Replace the entire file with cleaner docs — no emoji, better descriptions,
tag order matches reference (madrasa-backend pattern):

```typescript
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
```

## Fix 7 — src/config/scalar-theme.config.ts

Replace the entire file — remove emoji, use 'classic' layout (matches
madrasa reference which shows Operations panel on the right):

```typescript
import type { NestJSReferenceConfiguration } from '@scalar/nestjs-api-reference';

export const scalarThemeConfig: Partial<NestJSReferenceConfiguration> = {
  theme: 'default' as const,
  layout: 'modern' as const,
  darkMode: false,
  favicon: '/favicon.ico',
  metaData: {
    title: 'Raco API Documentation',
    description: 'E-commerce Ordering & Payment System — API Reference',
  },
  persistAuth: true,
  searchHotKey: 'k',
  showSidebar: true,
  hideModels: false,
  customCss: `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    * {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    }

    code, pre, .mono, .cm-content, .cm-editor {
      font-family: 'JetBrains Mono', 'Monaco', 'Cascadia Code', 'Fira Code', monospace !important;
    }

    :root {
      --scalar-primary: #465fff;
      --scalar-primary-dark: #3641f5;
      --scalar-background-1: #ffffff;
      --scalar-background-2: #f8fafc;
      --scalar-background-3: #f1f5f9;
      --scalar-border: #e2e8f0;
      --scalar-text-1: #0f172a;
      --scalar-text-2: #475569;
      --scalar-text-3: #64748b;
      --scalar-scrollbar-color: #cbd5e1;
    }

    /* Sidebar styling */
    .sidebar {
      background: #ffffff !important;
      border-right: 1px solid #e2e8f0 !important;
    }

    /* HTTP method badge colors */
    .scalar-get    { --scalar-color-accent: #16a34a; --scalar-color-accent-bg: #f0fdf4; }
    .scalar-post   { --scalar-color-accent: #2563eb; --scalar-color-accent-bg: #eff6ff; }
    .scalar-put    { --scalar-color-accent: #d97706; --scalar-color-accent-bg: #fffbeb; }
    .scalar-delete { --scalar-color-accent: #dc2626; --scalar-color-accent-bg: #fef2f2; }
    .scalar-patch  { --scalar-color-accent: #7c3aed; --scalar-color-accent-bg: #f5f3ff; }

    /* Tag section headings */
    .section-header h2 {
      font-size: 1.25rem !important;
      font-weight: 700 !important;
      color: #0f172a !important;
    }

    /* Operation cards */
    .section-flattened-item {
      border: 1px solid #e2e8f0 !important;
      border-radius: 0.75rem !important;
      margin-bottom: 0.5rem !important;
      transition: box-shadow 0.15s ease !important;
    }

    .section-flattened-item:hover {
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05) !important;
    }

    /* Authorize button */
    .scalar-button.authorize {
      background: #465fff !important;
      color: white !important;
      border-radius: 0.5rem !important;
      font-weight: 600 !important;
    }

    /* Response codes */
    .response-code-200 { color: #16a34a !important; }
    .response-code-201 { color: #16a34a !important; }
    .response-code-400 { color: #d97706 !important; }
    .response-code-401 { color: #dc2626 !important; }
    .response-code-403 { color: #dc2626 !important; }
    .response-code-404 { color: #dc2626 !important; }
    .response-code-409 { color: #d97706 !important; }
  `,
};
```

## Fix 8 — src/config/scalar-endpoints.config.ts

Remove emoji from Postman collection name and API-info title:

Find and replace:

```typescript
// line with postman name
name: '🚀 Raco E-commerce API',
description: 'Complete API collection for Raco e-commerce backend',
```

With:

```typescript
name: 'Raco E-commerce API',
description: 'Complete API collection for Raco e-commerce backend',
```

And in api-info:

```typescript
title: '🛒 Raco E-commerce API',
```

With:

```typescript
title: 'Raco E-commerce API',
```

## Fix 9 — Add @ApiBearerAuth to all protected controllers

This makes the lock icon appear next to protected endpoints — like in the reference.

auth.controller.ts — add @ApiBearerAuth('JWT') to logout, logout-all, validate endpoints only (register/login are public):

```typescript
// On protected methods only (logout, logoutAll, validate):
@ApiBearerAuth('JWT')
```

users.controller.ts — add to class level:

```typescript
@ApiTags('Users')
@ApiBearerAuth('JWT')
@Controller('users')
```

orders.controller.ts — add to class level (already has @UseGuards(JwtGuard)):

```typescript
@ApiTags('Orders')
@ApiBearerAuth('JWT')
@Controller('orders')
```

---

## Verify

```bash
pnpm dev:watch
```

Open http://localhost:4000/api-docs

Sidebar should now show exactly:

```
Auth
  Register a new user     POST
  Login user              POST
  Refresh access token    POST
  Logout user             POST
  Logout from all devices POST
  Validate current token  GET

Users
  Get current user profile    GET
  Update current user profile PUT
  Get current user's orders   GET
  Get current user's payments GET

Products
  Get all products                    GET
  Create a new product (Admin only)   POST
  Get product by ID                   GET
  Update a product (Admin only)       PATCH
  Delete a product (Admin only)       DELETE
  Get recommended products            GET
  Upload product image (Admin only)   POST
  Delete product image (Admin only)   DELETE

Categories
  Get category tree                         GET
  Create a new category (Admin only)        POST
  Get category by ID                        GET
  Update a category (Admin only)            PATCH
  Delete a category (Admin only)            DELETE
  Get all products in category              GET

Orders
  Create a new order       POST
  Get current user orders  GET
  Get order by ID          GET
  Initiate checkout        POST
  Cancel an order          DELETE

Payments
  Create a payment         POST
  Stripe webhook endpoint  POST
  bKash callback endpoint  POST
  Get payment details      GET
  Get payments for order   GET

Health
  Health check             GET
  Detailed health check    GET
```

Each tag section should have a clean description below the heading.
Protected endpoints should show the lock icon.
No duplicate empty sections. No emoji in titles.

After completing: run /r-done

```

```
