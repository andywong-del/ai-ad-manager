// requireToken / optionalToken
//
// Resolves the FB long-lived access token for the request and attaches it
// as `req.token`. Source order:
//   1. HttpOnly session cookie (the modern path — token never touches JS).
//   2. `Authorization: Bearer <token>` header (legacy clients still in
//      transition; can be removed once all callers migrate).
//   3. META_DEMO_TOKEN env var (dev-only convenience for localhost).
//
// On production, no token = 401. The dev fallback is explicitly gated on
// NODE_ENV so prod can't accidentally serve the team's demo token to a
// caller that simply forgot to log in.

import * as sessionService from '../services/sessionService.js';
import * as tokenService from '../services/tokenService.js';

// Background, non-blocking refresh: kicks off a long-lived token exchange
// when we notice we're inside the 7-day "expiring soon" window, but lets
// the current request use the still-valid old token. The follow-up
// request will pick up the new token from the DB. Concurrent refreshes
// are deduped per-session inside sessionService.
//
// Wrapped in a setImmediate so an unhandled rejection here can't take
// down the request that scheduled it.
const maybeBackgroundRefresh = (sid, session) => {
  if (!sid || !session?.fbToken) return;
  if (!sessionService.isExpiringSoon(session)) return;
  setImmediate(() => {
    sessionService.dedupeRefresh(sid, async () => {
      try {
        const exchanged = await tokenService.refreshLongLivedToken(session.fbToken);
        await sessionService.updateSessionToken(sid, {
          fbToken: exchanged.longLivedToken,
          fbTokenExp: exchanged.expiresAt,
        });
        console.log(`[requireToken] background-refreshed FB token for session ${sid.slice(0, 8)}…`);
      } catch (err) {
        // Don't escalate — interactive re-login path will catch it.
        console.warn('[requireToken] background refresh failed:', err.response?.data?.error?.message || err.message);
      }
    }).catch(() => {});
  });
};

const resolveToken = async (req) => {
  const sid = req.cookies?.[sessionService.COOKIE_NAME];
  if (sid) {
    const session = await sessionService.getSession(sid);
    if (session?.fbToken) {
      req.fbUserId = session.fbUserId || null;
      maybeBackgroundRefresh(sid, session);
      return session.fbToken;
    }
  }
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  if (process.env.META_DEMO_TOKEN && process.env.NODE_ENV !== 'production') {
    return process.env.META_DEMO_TOKEN;
  }
  return null;
};

export const requireToken = async (req, res, next) => {
  try {
    const token = await resolveToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required. Please log in with Facebook.' });
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
};

// Same as requireToken but allows requests without a token (for general chat)
export const optionalToken = async (req, res, next) => {
  try {
    const token = await resolveToken(req);
    if (token) req.token = token;
    next();
  } catch (err) {
    next(err);
  }
};
