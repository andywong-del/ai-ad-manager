// Rate-limiting middleware backed by Supabase.
//
// Why Supabase and not in-memory: Vercel runs Express as a serverless
// function. Each invocation can hit a different cold instance, so an
// in-process Map counts to ~1 per attacker before being thrown away. The
// Postgres bucket table is shared across instances and survives cold
// starts, so a real attacker can't out-spawn the limiter.
//
// Why fixed-window and not sliding-log: fixed-window is one upsert per
// request. Sliding-log is one insert + one range-count + one cleanup per
// request. The accuracy gain isn't worth 3× the DB load for a DoS guard.
//
// Failure mode: if Supabase is unreachable or the `rate_limit_incr` RPC
// is missing (e.g. SQL not yet run), the middleware fails OPEN with a
// warning. Locking everyone out because the limiter itself broke is worse
// than the attack the limiter is trying to prevent. Tune this if you'd
// rather fail closed in some specific contexts.

import { getSupabase } from '../lib/supabase.js';

// Use the cookie session module to derive a stable user key when present.
// Imported lazily to avoid a circular import with auth routes.
const sessionCookieName = 'aam_session';

const memBuckets = new Map(); // fallback when Supabase isn't configured

const incr = async (key, windowStart) => {
  const sb = getSupabase();
  if (!sb) {
    // Local-dev fallback. Same window math, just in-process.
    const k = `${key}:${windowStart}`;
    const next = (memBuckets.get(k) || 0) + 1;
    memBuckets.set(k, next);
    // Trim memory: drop entries older than 2 windows.
    if (memBuckets.size > 5000) {
      for (const [mk] of memBuckets) {
        const ws = Number(mk.split(':').pop());
        if (ws < windowStart - 60_000) memBuckets.delete(mk);
      }
    }
    return next;
  }
  const { data, error } = await sb.rpc('rate_limit_incr', {
    p_key: key,
    p_window_start: windowStart,
  });
  if (error) {
    // First time someone reads this code: if you see this warning on every
    // request, you forgot to run server/sql/rate_limit_buckets.sql in
    // Supabase. The limiter is currently a no-op until that's fixed.
    console.warn('[rateLimit] RPC failed, failing open:', error.message);
    return 0; // 0 < any limit → request allowed
  }
  return Number(data) || 0;
};

// IP extractor that respects Vercel/Cloudflare-style proxy headers. We
// trust the rightmost x-forwarded-for entry that actually came from our
// edge, which in practice is the first one (Vercel rewrites it). Falling
// back to req.ip is fine for localhost.
const getIp = (req) => {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const getUserKey = (req) => {
  // resolveUser / requireToken middleware sets req.fbUserId when known.
  if (req.fbUserId) return `u:${req.fbUserId}`;
  // Otherwise fall back to the cookie id (less stable — rotates on logout
  // — but better than IP for shared-NAT cases).
  const sid = req.cookies?.[sessionCookieName];
  if (sid) return `s:${sid.slice(0, 16)}`;
  return `ip:${getIp(req)}`;
};

/**
 * rateLimit({ bucket, limit, windowMs, keyBy })
 *
 *   bucket   — namespace for the counter row, e.g. "auth" / "ai" / "default".
 *              Two routes sharing a bucket share the same budget per user.
 *   limit    — max requests in the window.
 *   windowMs — window size, e.g. 60_000 for "per minute".
 *   keyBy    — 'user' (default) | 'ip'. Pre-auth routes must use 'ip' since
 *              there's no user yet.
 *
 * On exceed: 429 + Retry-After header + standard X-RateLimit-* headers so
 * the client can be polite without parsing the body.
 */
export const rateLimit = ({ bucket, limit, windowMs, keyBy = 'user' }) => {
  return async (req, res, next) => {
    try {
      const subject = keyBy === 'ip' ? `ip:${getIp(req)}` : getUserKey(req);
      const now = Date.now();
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const fullKey = `${bucket}:${subject}`;

      const count = await incr(fullKey, windowStart);

      const remaining = Math.max(0, limit - count);
      const resetSec = Math.ceil((windowStart + windowMs) / 1000);
      res.set('X-RateLimit-Limit', String(limit));
      res.set('X-RateLimit-Remaining', String(remaining));
      res.set('X-RateLimit-Reset', String(resetSec));

      if (count > limit) {
        const retryAfter = Math.ceil((windowStart + windowMs - now) / 1000);
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: 'Too many requests',
          bucket,
          retryAfter,
        });
      }
      next();
    } catch (err) {
      // Don't lock users out because the limiter itself crashed.
      console.error('[rateLimit] failed open:', err.message);
      next();
    }
  };
};

// ─── Presets ────────────────────────────────────────────────────────────────
// Three named tiers. Add more sparingly — each new preset is a knob someone
// will eventually have to tune in production.

// Pre-auth endpoints (token exchange, demo session). Keyed by IP because
// there's no user yet. Tight enough to make brute-forcing FB short tokens
// pointless without locking out a normal login flow.
export const limitAuth = rateLimit({ bucket: 'auth', limit: 10, windowMs: 60_000, keyBy: 'ip' });

// Expensive AI endpoints — chat, skill generation, page/url crawl. Each
// call costs real Gemini credits, so this is as much a wallet guard as a
// DoS guard. Pair with a daily cap (limitAiDaily) on the same routes.
export const limitAi = rateLimit({ bucket: 'ai', limit: 30, windowMs: 60_000 });
export const limitAiDaily = rateLimit({ bucket: 'ai_daily', limit: 300, windowMs: 24 * 60 * 60_000 });

// Default for authenticated, low-cost routes (Meta/Google read proxies,
// CRUD on our own tables). High enough to never get in a power user's way;
// low enough to make scripted scraping noticeable.
export const limitDefault = rateLimit({ bucket: 'default', limit: 120, windowMs: 60_000 });
