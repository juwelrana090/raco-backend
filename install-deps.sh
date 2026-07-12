#!/bin/bash
# Quick dependency installer for raco-backend
# Run this first if you get 'pnpm: command not found' error

echo "🔧 Installing dependencies for raco-backend..."
echo "================================================"

# Install pnpm globally
echo "📦 Installing pnpm globally..."
npm install -g pnpm

# Verify installation
echo "✅ Verifying pnpm installation..."
pnpm --version

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Now you can run: bash deploy.sh"
echo ""
