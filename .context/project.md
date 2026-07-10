# Project: raco-backend

- **Type**: Backend API (NestJS)
- **Stack**: Node.js
- **Domain**: E-commerce ordering & payment system
- **Core entities**: Users, Products, Categories, Orders, OrderItems, Payments
- **Payment providers**: Stripe, bKash (strategy pattern — pluggable)
- **File storage**: AWS S3 `ap-southeast-1` — product images (`products/{id}/...`)
- **Caching**: Redis for category tree (DFS traversal results)
- **Auth**: JWT (access + refresh)
- **DB**: PostgreSQL + Prisma ORM
- **Status**: [MVP / In Progress / Done] — update as work proceeds

See `.context/architecture.md` for system design and
`.claude/memory/` for the full living memory (rules, patterns, gotchas).
