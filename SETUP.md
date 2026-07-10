# 🚀 Quick Setup Guide

This guide will help you get the raco-backend e-commerce system running in under 10 minutes.

## Prerequisites Check

Before starting, ensure you have:

- [ ] Node.js 18+ installed
- [ ] pnpm installed (`npm install -g pnpm`)
- [ ] Docker Desktop running
- [ ] Git installed

## Step 1: Clone and Install (2 minutes)

```bash
# Clone the repository
git clone <repository-url>
cd raco-backend

# Install dependencies
pnpm install
```

## Step 2: Start Docker Services (1 minute)

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify containers are running
docker-compose ps
```

Expected output:
```
raco-backend-postgres   running
raco-backend-redis      running
```

## Step 3: Generate JWT Secrets (1 minute)

```bash
# Generate JWT secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output and add to your `.env` file.

## Step 4: Initialize Database (2 minutes)

```bash
# Generate Prisma client
pnpm run prisma:generate

# Run migrations
pnpm run prisma:migrate

# Seed database
pnpm run prisma:seed
```

## Step 5: Start the API (1 minute)

```bash
# Start development server
pnpm run start:dev
```

You should see:
```
╔═════════════════════════════════════════════════════╗
║           🚀 Raco E-commerce API Started            ║
╠═════════════════════════════════════════════════════╣
║  Environment: development                            ║
║  Port: 4000                                          ║
║  API Prefix: /api/v1                                ║
║  Swagger: http://localhost:4000/api/docs            ║
╚═════════════════════════════════════════════════════╝
```

## Step 6: Test the API

```bash
# Test health endpoint
curl http://localhost:4000/api/v1/health

# Test user registration
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@123","name":"Test User"}'

# Visit Swagger documentation
open http://localhost:4000/api/docs
```

## Default Admin User

After seeding, you can log in with:

- **Email**: `admin@racocommerce.com`
- **Password**: `Admin@123`

## Troubleshooting

### Docker containers not starting?

```bash
# Check Docker Desktop is running
docker --version

# Restart Docker
docker-compose down
docker-compose up -d
```

### Database connection errors?

```bash
# Check database is running
docker-compose logs postgres

# Reset database (WARNING: destroys data)
pnpm run prisma:reset
```

### Port already in use?

```bash
# Check what's using port 4000
lsof -i :4000  # macOS/Linux
netstat -ano | findstr :4000  # Windows

# Change port in .env
PORT=3000
```

### Prisma errors?

```bash
# Regenerate Prisma client
pnpm run prisma:generate

# Reset database
pnpm run prisma:reset
```

## Next Steps

1. **Set up payment gateways** (optional for development)
   - Get Stripe test keys from https://dashboard.stripe.com/test/apikeys
   - Get bKash sandbox credentials from https://developer.bka.sh/

2. **Set up S3 storage** (optional for development)
   - Use AWS S3, DigitalOcean Spaces, or MinIO
   - Or use LocalStack for local development

3. **Run tests**
   ```bash
   pnpm run test          # Unit tests
   pnpm run test:e2e      # E2E tests
   pnpm run test:cov      # Test coverage
   ```

4. **Build for production**
   ```bash
   pnpm run build
   NODE_ENV=production pnpm run start:prod
   ```

## Development Workflow

```bash
# Watch mode (auto-reload on changes)
pnpm run start:dev

# Format code
pnpm run format

# Lint code
pnpm run lint

# Fix lint issues
pnpm run lint -- --fix
```

## Useful Commands

```bash
# Database management
pnpm run prisma:studio           # Open Prisma Studio
pnpm run prisma:generate         # Generate Prisma client
pnpm run prisma:migrate          # Run migrations
pnpm run prisma:seed             # Seed database
pnpm run prisma:reset            # Reset database (⚠️ destroys data)

# Docker management
docker-compose up -d             # Start services
docker-compose down              # Stop services
docker-compose logs -f            # View logs
docker-compose ps                 # Check status
```

## Environment Variables

Critical variables that must be set:

```bash
# Database (configured in docker-compose)
DATABASE_URL=postgresql://user:password@localhost:5432/raco_backend?schema=public

# JWT (generate these - REQUIRED!)
JWT_SECRET=<64-char hex string>
JWT_REFRESH_SECRET=<64-char hex string>

# Payment (optional for development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
BKASH_APP_KEY=...
BKASH_APP_SECRET=...

# S3 (optional for development)
AWS_BUCKET=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

## Getting Help

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Check the error message carefully
3. Try the troubleshooting steps above
4. Check the main README.md for detailed documentation

## Success Criteria

You'll know everything is working when:

- [ ] Docker containers are running (`docker-compose ps`)
- [ ] API starts without errors (`pnpm run start:dev`)
- [ ] Health endpoint returns 200 (`curl http://localhost:4000/api/v1/health`)
- [ ] Swagger docs are accessible (http://localhost:4000/api/docs)
- [ ] Can register a new user via Swagger
- [ ] Can login and get JWT token

**Estimated total setup time: 5-10 minutes**
