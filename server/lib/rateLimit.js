const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 300;

// Minimal in-memory rate limiter. It is intentionally dependency-free and only
// needs to protect a single-process deployment from accidental request floods.
export function createRateLimiter({
  windowMs = WINDOW_MS,
  max = MAX_REQUESTS,
  now = Date.now,
  maxKeys = 5000,
} = {}) {
  const hits = new Map();

  function middleware(req, res, next) {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const current = now();
    let entry = hits.get(key);

    if (!entry || current - entry.start >= windowMs) {
      entry = { start: current, count: 0 };
      hits.set(key, entry);
    }

    entry.count += 1;

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - entry.count)));

    if (entry.count > max) {
      const retryAfter = Math.max(1, Math.ceil((entry.start + windowMs - current) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }

    if (hits.size > maxKeys) {
      for (const [storedKey, stored] of hits) {
        if (current - stored.start >= windowMs) hits.delete(storedKey);
      }
    }

    return next();
  }

  middleware.reset = () => hits.clear();

  return middleware;
}
