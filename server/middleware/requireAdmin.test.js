import { describe, expect, it, vi } from 'vitest';
import { createRequireAdmin, parseAllowedEmails } from './requireAdmin.js';

function createRes() {
  const res = { statusCode: 200, headers: {}, body: null };
  res.set = (key, value) => {
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

const confirmedUser = {
  id: 'user-1',
  email: 'Admin@Kombolcha.gov.et',
  email_confirmed_at: '2026-01-01T00:00:00Z',
};

describe('parseAllowedEmails', () => {
  it('normalises, trims and drops empties', () => {
    const set = parseAllowedEmails(' A@b.com, , c@D.com ');
    expect(set.has('a@b.com')).toBe(true);
    expect(set.has('c@d.com')).toBe(true);
    expect(set.size).toBe(2);
  });
});

describe('createRequireAdmin', () => {
  it('rejects requests without a bearer token', async () => {
    const middleware = createRequireAdmin({
      getUser: vi.fn(),
      allowedEmails: new Set(['admin@kombolcha.gov.et']),
    });
    const req = { headers: {} };
    const res = createRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.headers['WWW-Authenticate']).toBe('Bearer');
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an invalid or expired token', async () => {
    const middleware = createRequireAdmin({
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('bad') }),
      allowedEmails: new Set(['admin@kombolcha.gov.et']),
    });
    const res = createRes();
    const next = vi.fn();

    await middleware(
      { headers: { authorization: 'Bearer expired' } },
      res,
      next
    );

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an unconfirmed email', async () => {
    const middleware = createRequireAdmin({
      getUser: vi.fn().mockResolvedValue({
        data: { user: { ...confirmedUser, email_confirmed_at: null } },
        error: null,
      }),
      allowedEmails: new Set(['admin@kombolcha.gov.et']),
    });
    const res = createRes();
    const next = vi.fn();

    await middleware(
      { headers: { authorization: 'Bearer token' } },
      res,
      next
    );

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a confirmed account that is not on the allowlist', async () => {
    const middleware = createRequireAdmin({
      getUser: vi.fn().mockResolvedValue({ data: { user: confirmedUser }, error: null }),
      allowedEmails: new Set(['someone-else@kombolcha.gov.et']),
    });
    const res = createRes();
    const next = vi.fn();

    await middleware(
      { headers: { authorization: 'Bearer token' } },
      res,
      next
    );

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows an allowlisted, confirmed administrator and normalises the email', async () => {
    const middleware = createRequireAdmin({
      getUser: vi.fn().mockResolvedValue({ data: { user: confirmedUser }, error: null }),
      allowedEmails: new Set(['admin@kombolcha.gov.et']),
    });
    const req = { headers: { authorization: 'Bearer token' } };
    const res = createRes();
    const next = vi.fn();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual({ id: 'user-1', email: 'admin@kombolcha.gov.et' });
  });

  it('returns 503 when authentication is not configured', async () => {
    const middleware = createRequireAdmin({ configured: false });
    const res = createRes();
    const next = vi.fn();

    await middleware({ headers: {} }, res, next);

    expect(res.statusCode).toBe(503);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 503 when the allowlist is empty', async () => {
    const middleware = createRequireAdmin({
      getUser: vi.fn(),
      allowedEmails: new Set(),
    });
    const res = createRes();
    const next = vi.fn();

    await middleware(
      { headers: { authorization: 'Bearer token' } },
      res,
      next
    );

    expect(res.statusCode).toBe(503);
  });

  it('returns 503 when the auth service throws', async () => {
    const middleware = createRequireAdmin({
      getUser: vi.fn().mockRejectedValue(new Error('network down')),
      allowedEmails: new Set(['admin@kombolcha.gov.et']),
      logError: () => {},
    });
    const res = createRes();
    const next = vi.fn();

    await middleware(
      { headers: { authorization: 'Bearer token' } },
      res,
      next
    );

    expect(res.statusCode).toBe(503);
    expect(next).not.toHaveBeenCalled();
  });
});
