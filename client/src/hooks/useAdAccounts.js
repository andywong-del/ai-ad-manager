import { useState, useEffect } from 'react';
import api from '../services/api.js';

export const useAdAccounts = (businessId) => {
  const [adAccounts, setAdAccounts] = useState([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    const url = businessId
      ? `/meta/businesses/${businessId}/adaccounts`
      : '/meta/adaccounts';
    api.get(url)
      .then(({ data }) => { setAdAccounts(Array.isArray(data) ? data : []); setError(null); })
      .catch(err => { setAdAccounts([]); setError(err.message || 'Data load error'); })
      .finally(() => setIsLoading(false));
  }, [businessId]);

  return { adAccounts, isLoading, error };
};
