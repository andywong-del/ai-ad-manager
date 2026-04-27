import { useCallback, useEffect, useRef, useState } from 'react';
import { login as fbLogin } from '../services/facebookSdk.js';

// Auth state is now derived from a server-side session. The FB long-lived
// token never touches localStorage — it's stored in `auth_sessions` keyed
// by an HttpOnly cookie. This hook tracks two booleans (authenticated /
// loading) plus the cached display name; everything else lives on the
// server.
//
// `longLivedToken` is kept in the return shape for backward compatibility
// with callers that still pass it down as a prop. Its only role now is
// "truthy ⇒ logged in"; nothing should send it as a Bearer header any more
// (cookies handle that).

export const useAuth = () => {
  const [authed, setAuthed] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bootChecked, setBootChecked] = useState(false);
  // Last attempted refresh — guards against tab focus thrashing causing
  // a refresh storm. We only let one fire every ~5 minutes regardless of
  // how often the visibility event triggers.
  const lastRefreshAt = useRef(0);

  // Try to silently extend the FB token. Two strategies, tried in order:
  //   1. POST /api/auth/refresh with no body — server re-exchanges the
  //      existing long-lived token. Works for the common case where the
  //      token is just close-but-not-yet expired.
  //   2. If that fails with 401 (FB rejected — token already dead or
  //      revoked), ask FB SDK whether the user is still connected. If
  //      yes, grab a fresh short-lived token and POST it. This recovers
  //      from password changes / inactivity without forcing a popup.
  //
  // Returns true on success. False means the caller should redirect to
  // a real login.
  const refreshSession = useCallback(async () => {
    if (Date.now() - lastRefreshAt.current < 5 * 60 * 1000) return true;
    lastRefreshAt.current = Date.now();

    try {
      const r = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (r.ok) return true;
      // 401 + requiresInteractiveLogin → fall through to FB SDK path.
      if (r.status !== 401) return false;
    } catch { return false; }

    // Interactive-but-still-silent recovery. FB.getLoginStatus is no UI;
    // it just looks at FB's own cookie state. If status==='connected'
    // we already have a fresh access token, no popup needed.
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.FB) return resolve(false);
      window.FB.getLoginStatus(async (resp) => {
        const t = resp?.authResponse?.accessToken;
        if (resp?.status !== 'connected' || !t) return resolve(false);
        try {
          const r = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shortLivedToken: t }),
          });
          resolve(r.ok);
        } catch { resolve(false); }
      });
    });
  }, []);

  // On mount, ask the server whether we already have a valid cookie. If
  // the session is valid but the underlying FB token is close to expiry,
  // attempt a silent refresh right away — better to do it now than at
  // the worst possible moment (in the middle of a campaign edit).
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const r = await fetch('/api/auth/session', { credentials: 'include' });
        if (!r.ok) return;
        const data = await r.json();
        if (cancelled) return;
        if (data?.authenticated) {
          setAuthed(true);
          setUser(data.user || null);
          if (data.needsReauth) refreshSession();
        }
      } catch {}
    };
    check().finally(() => { if (!cancelled) setBootChecked(true); });

    // Re-run the check when the tab comes back into focus. Long-lived
    // app sessions (60+ days) hit token expiry mid-tab; the visibility
    // event is our cheapest signal that the user is about to interact.
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refreshSession]);

  // FB SDK is guaranteed ready before React mounts (main.jsx awaits initFacebookSdk).
  // login() calls FB.login() synchronously in the click handler to avoid popup blocking.
  const login = () => {
    setIsLoading(true);
    setError(null);

    fbLogin()
      .then(async (authResponse) => {
        const shortToken = authResponse.accessToken;
        if (!shortToken) throw new Error('No access token returned from Facebook login.');

        const res = await fetch('/api/auth/token', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shortLivedToken: shortToken }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Token exchange failed (HTTP ${res.status})`);
        }
        const data = await res.json();
        if (!data.authenticated) throw new Error('Server did not establish a session.');

        setAuthed(true);
        setUser(data.user || null);
        if (data.user?.firstName) {
          // Display-name only; safe in localStorage. Not a credential.
          localStorage.setItem('aam_user_first_name', data.user.firstName);
        }
        window.dispatchEvent(new Event('fb_token_changed'));
      })
      .catch((err) => {
        console.error('[Auth] Login failed:', err.message);
        setError(err.message || 'Facebook login failed. Please try again.');
      })
      .finally(() => setIsLoading(false));
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    setAuthed(false);
    setUser(null);
    localStorage.removeItem('aam_user_first_name');
    window.dispatchEvent(new Event('fb_token_changed'));
  };

  // Dev convenience: flips the in-memory authed flag after App.jsx seeds a
  // demo session. Wrapped in useCallback so callers can safely list it in
  // their useEffect deps without retriggering on every render (App.jsx's
  // boot effect did exactly that and re-POSTed /demo-session in a loop).
  const markAuthed = useCallback((userInfo) => {
    setAuthed(true);
    if (userInfo) setUser(userInfo);
  }, []);

  return {
    isAuthenticated: authed,
    user,
    bootChecked,
    isLoading,
    error,
    login,
    logout,
    markAuthed,
    // Back-compat: a truthy value here means "logged in" for code that used
    // to check `longLivedToken`. The actual token is no longer exposed.
    longLivedToken: authed ? 'cookie-session' : null,
  };
};
