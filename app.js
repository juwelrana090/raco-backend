'use strict';

const path = require('path');
const fs   = require('fs');

// Load .env (Plesk env vars take priority — never overwrite them)
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const idx = t.indexOf('=');
    if (idx === -1) return;
    const key = t.slice(0, idx).trim();
    const val = t.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val; // Plesk vars win
  });
}

// Defaults
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';

// Guard: dist must exist
const distMain = path.join(__dirname, 'dist', 'main.js');
if (!fs.existsSync(distMain)) {
  console.error('[FATAL] dist/main.js not found. Run: npm run build');
  process.exit(1);
}

// Guard: DATABASE_URL must be set
if (!process.env.DATABASE_URL) {
  console.error('[FATAL] DATABASE_URL is not set');
  process.exit(1);
}

require(distMain);