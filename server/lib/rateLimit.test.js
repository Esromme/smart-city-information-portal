import { describe, expect, it, vi } from 'vitest';
import { createRateLimiter } from './rateLimit.js';

function createRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
  };
  res.setHeader = (key, value) => {
    res.headers[key] = value;
    return res;
  };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
}

describe('createRateLimiter', () => {
  it('allows requests up to the limit and blocks the next one', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 2, now: () => 0 });
    const next = vi.fn();

    limiter({ ip: 'a' }, createRes(), next);
    limiter({ ip: 'a' }, createRes(), next);
    expect(next).toHaveBeenCalledTimes(2);

    const res = createRes();
    limiter({ ip: 'a' }, res, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(res.statusCode).toBe(429);
    expect(res.body.error).toMatch(/Too many requests/);
  });

  it('tracks clients independently and resets after the window', () => {
    let current = 0;
    const limiter = createRateLimiter({
      windowMs: 1000,
      max: 1,
      now: () => current,
    });
    const next = vi.fn();

    limiter({ ip: 'a' }, createRes(), next);
    limiter({ ip: 'b' }, createRes(), next);
    expect(next).toHaveBeenCalledTimes(2);

    current = 1001;
    limiter({ ip: 'a' }, createRes(), next);
    expect(next).toHaveBeenCalledTimes(3);
  });
});
