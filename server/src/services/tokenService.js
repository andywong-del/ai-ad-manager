import * as metaClient from './metaClient.js';

// In-memory token store kept for back-compat with callers that still look
// up a token by its value. The source of truth for live sessions has
// moved to sessionService; this map is essentially write-only now.
const tokenStore = new Map();

// Initial short-lived → long-lived exchange. Returns the long-lived token
// plus an absolute expiresAt timestamp (ms since epoch). FB usually quotes
// expires_in: 5184000 (60 days); we default to that when missing.
export const exchangeToken = async (shortLivedToken) => {
  const result = await metaClient.exchangeToken(shortLivedToken);
  const expiresAt = Date.now() + (result.expires_in || 5184000) * 1000;
  const entry = {
    longLivedToken: result.access_token,
    expiresAt,
    tokenType: result.token_type,
  };
  tokenStore.set(result.access_token, entry);
  return entry;
};

export const getToken = (token) => tokenStore.get(token) || null;

// ─── Long-lived refresh ─────────────────────────────────────────────────────
//
// Re-exchanging a long-lived token via fb_exchange_token returns a new
// long-lived token with a fresh ~60-day TTL. This is the documented way
// to keep an active user signed in indefinitely without forcing them
// through the FB SDK login popup.
//
// Caveats:
//   - If the user has changed their password, revoked the app, or been
//     inactive past Meta's threshold, FB returns an OAuthException. We
//     surface that so the caller can fall back to a real re-login.
//   - The new token's expiry comes from `expires_in` in the response. We
//     default to 60 days if FB ever omits it (sometimes happens for
//     already-long-lived tokens — debug_token is more reliable for that
//     case, see getTokenInfo below).
export const refreshLongLivedToken = async (currentLongLivedToken) => {
  const result = await metaClient.exchangeToken(currentLongLivedToken);
  // FB sometimes returns expires_in: 0 here, meaning "still long-lived,
  // but I'm not telling you exactly when". Treat that as "60 days from
  // now" for tracking purposes; debug_token can tighten this up later.
  const ttlSec = result.expires_in && result.expires_in > 0 ? result.expires_in : 5184000;
  return {
    longLivedToken: result.access_token,
    expiresAt: Date.now() + ttlSec * 1000,
    tokenType: result.token_type,
  };
};

// Authoritative check via /debug_token. Useful when we want to know the
// token's actual remaining lifetime (the exchange response can be vague)
// or detect revocation without making a real API call. Uses
// APP_ID|APP_SECRET as the inspector access token.
export const getTokenInfo = async (token) => {
  if (!process.env.FB_APP_ID || !process.env.FB_APP_SECRET) return null;
  try {
    const appAccess = `${process.env.FB_APP_ID}|${process.env.FB_APP_SECRET}`;
    const url = `https://graph.facebook.com/v25.0/debug_token?input_token=${token}&access_token=${appAccess}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    return j?.data || null; // { is_valid, expires_at (sec), scopes, user_id, ... }
  } catch {
    return null;
  }
};
