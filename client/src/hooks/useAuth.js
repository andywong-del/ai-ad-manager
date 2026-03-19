import { useState } from 'react';
import { login as fbLogin } from '../services/facebookSdk.js';

const TOKEN_KEY = 'fb_long_lived_token';

export const useAuth = () => {
  const [longLivedToken, setLongLivedToken] = useState(
    () => localStorage.getItem(TOKEN_KEY)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = () => {
    setError(null);

    // Call FB.login() SYNCHRONOUSLY from the click handler —
    // must happen before any await/setState to keep the user-click context
    // so the browser allows the popup
    const loginPromise = fbLogin();

    // Now set loading state (after FB.login() has been called)
    setIsLoading(true);
    localStorage.removeItem(TOKEN_KEY);
    setLongLivedToken(null);

    loginPromise
      .then((authResponse) => {
        const token = authResponse.accessToken;
        if (!token) throw new Error('No access token returned from Facebook login.');
        localStorage.setItem(TOKEN_KEY, token);
        setLongLivedToken(token);
      })
      .catch((err) => {
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
