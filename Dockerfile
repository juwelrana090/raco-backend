# ─── Stage 1: Builder ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# OpenSSL required by Prisma on Alpine
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./

# Install ALL dependencies (dev included — needed for nest build)
RUN npm ci

# Copy source code
COPY . .

# Disable incremental build to prevent stale cache issues
RUN cat tsconfig.build.json | \
    node -e "const fs=require('fs'); let d=JSON.parse(fs.readFileSync('/dev/stdin','utf8')); d.compilerOptions.incremental=false; process.stdout.write(JSON.stringify(d,null,2));" \
    > tsconfig.build.tmp.json && mv tsconfig.build.tmp.json tsconfig.build.json

# Generate Prisma client
RUN npx prisma generate

# Build NestJS app
RUN npm run build

# ─── Stage 2: Production ─────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# OpenSSL required by Prisma on Alpine
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy compiled app from builder
COPY --from=builder /app/dist ./dist

# Copy Prisma generated client (both .prisma and @prisma/client)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Copy Prisma schema + migrations (needed for migrate deploy)
COPY prisma ./prisma

# Copy startup script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Create non-root user
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nestjs -u 1001 \
    && chown -R nestjs:nodejs /app

USER nestjs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/v1/health', (r) => { \
    process.exit(r.statusCode === 200 ? 0 : 1) \
  }).on('error', () => process.exit(1))"

# Entrypoint: run migrations then start app
ENTRYPOINT ["./docker-entrypoint.sh"]
