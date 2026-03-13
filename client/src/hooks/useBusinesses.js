import { useState, useEffect } from 'react';
import api from '../services/api.js';

export const useBusinesses = () => {
  const [businesses, setBusinesses] = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    api.get('/meta/businesses')
      .then(({ data }) => { setBusinesses(Array.isArray(data) ? data : []); setError(null); })
      .catch(err => { setBusinesses([]); setError(err.message || 'Failed to load businesses'); })
      .finally(() => setIsLoading(false));
  }, []);

  return { businesses, isLoading, error };
};
