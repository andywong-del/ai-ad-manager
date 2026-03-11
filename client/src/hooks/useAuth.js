import { useState } from 'react';

const TOKEN_KEY = 'fb_mock_token';

export const useAuth = () => {
  const [longLivedToken, setLongLivedToken] = useState(
    () => localStorage.getItem(TOKEN_KEY)
  );
  const [isLoading] = useState(false);
  const [error,     setError]     = useState(null);

  const login = () => {
    // Mock login — no real FB SDK or server needed
    const token = 'mock-token';
    localStorage.setItem(TOKEN_KEY, token);
    setLongLivedToken(token);
    setError(null);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setLongLivedToken(null);
  };

  return { longLivedToken, isLoading, error, login, logout };
};
