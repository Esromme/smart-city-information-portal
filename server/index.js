import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';

import { PORT, rootPath } from './config.js';
import { healthCheck, pool } from './db.js';
import { requireAdmin, authStatus } from './middleware/requireAdmin.js';
import { createRateLimiter } from './lib/rateLimit.js';

import announcements from './routes/announcements.js';
import services from './routes/services.js';
import locations from './routes/locations.js';
import stats from './routes/stats.js';
import weather from './routes/weather.js';

const app = express();

app.disable('x-powered-by');

// Only trust a forwarding proxy when explicitly configured.
if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

// Always allow the deployed frontend and local development. Additional
// origins from CORS_ORIGINS are additive, not a replacement.
const DEFAULT_ORIGINS = [
  'https://kombolcha-smart-city.vercel.app',
  'https://kombolcha-smart-city-4dmdcfe8y-esromme.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
];

const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...DEFAULT_ORIGINS, ...configuredOrigins]);

app.use(
  cors({
    origin(origin, callback) {
      // Same-origin and non-browser requests have no Origin header.
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })
);

// Basic security headers. A strict Content-Security-Policy is intentionally
// omitted because the app loads OpenStreetMap tiles and web fonts.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(self), camera=(), microphone=()'
  );
  next();
});

app.use(express.json({ limit: '256kb' }));

const apiLimiter = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 300,
});

app.use('/api', apiLimiter);

app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Check API and database health.
app.get('/api/health', async (_req, res) => {
  try {
    const info = await healthCheck();

    res.json({
      status: 'ok',
      database: info.database,
      time: info.now,
    });
  } catch (error) {
    console.error('[health] Database check failed:', error.message);

    res.status(503).json({
      status: 'degraded',
      error: 'Database unavailable',
    });
  }
});

// Verify that the current user is an authorized administrator.
app.get('/api/auth/me', requireAdmin, (req, res) => {
  res.json({
    user: req.user,
    isAdmin: true,
  });
});

// Public read endpoints and protected write endpoints
// are configured inside these route modules.
app.use('/api/announcements', announcements);
app.use('/api/services', services);
app.use('/api/service-locations', locations);
app.use('/api/stats', stats);
app.use('/api/weather', weather);

// Return a JSON 404 for unknown API endpoints.
app.use('/api', (_req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
  });
});

// Serve the built React application when available.
const clientDist = path.join(rootPath, 'client', 'dist');
const clientIndex = path.join(clientDist, 'index.html');

app.use(express.static(clientDist));

app.get(/^(?!\/api).*/, (_req, res, next) => {
  if (!fs.existsSync(clientIndex)) {
    return next();
  }

  return res.sendFile(clientIndex);
});

// Centralized error handler. Internal details are never sent to clients.
app.use((error, _req, res, _next) => {
  const status = Number(error.status) || 500;

  if (status >= 500) {
    console.error('[api]', error.message);
  }

  const payload = {
    error: status >= 500 ? 'Internal server error' : error.message,
  };

  if (status < 500 && error.details !== undefined) {
    payload.details = error.details;
  }

  res.status(status).json(payload);
});

// Start the API server.
const server = app.listen(PORT, () => {
  console.log(
    `[api] Smart City Information Portal API listening on http://localhost:${PORT}`
  );

  if (!authStatus.configured) {
    console.warn(
      '[auth] SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are not set; admin writes are disabled.'
    );
  } else if (!authStatus.allowlistConfigured) {
    console.warn(
      '[auth] ADMIN_EMAILS is empty; no account can be granted admin access.'
    );
  }
});

// Gracefully close the HTTP server and database pool.
async function shutdown(signal) {
  console.log(`\n[api] ${signal} received, shutting down`);

  server.close(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
