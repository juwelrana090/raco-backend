# Phusion Passenger Deployment Guide for raco-backend

## Critical Issue Identified

Your Plesk server is using **Phusion Passenger** to run Node.js apps, not direct Node.js with Apache proxying. The error shows:

```
Web application could not be started by the Phusion Passenger application server.
```

This means:
- ❌ Your NestJS app is NOT running
- ❌ Passenger can't find or start the application
- ❌ The 404 errors are because Passenger failed to startup

---

## Diagnosis Steps

### 1. Check Passenger Error Logs

```bash
# Look for the specific error ID in Passenger logs
tail -n 500 /var/log/passenger-error.log | grep -A 20 "bd65d5c2"

# Or check the main Passenger log
tail -n 100 /var/log/passenger-error.log

# Also check domain-specific logs
tail -n 100 /var/www/vhosts/raco-backend.madrasah.dev/logs/error_log
```

### 2. Check if Application is Built

```bash
cd /var/www/vhosts/raco-backend.madrasah.dev/httpdocs

# Check if dist folder exists
ls -la dist/

# Check if main.js exists
ls -la dist/main.js

# If dist/ doesn't exist, the app isn't built!
```

### 3. Check Node.js Version

```bash
# Check Node version (Passenger needs compatible version)
node --version

# Check if dependencies are installed
ls -la node_modules/

# If node_modules/ is missing or very small, dependencies aren't installed
```

---

## Root Cause

Phusion Passenger expects Node.js apps to be **startup-ready**. For NestJS, this means:

1. ✅ Code must be **compiled** to JavaScript (dist/ folder)
2. ✅ Dependencies must be **installed** (node_modules/)
3. ✅ Proper **startup file** or Passenger configuration
4. ✅ **Environment variables** configured
5. ✅ **Port detection** - Passenger passes port via environment variable

---

## Fix Instructions

### Step 1: Build the Application

```bash
cd /var/www/vhosts/raco-backend.madrasah.dev/httpdocs

# Install pnpm if not available
npm install -g pnpm

# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate:deploy

# Build the NestJS application
pnpm build

# Verify build was successful
ls -la dist/main.js  # Should exist now
```

### Step 2: Create Passenger Startup Configuration

Create `passenger.json` in the root directory:

```bash
cat > passenger.json << 'EOF'
{
  "app_type": "node",
  "startup_file": "dist/main.js",
  "environment": "production",
  "envvars": {
    "NODE_ENV": "production",
    "PORT": "4000"
  }
}
EOF
```

### Step 3: Create .htaccess for Passenger

```bash
cat > .htaccess << 'EOF'
# Phusion Passenger configuration
PassengerAppRoot /var/www/vhosts/raco-backend.madrasah.dev/httpdocs
PassengerNodejs /usr/bin/node
PassengerAppEnv production
PassengerStartupFile dist/main.js

# Ensure Passenger serves all routes
PassengerBaseURI /
```

### Step 4: Configure Environment Variables

```bash
# Ensure .env file exists and is configured
ls -la .env

# If missing, copy from example
cp .env.example .env

# Edit .env with production values
nano .env
```

### Step 5: Fix Port Detection in main.ts

Phusion Passenger sets the port via environment variable, not fixed PORT. Your `main.ts` should handle this:

```bash
# Backup original main.ts
cp dist/main.js dist/main.js.backup

# Check if your main.ts handles PORT from environment
grep -n "process.env.PORT" src/main.ts
```

**Your current main.ts already handles this correctly (line 109):**
```typescript
const port = process.env.PORT ?? 4000;
```

So this should work fine with Passenger.

### Step 6: Restart Passenger Application

In Plesk UI:
1. Go to: Websites & Domains → raco-backend.madrasah.dev
2. Click: "Show Advanced" → "Restart Node.js App"
   
OR via command line:

```bash
# Create a restart file to trigger Passenger restart
touch tmp/restart.txt

# Or restart via Plesk command
plesk bin domain --restart-nodejs-app raco-backend.madrasah.dev
```

### Step 7: Monitor Passenger Logs

```bash
# Watch Passenger logs in real-time
tail -f /var/log/passenger-error.log

# Also monitor domain logs
tail -f /var/www/vhosts/raco-backend.madrasah.dev/logs/error_log

# In another terminal, test the site
curl https://raco-backend.madrasah.dev/api-info
```

---

## Alternative: Disable Passenger and Use PM2

If Passenger continues to have issues, you can disable it and use PM2 instead:

### 1. Disable Passenger in Plesk

1. Go to: Websites & Domains → raco-backend.madrasah.dev
2. Click: "Node.js" tab
3. Click "Disable"
4. This will stop Passenger from trying to manage the app

### 2. Set Up PM2 Process Manager

```bash
# Install PM2 globally
npm install -g pm2

# Start the application with PM2
cd /var/www/vhosts/raco-backend.madrasah.dev/httpdocs
pm2 start dist/main.js --name raco-backend

# Save PM2 configuration
pm2 save

# Configure PM2 to start on boot
pm2 startup systemd
```

### 3. Configure Apache to Proxy to PM2

Use the `.htaccess.plesk` file we created earlier:

```bash
cp .htaccess.plesk .htaccess

# Restart Apache (NOT Passenger)
# For CentOS/RHEL:
systemctl restart httpd

# For Debian/Ubuntu:
systemctl restart apache2
```

---

## Common Passenger Issues & Solutions

### Issue 1: "Cannot find module"

**Error**: `Error: Cannot find module '@nestjs/core'`

**Solution**:
```bash
pnpm install
# Make sure you're in the httpdocs directory
```

### Issue 2: "Port already in use"

**Error**: `EADDRINUSE: address already in use :::4000`

**Solution**:
```bash
# Kill any process using port 4000
lsof -ti:4000 | xargs kill -9

# Or let Passenger choose the port automatically
# Remove fixed PORT from .env
```

### Issue 3: Database Connection Error

**Error**: `Can't reach database server`

**Solution**:
```bash
# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL

# Test PostgreSQL connection
psql $DATABASE_URL

# Regenerate Prisma client
pnpm prisma:generate
```

### Issue 4: Prisma Client Not Generated

**Error**: `Error: @prisma/client did not initialize yet`

**Solution**:
```bash
# Generate Prisma client
pnpm prisma:generate

# Verify .prisma/client exists
ls -la node_modules/.prisma/client
```

---

## Verification Checklist

After deployment, verify each item:

- [ ] `dist/main.js` exists and is compiled
- [ ] `node_modules/` contains dependencies
- [ ] `.env` file is configured with production values
- [ ] `passenger.json` or `.htaccess` configured
- [ ] Passenger error logs show no errors
- [ ] `curl https://raco-backend.madrasah.dev/api-info` returns JSON
- [ ] `curl https://raco-backend.madrasah.dev/api-docs` returns HTML (not 404)
- [ ] Application serves API requests correctly

---

## Expected Logs When Working

**Passenger logs should show**:
```
App starting (PID 12345)
App 'raco-backend' running on port 4000
🚀 Running on http://localhost:4000/api/v1
📚 API Docs:  http://localhost:4000/api-docs
```

**Not**:
```
Web application could not be started
Error ID: bd65d5c2
```

---

## Get Help

If issues persist:

1. **Check Passenger logs first**:
   ```bash
   tail -n 500 /var/log/passenger-error.log
   ```

2. **Check domain error logs**:
   ```bash
   tail -n 500 /var/www/vhosts/raco-backend.madrasah.dev/logs/error_log
   ```

3. **Verify build process**:
   ```bash
   # Run build with verbose output
   pnpm build --verbose
   ```

4. **Test Node.js directly** (bypass Passenger):
   ```bash
   # Stop Passenger
   touch tmp/restart.txt
   
   # Start manually to see errors
   node dist/main.js
   ```

---

## Summary

**Root Cause**: Your application isn't built, and Passenger can't start uncompiled NestJS apps.

**Solution**: 
1. Build the app: `pnpm build`
2. Configure Passenger: `passenger.json` 
3. Restart Passenger: `touch tmp/restart.txt`

**Alternative**: Disable Passenger, use PM2 + Apache proxy (more reliable for NestJS)

The 404 errors you saw are symptoms of Passenger failing to start the app, not routing issues.
