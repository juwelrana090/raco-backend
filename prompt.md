Now I have the full picture. Here's the complete audit:

**Backend** — 5 files with emoji (logger strings, Scalar config, Redis service)
**Frontend** — 6 files with emoji (homepage category/features/hero, Footer payment icons, ❤️)
`lucide-react` is NOT installed yet.

---

**Prompt 1 — Backend (remove emoji from logs & config):**

````
Remove all emoji from raco-backend source files. Replace with plain text.
Emoji in log strings cause encoding issues on some terminals and CI systems.

## Files to update

### src/main.ts — lines 114-118

Replace:
```typescript
logger.log(`🚀 Running on http://localhost:${port}/api/v1`);
logger.log(`📚 API Docs:  http://localhost:${port}/api-docs`);
logger.log(`📋 Postman:  http://localhost:${port}/postman`);
logger.log(`📄 OpenAPI:  http://localhost:${port}/api-json`);
logger.log(`💚 Health:   http://localhost:${port}/api-info`);
````

With:

```typescript
logger.log(`[APP]     Running on http://localhost:${port}/api/v1`);
logger.log(`[DOCS]    API Docs:  http://localhost:${port}/api-docs`);
logger.log(`[POSTMAN] Collection: http://localhost:${port}/postman`);
logger.log(`[JSON]    OpenAPI:   http://localhost:${port}/api-json`);
logger.log(`[HEALTH]  Status:    http://localhost:${port}/api-info`);
```

### src/common/redis/redis.service.ts — line 40

Replace:

```typescript
console.log('✅ Connected to Redis');
```

With:

```typescript
console.log('[REDIS] Connected');
```

### src/config/scalar-theme.config.ts — lines 9-10

Replace:

```typescript
title: '🛒 Raco API Documentation',
description: 'E-commerce Ordering & Payment System — API Reference',
```

With:

```typescript
title: 'Raco API Documentation',
description: 'E-commerce Ordering & Payment System — API Reference',
```

### src/config/scalar-endpoints.config.ts

Replace line 27:

```typescript
title: '🛒 Raco E-commerce API',
```

With:

```typescript
title: 'Raco E-commerce API',
```

Replace line 52:

```typescript
description: '🛒 Complete API collection for Raco e-commerce backend',
```

With:

```typescript
description: 'Complete API collection for Raco e-commerce backend',
```

Replace line 116:

```typescript
folders.set(tag, { name: `📁 ${tag}`, item: [] });
```

With:

```typescript
folders.set(tag, { name: tag, item: [] });
```

### src/config/scalar.config.ts — the markdown description string

Replace the full description string with clean markdown (no emoji):

```typescript
.setDescription(
  `
# Raco E-commerce API

E-commerce Ordering & Payment System — NestJS + Prisma + PostgreSQL.

## Quick Access
- [Postman Collection](/postman) — Import directly into Postman
- [Health & Service Status](/api-info) — System status
- [OpenAPI JSON](/api-json) — Raw spec for code generation

## Authentication
JWT Bearer Token. Click **Authorize** and paste your token.

Obtain token from: \`POST /api/v1/auth/login\`

## Payment Providers
- **Stripe** — Test mode. Use card \`4242 4242 4242 4242\`, any future expiry, any CVC.
- **bKash** — Sandbox mode. Use sandbox credentials from \`.env\`.

## Money Fields
All price/amount fields are in **poisha** (integer). Divide by 100 to get taka.
Example: \`price: 125000\` = BDT 1,250.00
`,
)
```

## Verify

```bash
pnpm dev:watch
```

Expected clean log output (no emoji):

```
[APP]     Running on http://localhost:4000/api/v1
[DOCS]    API Docs:  http://localhost:4000/api-docs
[POSTMAN] Collection: http://localhost:4000/postman
[JSON]    OpenAPI:   http://localhost:4000/api-json
[HEALTH]  Status:    http://localhost:4000/api-info
```

After completing: run /r-done

```

```
