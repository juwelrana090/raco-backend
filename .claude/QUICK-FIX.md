# Quick Fix for raco-backend Plesk Deployment

## Current Issue
- **pnpm is not installed** on your server
- **Phusion Passenger** can't start the NestJS application
- Application returns "Web application could not be started" error

## Immediate Fix (Run these commands on your server)

### Step 1: Install pnpm
```bash
npm install -g pnpm
```

### Step 2: Install dependencies
```bash
cd /var/www/vhosts/raco-backend.madrasah.dev/httpdocs
pnpm install
```

### Step 3: Build the application
```bash
pnpm build
```

### Step 4: Configure Passenger
```bash
# Create passenger.json configuration
cat > passenger.json << 'EOF'
{
  "app_type": "node",
  "startup_file": "dist/main.js",
  "environment": "production"
}
EOF
```

### Step 5: Verify .env file
```bash
# If .env doesn't exist, create it from example
if [ ! -f .env ]; then
    cp .env.example .env
    echo "⚠️  Please edit .env with production values!"
    nano .env
fi
```

### Step 6: Generate Prisma client
```bash
pnpm prisma:generate
```

### Step 7: Run database migrations
```bash
pnpm prisma:migrate:deploy
```

### Step 8: Restart Passenger
```bash
touch tmp/restart.txt
```

### Step 9: Test the application
```bash
# Test health endpoint
curl https://raco-backend.madrasah.dev/api-info

# Test API docs
curl https://raco-backend.madrasah.dev/api-docs
```

## All-in-One Solution

If you want to run everything at once (after installing pnpm):

```bash
# Install pnpm first
npm install -g pnpm

# Then run the deployment script
cd /var/www/vhosts/raco-backend.madrasah.dev/httpdocs
bash deploy.sh
```

## Alternative: Use npm instead of pnpm

If you prefer not to install pnpm:

```bash
# Install dependencies with npm
npm install

# Build with npm
npm run build

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Start the app
node dist/main.js
```

## Verification

After completing the steps, visit these URLs in your browser:

- **API Docs**: https://raco-backend.madrasah.dev/api-docs
- **API JSON**: https://raco-backend.madrasah.dev/api-json  
- **Health Check**: https://raco-backend.madrasah.dev/api-info

If you see the Passenger error page again, check the logs:

```bash
tail -n 50 /var/log/passenger-error.log
```

## Common Issues

### Issue: "Cannot find module" errors
**Fix**: Make sure you ran `pnpm install` or `npm install`

### Issue: Database connection errors  
**Fix**: Check your `.env` file has correct `DATABASE_URL`

### Issue: "Port already in use"
**Fix**: Kill any existing Node.js processes:
```bash
pkill -f "node.*dist/main.js"
```

---

**Expected Result**: After these steps, your `/api-docs` endpoint should work instead of returning a 404 or Passenger error.
