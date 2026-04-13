import { useState } from 'react';
import { login as fbLogin } from '../services/facebookSdk.js';

const TOKEN_KEY = 'fb_long_lived_token';

export const useAuth = () => {
  // Restore token from localStorage if it exists (persist across reloads)
  const [longLivedToken, setLongLivedToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);

  // FB SDK is guaranteed ready before React mounts (main.jsx awaits initFacebookSdk).
  // login() calls FB.login() synchronously in the click handler to avoid popup blocking.
  const login = () => {
    setIsLoading(true);
    setError(null);

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
        // Notify other hooks (useBusinesses) that token is available
        window.dispatchEvent(new Event('fb_token_changed'));
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
    window.dispatchEvent(new Event('fb_token_changed'));
  };

  // Direct setter for dev bypass (skip FB login flow)
  const setTokenDirect = (token) => {
    localStorage.setItem(TOKEN_KEY, token);
    setLongLivedToken(token);
    window.dispatchEvent(new Event('fb_token_changed'));
  };

  return { longLivedToken, isLoading, error, login, logout, setTokenDirect };
};
