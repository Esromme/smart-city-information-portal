import { createClient } from '@supabase/supabase-js';

export function parseAllowedEmails(value = '') {
  return new Set(
    String(value)
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

// Factory kept separate from the configured instance so access-control
// behaviour can be tested without a live Supabase project.
export function createRequireAdmin({
  getUser,
  allowedEmails = new Set(),
  configured = true,
  logError = (...args) => console.error(...args),
} = {}) {
  const allowed = allowedEmails instanceof Set
    ? allowedEmails
    : parseAllowedEmails(allowedEmails);

  return async function requireAdmin(req, res, next) {
    if (!configured || typeof getUser !== 'function') {
      return res.status(503).json({
        error: 'Administrator authentication is not configured',
      });
    }

    if (!allowed.size) {
      return res.status(503).json({
        error: 'Administrator allowlist is not configured',
      });
    }

    const authorization = req.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      res.set('WWW-Authenticate', 'Bearer');
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!token) {
      res.set('WWW-Authenticate', 'Bearer');
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    try {
      const { data, error } = await getUser(token);

      if (error || !data?.user) {
        res.set('WWW-Authenticate', 'Bearer');
        return res.status(401).json({
          error: 'Invalid or expired access token',
        });
      }

      const user = data.user;
      const email = user.email?.trim().toLowerCase();

      if (!email || !user.email_confirmed_at) {
        return res.status(403).json({
          error: 'A confirmed email address is required',
        });
      }

      if (!allowed.has(email)) {
        return res.status(403).json({
          error: 'Administrator access required',
        });
      }

      req.user = {
        id: user.id,
        email,
      };

      return next();
    } catch (error) {
      logError('[auth] Authentication check failed:', error.message);

      return res.status(503).json({
        error: 'Authentication service unavailable',
      });
    }
  };
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const authConfigured = Boolean(supabaseUrl && supabasePublishableKey);
const allowedAdminEmails = parseAllowedEmails(process.env.ADMIN_EMAILS);

let supabase = null;

function getSupabase() {
  if (!authConfigured) return null;

  if (!supabase) {
    supabase = createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return supabase;
}

export const authStatus = Object.freeze({
  configured: authConfigured,
  allowlistConfigured: allowedAdminEmails.size > 0,
});

export const requireAdmin = createRequireAdmin({
  configured: authConfigured,
  allowedEmails: allowedAdminEmails,
  getUser: (token) => getSupabase().auth.getUser(token),
});
