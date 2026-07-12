#!/bin/bash
# Plesk Deployment Script for raco-backend
# Usage: ./deploy.sh

set -e

echo "🚀 Deploying raco-backend to Plesk..."
echo "================================================"

# Load environment variables
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file with production values."
    exit 1
fi

# Check if running as root or www-data
if [ "$USER" != "root" ] && [ "$USER" != "www-data" ]; then
    echo "⚠️  Warning: Not running as root or www-data"
    echo "You may need sudo for some operations"
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# Generate Prisma client
echo "🗄️  Generating Prisma client..."
pnpm prisma:generate

# Run database migrations
echo "🔄 Running database migrations..."
pnpm prisma:migrate:deploy

# Build the application
echo "🔨 Building application..."
pnpm build

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 PM2 not found. Installing PM2 globally..."
    npm install -g pm2
fi

# Stop existing process if running
if pm2 list | grep -q "raco-backend"; then
    echo "🛑 Stopping existing raco-backend process..."
    pm2 stop raco-backend
    pm2 delete raco-backend
fi

# Start with PM2
echo "🚀 Starting raco-backend with PM2..."
pm2 start dist/main.js --name raco-backend -- --port 4000

# Save PM2 configuration
pm2 save

# Setup PM2 startup if not already configured
if ! pm2 startup | grep -q "startup"; then
    echo "⚙️  Configuring PM2 startup..."
    pm2 startup systemd -u www-data --hp /var/www
fi

echo ""
echo "✅ Deployment complete!"
echo "================================================"
echo "📊 Application Status:"
pm2 status raco-backend
echo ""
echo "📋 Recent Logs:"
pm2 logs raco-backend --lines 20 --nostream
echo ""
echo "🌐 Application URLs:"
echo "   API Docs:   https://raco-backend.madrasah.dev/api-docs"
echo "   API JSON:   https://raco-backend.madrasah.dev/api-json"
echo "   Health:     https://raco-backend.madrasah.dev/api-info"
echo "   Postman:    https://raco-backend.madrasah.dev/postman"
echo ""
echo "📝 Useful Commands:"
echo "   pm2 logs raco-backend      - View real-time logs"
echo "   pm2 monit                  - Monitor performance"
echo "   pm2 restart raco-backend   - Restart application"
echo "   pm2 stop raco-backend      - Stop application"
echo ""
