# raco-backend — Build Prompt (E-commerce Ordering & Payment System)

> Paste this whole file to Claude Code (or Cursor/Windsurf) inside the
> `raco-backend` project after running the updated `setup-claude.sh`.
> It already has your `.claude/agents/` (auth-agent, product-agent,
> order-agent, payment-agent) and `.context/` cross-tool briefs loaded —
> reference them by name where noted.

## 0. Context

This is a **take-home assessment for a Backend Engineer role**. Reviewers
grade on: clean REST API design, correct OOP structure, the specific
algorithm/design-pattern requirements below, test coverage, and
documentation — not just "does it run". Build it like production code,
not a rough MVP.

Stack for this project (already scaffolded):

- NestJS 11, TypeScript
- **Add**: Prisma ORM + PostgreSQL
- **Add**: Redis (category-tree caching)
- **Add**: Stripe SDK, bKash sandbox integration
- **Add**: class-validator/class-transformer, Swagger (`@nestjs/swagger`)
- **Add**: Passport-JWT for auth
- Jest (already present) for unit + e2e tests

## 1. Domain model (OOP requirement — §2.2.1)

Create explicit domain classes, not just Prisma models passed around raw:

- `User` — registration, login, own-orders/payments visibility
- `Product` — CRUD, stock adjustment method (`reduceStock(qty)`) that
  throws on insufficient stock
- `Order` — `addItem()`, `calculateTotal()` (deterministic — see §3),
  `markPaid()`, `cancel()`
- `Payment` — `provider`, `status`, delegates to a `PaymentProviderStrategy`

Keep these as service-layer domain logic wrapping Prisma repositories —
don't leak Prisma calls into controllers.

## 2. Data structure (§2.2.2)

Relational schema in PostgreSQL via Prisma — see the companion
`database-schema.dbml` file for the full ERD to paste into dbdiagram.io.
Tables: `users`, `categories` (self-relation for hierarchy), `products`,
`orders`, `order_items`, `payments`. Index: `products.sku` (unique),
`payments.transaction_id` (unique), `orders.user_id`, `categories.parent_id`.

## 3. Algorithms (§2.2.3) — deterministic, not incidental

- **Order totals**: snapshot `price` on each `OrderItem` at creation time.
  `subtotal = price * quantity` (integer minor units — cents/poisha, never
  float). `order.total_amount = sum(item.subtotal)`. Recomputation must be
  pure/deterministic — same inputs, same output, every time.
- **Stock reduction**: only inside the transaction that marks an order
  `paid`, using a conditional update (`UPDATE products SET stock = stock - :qty
WHERE id = :id AND stock >= :qty`) so concurrent checkouts can't oversell.
  If the conditional update affects 0 rows, roll back the whole payment
  confirmation and mark it failed — don't silently accept negative stock.

## 4. Payment strategy pattern (§2.2.4)

```
interface PaymentProviderStrategy {
  createPayment(order: Order): Promise<ProviderPaymentHandle>;
  confirmPayment(handle: ProviderPaymentHandle): Promise<PaymentResult>;
  queryPayment(transactionId: string): Promise<PaymentResult>;
  verifyWebhook(rawBody: Buffer, signature: string): WebhookEvent;
}
```

- `StripeStrategy implements PaymentProviderStrategy`
- `BkashStrategy implements PaymentProviderStrategy`
- `PaymentService` is injected with a `Map<string, PaymentProviderStrategy>`
  (or a small factory) keyed by `provider` — it must never `if (provider ===
'stripe')` branch on provider-specific logic. Adding a 3rd provider later
  = one new class + one registry entry, zero changes to `OrderService`.
- Delegate to `payment-agent` (see `.claude/agents/payment-agent.md`) for
  all work in this area — it has the idempotency/webhook rules baked in.

## 5. DFS + Redis caching (§2.2.5)

- Categories form a tree via `parentId`. Implement DFS traversal
  (`CategoryService.getDescendants(categoryId)`) to build the "related
  products" set for recommendations.
- Cache the traversal result in Redis: key `category:tree:{id}`, TTL ~1h.
  Invalidate on category or product create/update/delete under that
  subtree. Use `@nestjs/cache-manager` + `cache-manager-redis-store` or a
  direct `ioredis` client — pick one and document the choice in
  `.claude/memory/decisions.md`.
- Delegate to `product-agent` for this module.

## 6. API surface (build with Swagger decorators throughout)

**Auth** (`auth-agent`)

- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`

**Users**

- `GET /users/me`, `GET /users/me/orders`, `GET /users/me/payments`

**Products** (`product-agent`)

- `GET /products`, `GET /products/:id`, `GET /products/:id/recommendations`
- `POST /products`, `PATCH /products/:id`, `DELETE /products/:id` (admin)

**Categories** (`product-agent`)

- `GET /categories` (tree), `POST /categories` (admin), etc.

**Orders** (`order-agent`)

- `POST /orders` (cart → order, status `pending`)
- `GET /orders/:id`
- `POST /orders/:id/checkout` — body: `{ provider: 'stripe' | 'bkash' }`

**Payments** (`payment-agent`)

- `POST /payments/stripe/webhook` (raw body, signature verification)
- `POST /payments/bkash/callback`
- `GET /payments/:id`

## 7. Non-functional (§3)

- Prisma migrations (`prisma migrate dev` locally, `migrate deploy` in CI/prod)
- Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`
- Store Stripe/bKash secrets in `.env`, never commit, never log
- Global exception filter → consistent `{ success, message, data }` error
  shape (matches your usual FE contract convention)
- Winston or Nest's built-in Logger with request-id correlation

## 8. Deliverables checklist (map directly to §4 of the assessment)

- [ ] Prisma schema + migrations + `prisma/seed.ts` (admin user + sample products)
- [ ] Swagger docs at `/api/docs`
- [ ] Postman collection exported alongside Swagger
- [ ] Unit tests: `User`, `Product`, `Order`, `Payment` domain classes
- [ ] e2e tests: register/login, create order, checkout (mock provider),
      webhook handling
- [ ] Stripe test-mode + bKash sandbox wired end-to-end
- [ ] Dockerfile + docker-compose (API + Postgres + Redis)
- [ ] README: env setup, ngrok instructions for local webhook testing
- [ ] `.claude/modules/*.md` updated for each module you touch (auth,
      products, orders, payments) — this is how the next session (or a
      reviewer skimming your process) sees your reasoning trail

## 9. Suggested build order

1. Prisma schema + migrations + seed
2. Auth module (auth-agent)
3. Products + Categories + Redis cache + DFS (product-agent)
4. Orders + total/subtotal algorithm (order-agent)
5. Payment strategy interface + Stripe + bKash (payment-agent)
6. Webhooks + idempotency
7. Swagger + Postman export
8. Tests (unit first, then e2e)
9. Docker + README + deployment docs

Work module by module, run `/r-task` per step, and keep
`.claude/memory/decisions.md` updated as you make each non-obvious choice
(e.g. cents vs Decimal, JWT storage, Redis client choice) — reviewers value
seeing _why_, not just the final diff.
