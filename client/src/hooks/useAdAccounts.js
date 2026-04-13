import { useState, useEffect, useRef } from 'react';
import api from '../services/api.js';

// Shared cache per businessId
const _cache = new Map();
const CACHE_TTL = 120_000; // 2 minutes

export const useAdAccounts = (businessId) => {
  const [adAccounts, setAdAccounts] = useState([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const key = businessId || '_default';

    // Check cache
    const cached = _cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setAdAccounts(cached.data);
      setIsLoading(false);
      setError(null);
      return;
    }

    setAdAccounts([]);
    setIsLoading(true);
    setError(null);
    const url = businessId
      ? `/meta/businesses/${businessId}/adaccounts`
      : '/meta/adaccounts';
    api.get(url)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : [];
        _cache.set(key, { data: list, ts: Date.now() });
        if (mounted.current) { setAdAccounts(list); setError(null); }
      })
      .catch(err => { if (mounted.current) { setAdAccounts([]); setError(err.message || 'Data load error'); } })
      .finally(() => { if (mounted.current) setIsLoading(false); });

    return () => { mounted.current = false; };
  }, [businessId]);

  return { adAccounts, isLoading, error };
};
