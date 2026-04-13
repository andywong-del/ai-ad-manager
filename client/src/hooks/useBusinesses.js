import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api.js';

// Shared cache across all hook instances — prevents duplicate API calls
let _cache = { data: null, ts: 0, promise: null };
const CACHE_TTL = 120_000; // 2 minutes

export const useBusinesses = () => {
  const [businesses, setBusinesses] = useState(_cache.data || []);
  const [isLoading, setIsLoading]   = useState(!_cache.data);
  const [error, setError]           = useState(null);
  const mounted = useRef(true);

  const fetchBusinesses = useCallback((force = false) => {
    const token = localStorage.getItem('fb_long_lived_token');
    if (!token) {
      setBusinesses([]);
      setIsLoading(false);
      _cache = { data: null, ts: 0, promise: null };
      return;
    }

    // Return cached data if fresh
    if (!force && _cache.data && Date.now() - _cache.ts < CACHE_TTL) {
      setBusinesses(_cache.data);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Deduplicate: if a request is already in-flight, reuse it
    if (_cache.promise) {
      setIsLoading(true);
      _cache.promise.then(data => {
        if (mounted.current) { setBusinesses(data); setIsLoading(false); setError(null); }
      }).catch(err => {
        if (mounted.current) { setBusinesses([]); setIsLoading(false); setError(err.message); }
      });
      return;
    }

    setIsLoading(true);
    _cache.promise = api.get('/meta/businesses')
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        _cache = { data: list, ts: Date.now(), promise: null };
        if (mounted.current) { setBusinesses(list); setError(null); }
        return list;
      })
      .catch(err => {
        _cache.promise = null;
        const msg = err.response?.data?.error || err.message || 'Failed to load businesses';
        if (mounted.current) { setBusinesses([]); setError(msg); }
        throw new Error(msg);
      })
      .finally(() => { if (mounted.current) setIsLoading(false); });
  }, []);

  useEffect(() => { mounted.current = true; fetchBusinesses(); return () => { mounted.current = false; }; }, [fetchBusinesses]);

  // Listen for token changes
  useEffect(() => {
    const handleLogin = () => { _cache = { data: null, ts: 0, promise: null }; fetchBusinesses(true); };
    window.addEventListener('fb_token_changed', handleLogin);
    return () => window.removeEventListener('fb_token_changed', handleLogin);
  }, [fetchBusinesses]);

  return { businesses, isLoading, error, refetch: () => fetchBusinesses(true) };
};
