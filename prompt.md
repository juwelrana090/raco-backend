// ============================================================
// Paste this whole file into dbdiagram.io (DBML)
// E-commerce Ordering & Payment System — PostgreSQL schema
// ============================================================

Table users {
id uuid [pk, default: `gen_random_uuid()`]
name varchar [not null]
email varchar [not null, unique]
password_hash varchar [not null]
role varchar [not null, default: 'user', note: 'user | admin']
created_at timestamp [not null, default: `now()`]
updated_at timestamp [not null, default: `now()`]

indexes {
email [unique]
}
}

Table categories {
id uuid [pk, default: `gen_random_uuid()`]
name varchar [not null]
slug varchar [not null, unique]
parent_id uuid [ref: > categories.id, note: 'self-relation for tree/DFS']
created_at timestamp [not null, default: `now()`]
updated_at timestamp [not null, default: `now()`]

indexes {
parent_id
}
}

Table products {
id uuid [pk, default: `gen_random_uuid()`]
category_id uuid [ref: > categories.id]
name varchar [not null]
sku varchar [not null, unique]
description text
price bigint [not null, note: 'minor units — cents/poisha, never float']
stock integer [not null, default: 0]
status varchar [not null, default: 'active', note: 'active | inactive']
image_url varchar [note: 'AWS S3 public URL — null until image uploaded']
created_at timestamp [not null, default: `now()`]
updated_at timestamp [not null, default: `now()`]

indexes {
sku [unique]
category_id
}
}

Table orders {
id uuid [pk, default: `gen_random_uuid()`]
user_id uuid [ref: > users.id, not null]
total_amount bigint [not null, note: 'minor units — sum of order_items.subtotal']
status varchar [not null, default: 'pending', note: 'pending | paid | canceled']
created_at timestamp [not null, default: `now()`]
updated_at timestamp [not null, default: `now()`]

indexes {
user_id
status
}
}

Table order_items {
id uuid [pk, default: `gen_random_uuid()`]
order_id uuid [ref: > orders.id, not null]
product_id uuid [ref: > products.id, not null]
quantity integer [not null]
price bigint [not null, note: 'snapshot of product.price at order time']
subtotal bigint [not null, note: 'price * quantity, computed at creation']

indexes {
order_id
product_id
}
}

Table payments {
id uuid [pk, default: `gen_random_uuid()`]
order_id uuid [ref: > orders.id, not null]
provider varchar [not null, note: 'stripe | bkash']
transaction_id varchar [not null, unique, note: 'payment_intent_id (Stripe) / bkash_payment_id']
status varchar [not null, default: 'pending', note: 'pending | success | failed']
raw_response jsonb [note: 'full provider payload for audit']
created_at timestamp [not null, default: `now()`]
updated_at timestamp [not null, default: `now()`]

indexes {
transaction_id [unique]
order_id
provider
}
}

follow tjis and update schema.prisma

You are building the raco-backend e-commerce API. This is a take-home assessment. Read .claude/agents/ for domain rules before touching any module.

## TASK: Steps 1–2 (Prisma schema + Auth module)

### Step 1 — Install dependencies

```bash
pnpm add @nestjs/config @nestjs/swagger @nestjs/passport passport passport-jwt passport-local @nestjs/jwt @prisma/client prisma bcrypt class-validator class-transformer @nestjs/cache-manager cache-manager ioredis @aws-sdk/client-s3 @aws-sdk/lib-storage stripe multer @nestjs/throttler cookie-parser helmet compression morgan uuid

pnpm add -D @types/passport-jwt @types/passport-local @types/bcrypt @types/multer @types/cookie-parser @types/morgan @types/uuid
```

### Step 2 — Prisma schema

Create prisma/schema.prisma:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name         String
  email        String   @unique
  passwordHash String   @map("password_hash")
  role         Role     @default(USER)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  orders       Order[]
  @@map("users")
}

enum Role { USER ADMIN }

model Category {
  id        String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  parentId  String?    @map("parent_id") @db.Uuid
  name      String
  slug      String     @unique
  parent    Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children  Category[] @relation("CategoryTree")
  products  Product[]
  createdAt DateTime   @default(now()) @map("created_at")
  updatedAt DateTime   @updatedAt @map("updated_at")
  @@index([parentId])
  @@map("categories")
}

model Product {
  id          String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  categoryId  String?       @map("category_id") @db.Uuid
  name        String
  sku         String        @unique
  description String?
  price       BigInt
  stock       Int           @default(0)
  status      ProductStatus @default(ACTIVE)
  imageUrl    String?       @map("image_url")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  category    Category?     @relation(fields: [categoryId], references: [id])
  orderItems  OrderItem[]
  @@index([categoryId])
  @@map("products")
}

enum ProductStatus { ACTIVE INACTIVE }

model Order {
  id          String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId      String      @map("user_id") @db.Uuid
  totalAmount BigInt      @map("total_amount")
  status      OrderStatus @default(PENDING)
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")
  user        User        @relation(fields: [userId], references: [id])
  items       OrderItem[]
  payment     Payment?
  @@index([userId])
  @@index([status])
  @@map("orders")
}

enum OrderStatus { PENDING PAID CANCELED }

model OrderItem {
  id        String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderId   String  @map("order_id") @db.Uuid
  productId String  @map("product_id") @db.Uuid
  quantity  Int
  price     BigInt
  subtotal  BigInt
  order     Order   @relation(fields: [orderId], references: [id])
  product   Product @relation(fields: [productId], references: [id])
  @@index([orderId])
  @@index([productId])
  @@map("order_items")
}

model Payment {
  id            String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  orderId       String          @unique @map("order_id") @db.Uuid
  provider      PaymentProvider
  transactionId String          @unique @map("transaction_id")
  status        PaymentStatus   @default(PENDING)
  rawResponse   Json?           @map("raw_response")
  createdAt     DateTime        @default(now()) @map("created_at")
  updatedAt     DateTime        @updatedAt @map("updated_at")
  order         Order           @relation(fields: [orderId], references: [id])
  @@index([provider])
  @@map("payments")
}

enum PaymentProvider { STRIPE BKASH }
enum PaymentStatus   { PENDING SUCCESS FAILED }
```

Run: npx prisma migrate dev --name init

### Step 3 — main.ts

Replace src/main.ts:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.use(compression());

  app.setGlobalPrefix(process.env.API_PREFIX ?? 'api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(','),
    credentials: true,
  });

  if (process.env.SWAGGER_ENABLED === 'true') {
    const config = new DocumentBuilder()
      .setTitle(process.env.SWAGGER_TITLE ?? 'Raco API')
      .setDescription('E-commerce Ordering & Payment System')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const doc = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(process.env.SWAGGER_PATH ?? 'api/docs', app, doc);
  }

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  logger.log(`🚀 Running on http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();
```

### Step 4 — PrismaService (global)

src/prisma/prisma.service.ts:

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

src/prisma/prisma.module.ts — @Global() module exporting PrismaService.

### Step 5 — Auth module

Read .claude/agents/auth-agent.md for all security rules before writing any code.

Build src/modules/auth/ with:

DTOs:

- RegisterDto: name (required min 2), email (email format), password (min 6 max 50)
- LoginDto: email, password
- RefreshDto: refreshToken

JWT strategy (src/modules/auth/strategies/jwt.strategy.ts):

- Extract Bearer token from Authorization header
- Validate using JWT_SECRET
- Return { id, email, role } as req.user

Guards:

- JwtAuthGuard extends AuthGuard('jwt')
- AdminGuard: checks req.user.role === 'ADMIN', throws ForbiddenException otherwise

AuthService methods:

- register(dto): hash password with bcrypt (BCRYPT_SALT_ROUNDS from env), create user, return tokens
- login(dto): validate email+password, return tokens
- generateTokens(userId, email, role): accessToken (15m, JWT_SECRET) + refreshToken (7d, JWT_REFRESH_SECRET)
- refreshTokens(refreshToken): verify with JWT_REFRESH_SECRET, generate new pair

AuthController endpoints (all under /auth):

- POST /auth/register → { user, accessToken, refreshToken }
- POST /auth/login → { user, accessToken, refreshToken }
- POST /auth/refresh → { accessToken, refreshToken }
- GET /auth/me → req.user (JwtAuthGuard protected)

### Step 6 — Users module

src/modules/users/ with:

- GET /users/me → full user profile (JwtAuthGuard)
- GET /users/me/orders → current user's paginated orders
- GET /users/me/payments → current user's payments

### Step 7 — Seed file

prisma/seed.ts:

1. Create admin user: { name: 'Admin', email: 'admin@raco.com', password: 'Admin@1234', role: ADMIN }
2. Create categories tree:
   - Electronics (slug: electronics)
     - Phones (slug: phones, parent: Electronics)
     - Laptops (slug: laptops, parent: Electronics)
   - Clothing (slug: clothing)
   - Bags (slug: bags)
3. Create 6 sample products spread across categories, prices in poisha (taka × 100), stock 10–100

Add to package.json: "prisma": { "seed": "ts-node prisma/seed.ts" }
Run: npx prisma db seed

### Step 8 — App module

Update src/app.module.ts:

- ConfigModule.forRoot({ isGlobal: true })
- PrismaModule (global)
- ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])
- AuthModule
- UsersModule

### Verify

```bash
pnpm start:dev
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@raco.com","password":"Test@1234"}'
# Expected: { success: true, data: { user, accessToken, refreshToken } }

curl http://localhost:4000/api/docs
# Expected: Swagger UI loads
```

After completing: run /r-done and log to .claude/tasks/logs/YYYY-MM-DD-prisma-auth.md

Now I have the full picture. Let me write the prompt.

---

````
You are adding Scalar API documentation to raco-backend. Follow the exact same pattern from the madrasa api-gateway project.

## Step 1 — Install package

```bash
pnpm add @scalar/nestjs-api-reference @nestjs/swagger
````

## Step 2 — Create src/config/scalar.config.ts

```typescript
import { DocumentBuilder } from '@nestjs/swagger';

const getServers = () => {
  const port = process.env.PORT || 4000;
  const isDev = process.env.NODE_ENV !== 'production';
  const servers = [];

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
```

## Step 3 — Create src/config/scalar-theme.config.ts

```typescript
import type { NestJSReferenceConfiguration } from '@scalar/nestjs-api-reference';

export const scalarThemeConfig: Partial<NestJSReferenceConfiguration> = {
  theme: 'default' as const,
  layout: 'modern' as const,
  darkMode: false,
  favicon: '/favicon.ico',
  metaData: {
    title: '🛒 Raco API Documentation',
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

    code, pre, .mono {
      font-family: 'JetBrains Mono', 'Monaco', 'Cascadia Code', monospace !important;
    }

    body {
      background: #f8fafc !important;
    }

    :root {
      --scalar-primary: #465fff;
      --scalar-primary-dark: #3641f5;
      --scalar-background-1: #ffffff;
      --scalar-background-2: #f8fafc;
      --scalar-border: #e4e7ec;
      --scalar-text-1: #101828;
      --scalar-text-2: #475467;
      --scalar-text-3: #667085;
    }

    .scalar-get    { --scalar-color-accent: #12b76a; --scalar-color-accent-bg: #ecfdf3; }
    .scalar-post   { --scalar-color-accent: #465fff; --scalar-color-accent-bg: #ecf3ff; }
    .scalar-put    { --scalar-color-accent: #f79009; --scalar-color-accent-bg: #fffaeb; }
    .scalar-delete { --scalar-color-accent: #f04438; --scalar-color-accent-bg: #fef3f2; }
    .scalar-patch  { --scalar-color-accent: #7a5af8; --scalar-color-accent-bg: #f4f3ff; }

    .scalar-card {
      background: white;
      border: 1px solid #e4e7ec;
      border-radius: 1rem;
      box-shadow: 0 1px 2px 0 rgba(16, 24, 40, 0.05);
      transition: all 0.2s ease;
    }

    .scalar-card:hover {
      box-shadow: 0 4px 8px -2px rgba(16, 24, 40, 0.1), 0 2px 4px -2px rgba(16, 24, 40, 0.06);
      border-color: #d0d5dd;
    }

    .scalar-operation.get    { border-left: 4px solid #12b76a; }
    .scalar-operation.post   { border-left: 4px solid #465fff; }
    .scalar-operation.put    { border-left: 4px solid #f79009; }
    .scalar-operation.delete { border-left: 4px solid #f04438; }
    .scalar-operation.patch  { border-left: 4px solid #7a5af8; }
  `,
};
```

## Step 4 — Create src/config/scalar-endpoints.config.ts

```typescript
import { INestApplication } from '@nestjs/common';
import { Request, Response } from 'express';

export function setupScalarEndpoints(app: INestApplication, document: any) {
  // GET /api-json — raw OpenAPI spec
  app.use('/api-json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(document);
  });

  // GET /postman — Postman collection download
  app.use('/postman', (req: Request, res: Response) => {
    const collection = generatePostmanCollection(document);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="raco-backend-collection.json"',
    );
    res.send(collection);
  });

  // GET /api-info — health check
  app.use('/api-info', (req: Request, res: Response) => {
    res.json({
      title: '🛒 Raco E-commerce API',
      version: '1.0.0',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      documentation: {
        interactive: '/api-docs',
        openapi: '/api-json',
        postman: '/postman',
      },
      endpoints: Object.keys(document.paths || {}).length,
      services: [
        { name: 'PostgreSQL', status: 'active', note: 'Prisma ORM' },
        { name: 'Redis', status: 'active', note: 'Category tree DFS cache' },
        { name: 'AWS S3', status: 'active', note: 'Product image storage' },
        { name: 'Stripe', status: 'active', note: 'Test mode' },
        { name: 'bKash', status: 'active', note: 'Sandbox mode' },
      ],
    });
  });
}

function generatePostmanCollection(document: any) {
  return {
    info: {
      name: 'Raco E-commerce API',
      description: '🛒 Complete API collection for Raco e-commerce backend',
      schema:
        'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      version: '1.0.0',
    },
    auth: {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{jwt_token}}', type: 'string' }],
    },
    variable: [
      {
        key: 'base_url',
        value: 'http://localhost:4000/api/v1',
        type: 'string',
        description: 'Base URL for raco-backend',
      },
      {
        key: 'jwt_token',
        value: '',
        type: 'string',
        description: 'JWT token from POST /api/v1/auth/login',
      },
    ],
    item: generatePostmanItems(document),
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            'pm.test("Status is 2xx", () => {',
            '  pm.expect(pm.response.code).to.be.oneOf([200,201,202,204]);',
            '});',
            'pm.test("Response time < 3000ms", () => {',
            '  pm.expect(pm.response.responseTime).to.be.below(3000);',
            '});',
          ],
        },
      },
    ],
  };
}

function generatePostmanItems(document: any) {
  const folders = new Map<string, any>();

  Object.entries(document.paths || {}).forEach(([path, methods]) => {
    Object.entries(methods as any).forEach(
      ([method, operation]: [string, any]) => {
        if (
          ![
            'get',
            'post',
            'put',
            'delete',
            'patch',
            'head',
            'options',
          ].includes(method)
        )
          return;

        const tag = operation.tags?.[0] || 'General';
        if (!folders.has(tag)) {
          folders.set(tag, { name: `📁 ${tag}`, item: [] });
        }

        const folder = folders.get(tag);
        const prefix = '/api/v1';
        const cleanPath = path.startsWith(prefix)
          ? path.substring(prefix.length)
          : path;

        const headers: any[] = [
          { key: 'Content-Type', value: 'application/json' },
        ];
        if (operation.security) {
          headers.push({ key: 'Authorization', value: 'Bearer {{jwt_token}}' });
        }

        folder.item.push({
          name: operation.summary || `${method.toUpperCase()} ${path}`,
          request: {
            method: method.toUpperCase(),
            header: headers,
            url: {
              raw: `{{base_url}}${cleanPath}`,
              host: ['{{base_url}}'],
              path: cleanPath.split('/').filter(Boolean),
              query: (operation.parameters || [])
                .filter((p: any) => p.in === 'query')
                .map((p: any) => ({
                  key: p.name,
                  value: p.example?.toString() || '',
                  description: p.description || '',
                  disabled: !p.required,
                })),
            },
            body: operation.requestBody
              ? {
                  mode: 'raw',
                  raw: JSON.stringify(
                    operation.requestBody.content?.['application/json']
                      ?.example ?? {},
                    null,
                    2,
                  ),
                  options: { raw: { language: 'json' } },
                }
              : undefined,
            description: operation.description || operation.summary || '',
          },
        });
      },
    );
  });

  return Array.from(folders.values());
}
```

## Step 5 — Update src/main.ts

Replace the Swagger section in main.ts with:

```typescript
import { apiReference } from '@scalar/nestjs-api-reference';
import { SwaggerModule } from '@nestjs/swagger';
import { createScalarDocument } from './config/scalar.config';
import { setupScalarEndpoints } from './config/scalar-endpoints.config';
import { scalarThemeConfig } from './config/scalar-theme.config';

// inside bootstrap(), after app.useGlobalPipes():

// Build OpenAPI document
const document = SwaggerModule.createDocument(app, createScalarDocument());

// Register /api-json, /postman, /api-info endpoints
setupScalarEndpoints(app, document);

// Mount Scalar interactive UI at /api-docs
app.use(
  '/api-docs',
  apiReference({
    spec: {
      content: document,
    },
    ...scalarThemeConfig,
  }),
);

// In the Logger.log calls at the end:
logger.log(`📚 API Docs:  http://localhost:${port}/api-docs`);
logger.log(`📋 Postman:  http://localhost:${port}/postman`);
logger.log(`📄 OpenAPI:  http://localhost:${port}/api-json`);
logger.log(`💚 Health:   http://localhost:${port}/api-info`);
```

## Step 6 — Add Swagger decorators to every controller

For each controller (auth, users, products, categories, orders, payments), add:

```typescript
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Products') // matches the tag name in scalar.config.ts
@ApiBearerAuth('JWT') // shows the lock icon on every endpoint
@Controller('products')
export class ProductsController {}
```

For each endpoint:

```typescript
@ApiOperation({ summary: 'Get all products', description: 'Paginated list with optional filters' })
@ApiResponse({ status: 200, description: 'Returns paginated products' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@Get()
findAll(@Query() query: ProductsQueryDto) {}
```

Auth endpoints do NOT use @ApiBearerAuth (they are public):

```typescript
@ApiTags('Auth')
@Controller('auth')
export class AuthController {}

// No @ApiBearerAuth on register/login endpoints
// @ApiBearerAuth('JWT') only on /auth/me, /auth/refresh
```

For Stripe webhook — mark as raw body, no auth:

```typescript
@ApiOperation({ summary: 'Stripe webhook', description: 'Receives signed events from Stripe. Do not call manually.' })
@ApiResponse({ status: 200, description: 'Webhook processed' })
@Post('stripe/webhook')
stripeWebhook(@Req() req: RawBodyRequest<Request>) {}
```

## Step 7 — Verify

```bash
pnpm start:dev

# Open in browser:
# http://localhost:4000/api-docs   → Scalar interactive UI
# http://localhost:4000/api-json   → raw OpenAPI JSON
# http://localhost:4000/api-info   → health check JSON
# http://localhost:4000/postman    → downloads Postman collection

# Test auth flow in Scalar:
# 1. POST /api/v1/auth/login → copy accessToken
# 2. Click Authorize top-right → paste token
# 3. GET /api/v1/auth/me → should return your profile
# 4. GET /api/v1/products → should return empty list
```

After completing: run /r-done and log to .claude/tasks/logs/YYYY-MM-DD-scalar-docs.md

```



```

Remove docker-compose.yml from raco-backend. We use separate raco-postgres and raco-redis Docker containers that already run on raco-network.

## Task

1. Delete `docker-compose.yml` from the project root

2. Remove these lines from `.env` (they only served docker-compose):

```
# ─── Docker Compose DB vars ───────────────────────────────────────
POSTGRES_USER=raco_user
POSTGRES_PASSWORD=raco_pass
POSTGRES_DB=raco_db
```

3. Remove the same block from `.env.example` and `.env.production`

4. Update `README.md` — replace any "docker-compose up" instructions with:

````md
## Infrastructure

PostgreSQL and Redis run as separate containers managed by their own repos:

- `raco-postgres` → start first (creates `raco-network`)
- `raco-redis` → start second (joins `raco-network`)

```bash
# Start infrastructure (run once)
cd ../raco-postgres && docker-compose up -d
cd ../raco-redis    && docker-compose up -d

# Then run the API locally
pnpm start:dev
```
````

Connect strings (already in .env):

- DATABASE_URL=postgresql://raco_e_commerce:...@localhost:5454/raco_e_commerce_db
- REDIS_HOST=localhost / REDIS_PORT=6379

````

5. Update `.context/architecture.md` — change the "Environment Differences" section to:
```md
## Environment Differences
- Local dev: NestJS runs on host machine (pnpm start:dev), connects to dockerised postgres (localhost:5454) and redis (localhost:6379)
- Production/VPS: NestJS runs via PM2 on host, same separate containers on raco-network
- Docker networking: postgres and redis are on raco-network; NestJS joins only if it is also containerised
````

6. Verify no other file references `docker-compose` in raco-backend:

```bash
grep -r "docker-compose\|docker compose" . \
  --include="*.ts" --include="*.json" --include="*.md" \
  --include="*.sh" --include="*.yml" --include="*.yaml" \
  -l
```

After completing: run /r-done

```


```

Update raco-backend .env connection strings — postgres and redis are live on the remote Docker server.

## Task

Update `.env` with these exact values:

```
# ─── Database (PostgreSQL) ─────────────────────────────────────────
DATABASE_URL=postgresql://raco_e_commerce:12345678Aa!@46.224.55.122:5454/raco_e_commerce_db?schema=public

# ─── Redis ─────────────────────────────────────────────────────────
REDIS_HOST=46.224.55.122
REDIS_PORT=6363
REDIS_PASSWORD=12345678Aa!
REDIS_DB=0
REDIS_CATEGORY_TREE_TTL=3600
```

Update `.env.example` — same keys, values blank:

```
DATABASE_URL=postgresql://RACO_DB_USER:RACO_DB_PASSWORD@YOUR_SERVER_IP:5454/raco_e_commerce_db?schema=public

REDIS_HOST=YOUR_SERVER_IP
REDIS_PORT=6363
REDIS_PASSWORD=
REDIS_DB=0
REDIS_CATEGORY_TREE_TTL=3600
```

Update `.context/architecture.md` environment section:

```md
## Environment

- Postgres: 46.224.55.122:5454 (remote Docker, raco-postgres container)
- Redis: 46.224.55.122:6363 (remote Docker, raco-redis container)
- NestJS: localhost:4000 (pnpm start:dev)
```

Verify connections after updating:

```bash
# Postgres — Prisma should connect immediately
npx prisma db pull

# Redis
redis-cli -h 46.224.55.122 -p 6363 -a '12345678Aa!' ping
# Expected: PONG
```

After completing: run /r-done

```

```

.env & .env.production not edit
