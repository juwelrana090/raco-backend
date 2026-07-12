#!/bin/sh
set -e

echo "🗄️  Running database migrations..."
npx prisma migrate deploy

echo "🚀 Starting raco-backend..."
exec node dist/main
