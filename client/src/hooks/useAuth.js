import { useState, useEffect } from 'react';
import { login as fbLogin, fbPromise } from '../services/facebookSdk.js';

const TOKEN_KEY = 'fb_long_lived_token';

export const useAuth = () => {
  const [longLivedToken, setLongLivedToken] = useState(
    () => localStorage.getItem(TOKEN_KEY)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);
  const [fbReady, setFbReady]     = useState(false);

  // Track when the global FB promise resolves
  useEffect(() => {
    fbPromise
      .then(() => setFbReady(true))
      .catch(() => setFbReady(false));
  }, []);

  const login = async () => {
    setIsLoading(true);
    setError(null);
    localStorage.removeItem(TOKEN_KEY);
    setLongLivedToken(null);
    try {
      const authResponse = await fbLogin();     // awaits fbPromise internally
      const token = authResponse.accessToken;
      if (!token) throw new Error('No access token returned from Facebook login.');
      localStorage.setItem(TOKEN_KEY, token);
      setLongLivedToken(token);
    } catch (err) {
      setError(err.message || 'Facebook login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setLongLivedToken(null);
  };

  return { longLivedToken, isLoading, error, login, logout, fbReady };
};
