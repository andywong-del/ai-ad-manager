import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api.js';

export const useBrandLibrary = (adAccountId) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    if (!adAccountId) { setItems([]); return; }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/brand-library', { params: { adAccountId } });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('[brand-library] fetch error:', err.response?.data?.error || err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [adAccountId]);

  // Re-fetch when ad account changes
  useEffect(() => { fetchItems(); }, [fetchItems]);

  const createItem = useCallback(async ({ name, type, content, metadata }) => {
    const { data } = await api.post('/brand-library', { name, type, content, metadata, adAccountId });
    setItems(prev => [data, ...prev]);
    return data;
  }, [adAccountId]);

  const updateItem = useCallback(async (id, updates) => {
    const { data } = await api.put(`/brand-library/${id}`, updates);
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...data } : item));
    return data;
  }, []);

  const deleteItem = useCallback(async (id) => {
    await api.delete(`/brand-library/${id}`);
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const toggleItem = useCallback(async (id, enabled) => {
    await api.patch(`/brand-library/${id}/toggle`, { enabled });
    setItems(prev => prev.map(item => item.id === id ? { ...item, enabled } : item));
  }, []);

  const crawlUrl = useCallback(async (url) => {
    const { data } = await api.post('/brand-library/crawl-url', { url });
    return data;
  }, []);

  const crawlSocial = useCallback(async (pageId) => {
    const { data } = await api.post('/brand-library/crawl-social', { pageId });
    return data;
  }, []);

  // Build brand context for chat injection (only enabled items for current account)
  const getBrandContext = useCallback(() => {
    const enabled = items.filter(item => item.enabled);
    if (enabled.length === 0) return null;
    return enabled
      .map(item => `[BRAND: ${item.name}]\n${item.content}`)
      .join('\n\n---\n\n');
  }, [items]);

  const enabledCount = useMemo(() => items.filter(i => i.enabled).length, [items]);

  return {
    items, loading, error, enabledCount,
    fetchItems, createItem, updateItem, deleteItem, toggleItem,
    crawlUrl, crawlSocial, getBrandContext,
  };
};
