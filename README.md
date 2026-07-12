# raco-backend — E-commerce Ordering & Payment System

> A production-quality NestJS backend for e-commerce with multi-provider payment support, category-based recommendations, and comprehensive testing.

## 🚀 Tech Stack

- **Framework**: NestJS 11 with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for category-tree caching and performance
- **Auth**: JWT with refresh tokens, bcrypt password hashing
- **Payments**: Strategy pattern supporting Stripe and bKash
- **File Storage**: AWS S3 compatible (S3, DigitalOcean Spaces, MinIO)
- **Docs**: Swagger/OpenAPI with Postman export
- **Testing**: Jest for unit + e2e tests
- **Containerization**: Docker Compose for local development

## 📋 Features

- ✅ User authentication with JWT (access + refresh tokens)
- ✅ Product catalog with categories and stock management
- ✅ Category hierarchy with DFS-based recommendations
- ✅ Order management with deterministic totals
- ✅ Payment strategy pattern (Stripe + bKash)
- ✅ Secure webhook handlers with idempotency
- ✅ Admin role for product/category management
- ✅ Image upload to S3 for products
- ✅ Comprehensive API documentation with Swagger
- ✅ Full test coverage (unit + e2e)
- ✅ Docker Compose for instant local setup

## 🛠️ Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18+): [Download](https://nodejs.org/)
- **pnpm**: `npm install -g pnpm`
- **Docker Desktop** (for PostgreSQL + Redis): [Download](https://www.docker.com/products/docker-desktop)
- **ngrok** (for local webhook testing): [Download](https://ngrok.com/download)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd raco-backend
pnpm install
```

### 2. Start Docker Services

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify containers are running
docker-compose ps
```

### 3. Configure Environment

```bash
# Copy .env.example to .env (already done if you followed the setup)
cp .env.example .env

# Generate JWT secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Edit .env and add the generated secrets
# nano .env  # or use your preferred editor
```

### 4. Initialize Database

```bash
# Generate Prisma client
pnpm run prisma:generate

# Run database migrations
pnpm run prisma:migrate

# Seed database with admin user and sample products
pnpm run prisma:seed
```

### 5. Start Development Server

```bash
# Start NestJS in watch mode
pnpm run start:dev

# API will be available at http://localhost:4000
# Swagger docs at http://localhost:4000/api/docs
```

## 🔑 Default Admin User

After seeding, you can log in with:

- **Email**: `admin@racocommerce.com`
- **Password**: `Admin@123`
- **Role**: Admin

## 🧪 Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

## 📚 API Documentation

### Swagger UI

Once the server is running, visit:

```
http://localhost:4000/api/docs
```

## 🔐 Environment Variables

See [.env.example](.env.example) for all available environment variables.

### Required for Development

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/raco_backend?schema=public

# JWT Secrets (generate these!)
JWT_SECRET=<64-char hex string>
JWT_REFRESH_SECRET=<64-char hex string>

# Payment Gateways (get these from dashboards)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
BKASH_APP_KEY=...
BKASH_APP_SECRET=...

# S3/Compatible Storage
AWS_BUCKET=your-bucket-name
AWS_DEFAULT_REGION=your-region
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

## 🌐 Testing Webhooks Locally

### Stripe Webhooks

```bash
# Install Stripe CLI
npm install -g stripe

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:4000/api/v1/payments/stripe/webhook

# This will give you a webhook signing secret
# Add it to your .env: STRIPE_WEBHOOK_SECRET=whsec_...
```

### bKash Webhooks

For bKash, you'll need a public HTTPS endpoint:

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok tunnel
ngrok http 4000

# Update BKASH_CALLBACK_URL in .env
# BKASH_CALLBACK_URL=https://abc123.ngrok-free.app/api/v1/payments/bkash/callback
```

## 🐳 Docker Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Remove volumes (⚠️ deletes all data)
docker-compose down -v
```

## 📦 Project Structure

```
raco-backend/
├── src/
│   ├── modules/
│   │   ├── auth/          # Authentication & authorization
│   │   ├── users/         # User management
│   │   ├── products/      # Product CRUD
│   │   ├── categories/    # Category hierarchy + DFS
│   │   ├── orders/        # Order management + totals
│   │   ├── payments/      # Payment strategy + webhooks
│   │   └── s3/            # File upload service
│   ├── common/
│   │   ├── prisma/        # Prisma service
│   │   ├── filters/       # Exception filters
│   │   ├── guards/        # Auth guards
│   │   └── decorators/    # Custom decorators
│   └── main.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── test/
│   ├── unit/              # Unit tests
│   └── e2e/               # E2E tests
├── .claude/               # AI agent configs and memory
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🔧 Development Workflow

### Making Database Changes

```bash
# Modify prisma/schema.prisma

# Create migration
pnpm run prisma:migrate

# If you mess up, reset (⚠️ destroys data)
pnpm run prisma:reset

# View database in Prisma Studio
pnpm run prisma:studio
```

### Code Style

```bash
# Format code
pnpm run format

# Lint code
pnpm run lint

# Fix lint issues
pnpm run lint -- --fix
```

## 🏗️ Architecture Highlights

### Payment Strategy Pattern

The system uses a strategy pattern for payments, making it easy to add new providers:

```typescript
interface PaymentProviderStrategy {
  createPayment(order: Order): Promise<ProviderPaymentHandle>;
  confirmPayment(handle: ProviderPaymentHandle): Promise<PaymentResult>;
  queryPayment(transactionId: string): Promise<PaymentResult>;
  verifyWebhook(rawBody: Buffer, signature: string): WebhookEvent;
}
```

### Deterministic Order Totals

Order totals are computed deterministically:

```typescript
// Price snapshot at order time (in minor units)
subtotal = price * quantity;
total_amount = sum(item.subtotal);
```

### Safe Stock Reduction

Stock is only reduced after successful payment:

```typescript
// Conditional update prevents overselling
UPDATE products
SET stock = stock - :qty
WHERE id = :id AND stock >= :qty
```

### Category Recommendations

Uses DFS traversal to find related products:

```typescript
// Cache results in Redis for ~1 hour
category:tree:{id} -> [descendant_category_ids]
```

## 📝 API Endpoints

### Interactive Documentation

| Resource | URL | Description |
|----------|-----|-------------|
| **Scalar UI** | `/api-docs` | Interactive API documentation |
| **Postman Collection** | `/postman` | Import directly into Postman |
| **OpenAPI JSON** | `/api-json` | Raw spec for code generation |
| **Health Check** | `/api-info` | System health and services |

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/auth/register` | Public | Register a new user |
| `POST` | `/api/v1/auth/login` | Public | Login and get JWT tokens |
| `POST` | `/api/v1/auth/refresh` | Public | Refresh access token |
| `POST` | `/api/v1/auth/logout` | JWT | Logout (invalidate refresh token) |
| `POST` | `/api/v1/auth/logout-all` | JWT | Logout from all devices |
| `GET` | `/api/v1/auth/validate` | JWT | Validate current token |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/users/me` | JWT | Get current user profile |
| `PUT` | `/api/v1/users/me` | JWT | Update current user profile |
| `GET` | `/api/v1/users/me/orders` | JWT | Get current user's orders |
| `GET` | `/api/v1/users/me/payments` | JWT | Get current user's payments |
| `GET` | `/api/v1/users` | Admin | Get all users (paginated) |
| `GET` | `/api/v1/users/:id` | Admin | Get user by ID |

### Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/products` | Public | List products (paginated, filterable) |
| `GET` | `/api/v1/products/:id` | Public | Get product details |
| `GET` | `/api/v1/products/:id/recommendations` | Public | Get recommended products |
| `POST` | `/api/v1/products` | Admin | Create a new product |
| `PATCH` | `/api/v1/products/:id` | Admin | Update a product |
| `DELETE` | `/api/v1/products/:id` | Admin | Delete a product |
| `POST` | `/api/v1/products/:id/image` | Admin | Upload product image |
| `DELETE` | `/api/v1/products/:id/image` | Admin | Delete product image |

### Categories

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/categories` | Public | Get category tree (nested) |
| `GET` | `/api/v1/categories/:id` | Public | Get category details |
| `GET` | `/api/v1/categories/:id/products` | Public | Get products in category |
| `POST` | `/api/v1/categories` | Admin | Create a new category |
| `PATCH` | `/api/v1/categories/:id` | Admin | Update a category |
| `DELETE` | `/api/v1/categories/:id` | Admin | Delete a category |
| `POST` | `/api/v1/categories/:id/image` | Admin | Upload category image |
| `DELETE` | `/api/v1/categories/:id/image` | Admin | Delete category image |

### Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/orders` | JWT | Create order from cart items |
| `GET` | `/api/v1/orders` | JWT | Get current user's orders |
| `GET` | `/api/v1/orders/:id` | JWT | Get order details |
| `POST` | `/api/v1/orders/:id/checkout` | JWT | Initiate payment |
| `DELETE` | `/api/v1/orders/:id` | JWT | Cancel order (pending only) |
| `GET` | `/api/v1/orders/admin/all` | Admin | Get all orders (paginated) |

### Payments

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/payments` | JWT | Create payment for an order |
| `GET` | `/api/v1/payments/:paymentId` | JWT | Get payment details |
| `GET` | `/api/v1/payments/order/:orderId` | JWT | Get payments for an order |
| `GET` | `/api/v1/payments/admin/all` | Admin | Get all payments (paginated) |
| `POST` | `/api/v1/payments/stripe/webhook` | Public | Stripe webhook handler |
| `POST` | `/api/v1/payments/bkash/callback` | Public | bKash callback handler |

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1` | Public | Basic health check |
| `GET` | `/api/v1/health` | Public | Detailed health check |

**Total: 43 endpoints**

## 🧪 Test Coverage

The project includes comprehensive tests:

- **Unit Tests**: Domain classes (User, Product, Order, Payment)
- **E2E Tests**: Complete flows (register → login → order → checkout → webhook)

## 🔒 Security Features

- ✅ Passwords hashed with bcrypt (12 rounds)
- ✅ JWT with short-lived access tokens (15min)
- ✅ Refresh tokens with revocation support
- ✅ Route guards for authorization
- ✅ Input validation with class-validator
- ✅ SQL injection prevention via Prisma
- ✅ Webhook signature verification
- ✅ Idempotent webhook handlers
- ✅ Ownership checks in service layer

## 🚀 Deployment

### Production Checklist

- [ ] Update `JWT_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Use production database URL
- [ ] Configure production Redis instance
- [ ] Use production Stripe/bKash keys
- [ ] Set up proper S3 bucket with CDN
- [ ] Enable HTTPS
- [ ] Configure CORS for production frontend
- [ ] Set up proper logging and monitoring
- [ ] Run database migrations: `pnpm run prisma:migrate:deploy`

### Build for Production

```bash
# Build the project
pnpm run build

# Start production server
NODE_ENV=production pnpm run start:prod
```

## 📄 License

UNLICENSED

## 👤 Author

Backend Engineer Assessment Project

---

**Built with ❤️ using NestJS and TypeScript**

## 🧠 Claude AI Development System

This project uses a shared Claude Code memory system in `.claude/`

### First time setup
```bash
npm install -g @anthropic-ai/claude-code
claude
```
Then add your name to `.claude/settings.local.json`:
```json
{ "developerName": "Your Name Here" }
```
Then run `/r-memory-scan` to build your memory.

### Daily workflow
```
/r-start              → load memory, see project status
/r-todo               → see all pending tasks
/r-pickup             → pick up a task to work on
/r-task [desc]        → execute any task
/r-plan [feature]     → plan a big feature before coding
/r-fix [desc]         → diagnose and fix a bug
/r-done               → mark current task as complete
/r-end                → end of day summary
```

### Team rules
- Commit all `.claude/` changes after tasks
- Only `settings.local.json` and `tasks/eod/` are personal/gitignored
- Add tasks for teammates with `/r-add-task`
- Update module memory after touching any module

