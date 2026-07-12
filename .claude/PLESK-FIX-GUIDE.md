# Quick Fix Guide for Plesk Deployment

## Problem
- ✅ `/api-json` works (app is running)
- ❌ `/api-docs` returns 404 (Apache proxy issue)

## 5-Minute Fix

### Step 1: SSH into your Plesk server
```bash
ssh your-user@raco-backend.madrasah.dev
```

### Step 2: Navigate to your application directory
```bash
cd /var/www/vhosts/raco-backend.madrasah.dev/httpdocs
```

### Step 3: Test if the app is running locally
```bash
curl http://localhost:4000/api-docs
```

**Expected result**: HTML content returned  
**If connection refused**: Your Node.js app is not running - skip to Step 6

### Step 4: Add Apache proxy rules

Choose ONE method:

#### Option A: Using .htaccess (Easier)
```bash
# Copy the .htaccess file we created
cp .htaccess.plesk .htaccess
```

#### Option B: Using Plesk UI
1. Login to Plesk
2. Go to: Websites & Domains → raco-backend.madrasah.dev
3. Click: Apache & nginx Settings
4. In "Additional Apache directives", add:
```apache
ProxyPass /api-docs http://localhost:4000/api-docs
ProxyPassReverse /api-docs http://localhost:4000/api-docs
ProxyPass /api-json http://localhost:4000/api-json
ProxyPassReverse /api-json http://localhost:4000/api-json
ProxyPass /api/ http://localhost:4000/api/
ProxyPassReverse /api/ http://localhost:4000/api/
```
5. Click Apply

### Step 5: Restart Apache
```bash
# On Plesk/CentOS
systemctl restart httpd

# On Plesk/Ubuntu
systemctl restart apache2

# Or via Plesk UI: Tools & Settings → Services → Apache → Restart
```

### Step 6: Install PM2 (if app not running)
```bash
# Install PM2
npm install -g pm2

# Start your app
pm2 start dist/main.js --name raco-backend

# Configure PM2 to start on boot
pm2 startup
pm2 save
```

### Step 7: Test the fix
```bash
# Test locally
curl http://localhost:4000/api-docs

# Test externally
curl https://raco-backend.madrasah.dev/api-docs

# Or visit in browser: https://raco-backend.madrasah.dev/api-docs
```

## Verification Checklist

- [ ] App responds on localhost:4000
- [ ] `/api-docs` returns 200 (not 404)
- [ ] `/api-json` still works
- [ ] `/api/v1` endpoints work
- [ ] PM2 shows app as "online"
- [ ] `pm2 logs raco-backend` shows no errors

## What If It Still Doesn't Work?

### Check Apache error logs
```bash
tail -f /var/www/vhosts/raco-backend.madrasah.dev/logs/error_log
```

### Check PM2 logs
```bash
pm2 logs raco-backend --lines 100
```

### Check if Node.js is actually running
```bash
ps aux | grep node
netstat -tlnp | grep 4000
```

### Check .env file exists
```bash
ls -la .env
cat .env | head -20
```

## Full Deployment (if starting from scratch)

If your app isn't built or deployed yet:

```bash
cd /var/www/vhosts/raco-backend.madrasah.dev/httpdocs

# Make deploy script executable
chmod +x deploy.sh

# Run full deployment
./deploy.sh
```

## Need Help?

Check the full audit report:
```bash
cat .claude/tasks/logs/2026-07-12-plesk-deployment-audit.md
```

---

**Expected outcome**:  
After these steps, visiting `https://raco-backend.madrasah.dev/api-docs` should show the interactive API documentation instead of a 404 error.
