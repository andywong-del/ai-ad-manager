import { Router } from 'express';
import * as tokenService from '../services/tokenService.js';
import * as sessionService from '../services/sessionService.js';
import { devOnly } from '../middleware/devOnly.js';
import { limitAuth } from '../middleware/rateLimit.js';
// limitAuth is also reused on /refresh below — same IP-keyed bucket since
// a malicious caller could otherwise hammer the FB exchange endpoint via
// the refresh path even without valid creds.

const router = Router();

// Best-effort: pull /me so we can cache the user's name + id alongside the
// session, which lets /api/auth/session return the user info without a
// round-trip to Facebook on every page load.
const fetchFbUser = async (token) => {
  try {
    const r = await fetch(`https://graph.facebook.com/v25.0/me?access_token=${token}&fields=id,first_name,name`);
    if (!r.ok) return {};
    return await r.json();
  } catch {
    return {};
  }
};

// Pre-auth endpoints are IP-keyed (no user yet). Tight limit deters
// brute-force token guessing and demo-session spam.
router.post('/token', limitAuth, async (req, res, next) => {
  const { shortLivedToken } = req.body;
  if (!shortLivedToken) {
    return res.status(400).json({ error: 'shortLivedToken is required' });
  }
  try {
    const result = await tokenService.exchangeToken(shortLivedToken);
    const fbUser = await fetchFbUser(result.longLivedToken);

    const { id: sessionId, expiresAt } = await sessionService.createSession({
      fbToken: result.longLivedToken,
      fbTokenExp: result.expiresAt,
      fbUserId: fbUser.id,
      userName: fbUser.name,
      userFirstName: fbUser.first_name,
    });

    res.cookie(sessionService.COOKIE_NAME, sessionId, sessionService.cookieOptions());

    // We deliberately no longer return `longLivedToken` in production — the
    // whole point of this migration is to keep that secret server-side. Dev
    // gets it back so the existing localhost flow that syncs to localStorage
    // keeps working until the client is fully cookie-only.
    const payload = {
      authenticated: true,
      sessionExpiresAt: expiresAt,
      tokenType: result.tokenType,
      user: { id: fbUser.id, name: fbUser.name, firstName: fbUser.first_name },
    };
    if (process.env.NODE_ENV !== 'production') {
      payload.longLivedToken = result.longLivedToken;
      payload.expiresAt = result.expiresAt;
    }
    res.json(payload);
  } catch (err) {
    const metaError = err.response?.data?.error;
    const error = new Error(metaError?.message || 'Token exchange failed');
    error.status = 502;
    next(error);
  }
});

// Session check — the client calls this on boot (and on visibility change)
// to find out whether a valid cookie is already present. Returns 401 if
// not. Cheap because session info is cached in `auth_sessions` (no FB
// round-trip).
//
// Also reports `needsReauth: true` when the underlying Meta long-lived
// token has < 7 days left, so the client can proactively trigger a
// refresh before any real API call fails. The cookie expiry and the FB
// token expiry are tracked separately — the cookie can be valid even
// when the FB token isn't.
router.get('/session', async (req, res) => {
  const sid = req.cookies?.[sessionService.COOKIE_NAME];
  const session = await sessionService.getSession(sid);
  if (!session) return res.status(401).json({ authenticated: false });
  res.json({
    authenticated: true,
    user: {
      id: session.fbUserId,
      name: session.userName,
      firstName: session.userFirstName,
    },
    sessionExpiresAt: new Date(session.expiresAt).toISOString(),
    fbTokenExpiresAt: session.fbTokenExp
      ? (typeof session.fbTokenExp === 'string' ? session.fbTokenExp : new Date(session.fbTokenExp).toISOString())
      : null,
    needsReauth: sessionService.isExpiringSoon(session),
  });
});

// Refresh the underlying Meta long-lived token without rotating the cookie.
//
// Two paths the client can hit this with:
//   1. POST with no body — silent path. Server tries fb_exchange_token on
//      the existing long-lived token. Works as long as Meta still
//      considers the token valid (user hasn't revoked, hasn't been gone
//      ~60 days, hasn't changed their password).
//   2. POST { shortLivedToken } — interactive path. Client just called
//      FB.login()/getLoginStatus() in the browser and got a fresh short-
//      lived token. We exchange that for a new long-lived one. This
//      recovers from cases where the silent path fails (e.g. token
//      already expired).
//
// Either way, on success we update the same session row in place so the
// cookie keeps working transparently.
router.post('/refresh', limitAuth, async (req, res) => {
  const sid = req.cookies?.[sessionService.COOKIE_NAME];
  const session = sid ? await sessionService.getSession(sid) : null;
  if (!session) return res.status(401).json({ error: 'no session' });

  const { shortLivedToken } = req.body || {};

  try {
    const refreshed = await sessionService.dedupeRefresh(sid, async () => {
      const exchanged = shortLivedToken
        ? await tokenService.exchangeToken(shortLivedToken)
        : await tokenService.refreshLongLivedToken(session.fbToken);
      await sessionService.updateSessionToken(sid, {
        fbToken: exchanged.longLivedToken,
        fbTokenExp: exchanged.expiresAt,
      });
      return exchanged;
    });

    res.json({
      ok: true,
      fbTokenExpiresAt: new Date(refreshed.expiresAt).toISOString(),
      // Echo the user info back so the client doesn't need a follow-up
      // call to /session right after refresh.
      user: {
        id: session.fbUserId,
        name: session.userName,
        firstName: session.userFirstName,
      },
    });
  } catch (err) {
    // Distinguish "FB rejected the token" (user must re-login interactively)
    // from "transient" errors so the client can decide whether to prompt.
    const fbErr = err.response?.data?.error;
    const isFatal = fbErr?.code === 190 || fbErr?.type === 'OAuthException';
    res.status(isFatal ? 401 : 502).json({
      error: fbErr?.message || err.message || 'refresh failed',
      requiresInteractiveLogin: isFatal,
    });
  }
});

// Logout — wipes the session row and clears the cookie. Idempotent: hitting
// it without a cookie still returns 200 so the client logout path doesn't
// have to special-case "already logged out".
router.post('/logout', async (req, res) => {
  const sid = req.cookies?.[sessionService.COOKIE_NAME];
  if (sid) await sessionService.destroySession(sid);
  res.clearCookie(sessionService.COOKIE_NAME, { ...sessionService.cookieOptions(), maxAge: undefined });
  res.json({ ok: true });
});

// Dev-only: mint a real session backed by META_DEMO_TOKEN. The token never
// leaves the server — the client gets the same HttpOnly cookie a real FB
// login would give it, so the rest of the app code path is identical in
// dev and prod. Replaces the old "GET /demo-token then write to
// localStorage" dev shortcut.
router.post('/demo-session', devOnly, limitAuth, async (req, res) => {
  const token = process.env.META_DEMO_TOKEN;
  if (!token) return res.status(404).json({ error: 'No demo token configured' });
  const fbUser = await fetchFbUser(token);
  const { id, expiresAt } = await sessionService.createSession({
    fbToken: token,
    fbUserId: fbUser.id,
    userName: fbUser.name,
    userFirstName: fbUser.first_name,
  });
  res.cookie(sessionService.COOKIE_NAME, id, sessionService.cookieOptions());
  res.json({
    authenticated: true,
    sessionExpiresAt: expiresAt,
    user: { id: fbUser.id, name: fbUser.name, firstName: fbUser.first_name },
  });
});

// Dev-only: return the demo token so the client can sync it.
// Comment used to say "dev-only" but the route had no guard — anyone could
// curl this in prod and walk away with the team's long-lived FB token.
// Now actually gated.
router.get('/demo-token', devOnly, (req, res) => {
  const token = process.env.META_DEMO_TOKEN;
  if (!token) return res.status(404).json({ error: 'No demo token configured' });
  res.json({ longLivedToken: token });
});

// Get current user's name from Meta. Order of preference for the token:
//   1. Cookie session (production path — no token in JS)
//   2. Authorization: Bearer header (legacy / transitional callers)
//   3. META_DEMO_TOKEN env (dev only — gated by NODE_ENV)
// Without the env-token guard, anonymous callers got the team's identity
// for free in production.
router.get('/me', async (req, res) => {
  const sid = req.cookies?.[sessionService.COOKIE_NAME];
  const session = sid ? await sessionService.getSession(sid) : null;

  const auth = req.headers.authorization;
  const headerToken = auth?.startsWith('Bearer ') ? auth.slice(7) : null;

  const allowEnvFallback = process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEV_ROUTES === 'true';
  const token = session?.fbToken || headerToken || (allowEnvFallback ? process.env.META_DEMO_TOKEN : null);

  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const response = await fetch(`https://graph.facebook.com/v25.0/me?access_token=${token}&fields=first_name,name`);
    const data = await response.json();
    res.json({ firstName: data.first_name, name: data.name, id: data.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
