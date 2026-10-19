import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { PORT, rootPath } from './config.js';
import { healthCheck, pool } from './db.js';
import announcements from './routes/announcements.js';
import services from './routes/services.js';
import locations from './routes/locations.js';
import stats from './routes/stats.js';

const app = express();

app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    const info = await healthCheck();
    res.json({ status: 'ok', database: info.database, time: info.now });
  } catch (error) {
    res.status(503).json({ status: 'degraded', error: error.message });
  }
});

app.use('/api/announcements', announcements);
app.use('/api/services', services);
app.use('/api/service-locations', locations);
app.use('/api/stats', stats);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Serve the built React app when it exists (npm run build).
const clientDist = path.join(rootPath, 'client', 'dist');
const clientIndex = path.join(clientDist, 'index.html');

app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_req, res, next) => {
  if (!fs.existsSync(clientIndex)) {
    return next();
  }
  return res.sendFile(clientIndex);
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status >= 500) console.error('[api]', error);
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : error.message,
    details: error.details,
  });
});

const server = app.listen(PORT, () => {
  console.log(`[api] Kombolcha Smart City API listening on http://localhost:${PORT}`);
});

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
