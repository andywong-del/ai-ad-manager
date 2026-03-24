import { useState } from 'react';
import { login as fbLogin } from '../services/facebookSdk.js';

const TOKEN_KEY = 'fb_long_lived_token';

// Clear any stale token on load — user must login every session
localStorage.removeItem(TOKEN_KEY);

export const useAuth = () => {
  const [longLivedToken, setLongLivedToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);

  // FB SDK is guaranteed ready before React mounts (main.jsx awaits initFacebookSdk).
  // login() calls FB.login() synchronously in the click handler to avoid popup blocking.
  const login = () => {
    setIsLoading(true);
    setError(null);
    localStorage.removeItem(TOKEN_KEY);
    setLongLivedToken(null);

    fbLogin()
      .then(async (authResponse) => {
        const shortToken = authResponse.accessToken;
        console.log('[Auth] FB login success, got short-lived token');
        if (!shortToken) throw new Error('No access token returned from Facebook login.');

        // Exchange short-lived token for long-lived token via server
        console.log('[Auth] Exchanging for long-lived token...');
        const res = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shortLivedToken: shortToken }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Token exchange failed (HTTP ${res.status})`);
        }

        const { longLivedToken: llToken } = await res.json();
        if (!llToken) throw new Error('Token exchange returned no long-lived token.');

        console.log('[Auth] Long-lived token obtained, length:', llToken.length);
        localStorage.setItem(TOKEN_KEY, llToken);
        setLongLivedToken(llToken);
      })
      .catch((err) => {
        console.error('[Auth] Login failed:', err.message);
        setError(err.message || 'Facebook login failed. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setLongLivedToken(null);
  };

  return { longLivedToken, isLoading, error, login, logout };
};
