# Architecture Summary

> Full detail lives in `.claude/memory/architecture.md`. This is the
> portable summary for non-Claude-Code AI agents.

## Layers

- Controllers → DTOs (class-validator) → Services → Repositories (Prisma)
- OOP domain classes: User, Product, Order, Payment (see 2.2.1 in the assessment)

## Payment Strategy Pattern

- `PaymentProviderStrategy` interface: `createPayment()`, `confirmPayment()`,
  `queryPayment()`, `verifyWebhook()`
- `StripeStrategy` and `BkashStrategy` implement it
- `PaymentService` depends on the interface only — never on a concrete provider

## Category Tree (DFS + Cache)

- Categories form a tree (`parentId` self-relation)
- DFS traversal builds the recommendation set for a given product/category
- Traversal result cached in Redis, keyed by category id, TTL-based invalidation
  on category/product writes

## Order Flow

1. User builds cart → `POST /orders` creates order + OrderItems (status `pending`)
2. `POST /orders/:id/checkout` picks a provider → strategy initiates payment
3. Provider webhook/callback → `PaymentService` verifies + updates payment + order status
4. On `paid`, stock is decremented atomically (transaction) — never before confirmation

## File Storage (AWS S3)

- Product images uploaded via `POST /products/:id/image` (admin only, multipart/form-data)
- `S3Service` wraps `@aws-sdk/client-s3` — `uploadProductImage()`, `deleteProductImage()`
- Key pattern: `products/{productId}/{timestamp}-{originalname}`
- Stored URL saved in `products.image_url` (nullable varchar)
- Old image deleted from S3 on replacement or product delete
- Max 5 MB per file; accepted: jpeg, png, webp, gif
- Region: `ap-southeast-1` (Singapore — closest to Bangladesh)
- Local dev: real S3 bucket (free tier) OR LocalStack (`AWS_S3_ENDPOINT=http://localhost:4566`)

## Environment

- Postgres: 46.224.55.122:5432 (remote Docker, raco-postgres container)
- Redis: 46.224.55.122:6363 (remote Docker, raco-redis container)
- NestJS: localhost:4000 (pnpm start:dev)
