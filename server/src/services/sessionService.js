// sessionService — server-side store for the FB long-lived token.
//
// The browser never sees the FB token any more. After /api/auth/token
// exchanges the short-lived token, we mint a random session id, stash the
// long-lived token in this store keyed by that id, and ship the id back as
// an HttpOnly cookie. Subsequent requests carry the cookie; resolveSession
// middleware looks the FB token back up and attaches it to req.token.
//
// Storage:
//   - Supabase `auth_sessions` if SUPABASE_URL/KEY are set (production path)
//   - In-memory Map fallback so local dev works without Supabase
//
// Both paths share the same shape so callers don't care which backend is
// active.

import crypto from 'node:crypto';
import { getSupabase } from '../lib/supabase.js';

// 30 days. The FB long-lived token itself lasts ~60 days, but we'd rather
// rotate the cookie sooner so a stolen cookie has a shorter useful life.
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const memoryStore = new Map();

const newId = () => crypto.randomBytes(32).toString('base64url');

const tableAvailable = () => !!getSupabase();

export const COOKIE_NAME = 'aam_session';

export const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: SESSION_TTL_MS,
});

// Create a new session. Returns { id, expiresAt }.
export const createSession = async ({ fbToken, fbTokenExp, fbUserId, userName, userFirstName }) => {
  const id = newId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  if (tableAvailable()) {
    const { error } = await getSupabase().from('auth_sessions').insert({
      id,
      fb_user_id: fbUserId || null,
      fb_token: fbToken,
      fb_token_exp: fbTokenExp ? new Date(fbTokenExp).toISOString() : null,
      user_name: userName || null,
      user_first_name: userFirstName || null,
      expires_at: expiresAt.toISOString(),
    });
    if (error) {
      console.error('[sessionService] insert failed, falling back to memory:', error.message);
      memoryStore.set(id, { fbToken, fbTokenExp, fbUserId, userName, userFirstName, expiresAt: expiresAt.getTime() });
    }
  } else {
    memoryStore.set(id, { fbToken, fbTokenExp, fbUserId, userName, userFirstName, expiresAt: expiresAt.getTime() });
  }

  return { id, expiresAt };
};

// Look up a session. Returns null if missing or expired.
export const getSession = async (id) => {
  if (!id) return null;

  if (tableAvailable()) {
    const { data, error } = await getSupabase()
      .from('auth_sessions')
      .select('id, fb_user_id, fb_token, fb_token_exp, user_name, user_first_name, expires_at')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) {
      // Fall through to memory (covers writes that landed there during outage)
      const mem = memoryStore.get(id);
      if (mem && mem.expiresAt > Date.now()) return mem;
      return null;
    }
    if (new Date(data.expires_at).getTime() <= Date.now()) {
      // Best-effort cleanup; ignore errors.
      getSupabase().from('auth_sessions').delete().eq('id', id).then(() => {});
      return null;
    }
    // Touch last_seen_at without awaiting — it's diagnostic, not critical.
    getSupabase().from('auth_sessions').update({ last_seen_at: new Date().toISOString() }).eq('id', id).then(() => {});
    return {
      fbToken: data.fb_token,
      fbTokenExp: data.fb_token_exp,
      fbUserId: data.fb_user_id,
      userName: data.user_name,
      userFirstName: data.user_first_name,
      expiresAt: new Date(data.expires_at).getTime(),
    };
  }

  const mem = memoryStore.get(id);
  if (!mem) return null;
  if (mem.expiresAt <= Date.now()) {
    memoryStore.delete(id);
    return null;
  }
  return mem;
};

// Destroy a single session.
export const destroySession = async (id) => {
  if (!id) return;
  memoryStore.delete(id);
  if (tableAvailable()) {
    await getSupabase().from('auth_sessions').delete().eq('id', id);
  }
};

// ─── Token refresh helpers ──────────────────────────────────────────────────

// Replace the FB token + expiry on an existing session row. We don't
// rotate the session id (cookie stays the same), only the secret it
// indexes. Atomic in Supabase via a single UPDATE.
export const updateSessionToken = async (id, { fbToken, fbTokenExp }) => {
  if (!id) return;
  if (tableAvailable()) {
    const { error } = await getSupabase().from('auth_sessions').update({
      fb_token: fbToken,
      fb_token_exp: fbTokenExp ? new Date(fbTokenExp).toISOString() : null,
    }).eq('id', id);
    if (error) console.warn('[sessionService] updateSessionToken failed:', error.message);
  }
  const mem = memoryStore.get(id);
  if (mem) memoryStore.set(id, { ...mem, fbToken, fbTokenExp });
};

// "Is this token close enough to expiry that we should refresh it now?"
// Default threshold is 7 days — gives us a wide window to retry if FB
// is briefly unreachable. Callers can pass a tighter threshold (e.g. 1
// day) to gate the synchronous-must-refresh path.
const DEFAULT_REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;
export const isExpiringSoon = (session, thresholdMs = DEFAULT_REFRESH_THRESHOLD_MS) => {
  if (!session?.fbTokenExp) return false;
  const exp = typeof session.fbTokenExp === 'string'
    ? new Date(session.fbTokenExp).getTime()
    : Number(session.fbTokenExp);
  if (!Number.isFinite(exp)) return false;
  return exp - Date.now() < thresholdMs;
};

// In-memory dedupe so two concurrent requests don't both fire a refresh.
// Vercel serverless caveat: this only dedupes within a single function
// instance. With many concurrent invocations you might still get a
// handful of parallel refresh calls — annoying but not harmful (FB
// accepts them; the last write wins). Worth-it tradeoff vs. a DB lock.
const refreshInFlight = new Map(); // sessionId -> Promise<boolean>

// Wrap a refresh function so concurrent callers share one in-flight call.
export const dedupeRefresh = (sessionId, doRefresh) => {
  const existing = refreshInFlight.get(sessionId);
  if (existing) return existing;
  const p = doRefresh().finally(() => refreshInFlight.delete(sessionId));
  refreshInFlight.set(sessionId, p);
  return p;
};
