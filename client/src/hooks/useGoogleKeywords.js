// Hook backing the Keywords module. One file owns:
//   • fetching positive keywords / negatives / search terms
//   • fetching the ad-group list for the picker dropdown
//   • mutations for adding positive + negative keywords
//
// Mirrors the existing Google hooks (useGoogleAccounts pattern). All
// requests go through `api` (axios with HttpOnly-cookie credentials), so
// the AI agent path and the direct REST path share the same auth.
import { useCallback, useEffect, useState } from 'react';
import api from '../services/api.js';

// Request param helper — keeps every call's query-string shape identical
// and drops empty values so we don't end up with `?campaignId=&adGroupId=`.
const params = (...pairs) => {
  const obj = {};
  for (const [k, v] of pairs) if (v != null && v !== '') obj[k] = v;
  return obj;
};

export const useGoogleKeywords = ({ accountId, loginCustomerId, campaignId, adGroupId, dateRange = 'LAST_30_DAYS' } = {}) => {
  const [keywords, setKeywords] = useState([]);
  const [negativeKeywords, setNegativeKeywords] = useState([]);
  const [searchTerms, setSearchTerms] = useState([]);
  const [adGroups, setAdGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Three independent fetchers — components can call any subset (e.g. the
  // Negative tab only needs negatives + ad groups). All set the shared
  // loading / error state because the UI shows a single spinner per tab.
  const fetchKeywords = useCallback(async () => {
    if (!campaignId) { setKeywords([]); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await api.get('/google/keywords', {
        params: params(['accountId', accountId], ['loginCustomerId', loginCustomerId], ['campaignId', campaignId], ['adGroupId', adGroupId], ['dateRange', dateRange]),
      });
      setKeywords(data?.keywords || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to load keywords');
    } finally {
      setLoading(false);
    }
  }, [accountId, loginCustomerId, campaignId, adGroupId, dateRange]);

  const fetchNegatives = useCallback(async ({ level = 'campaign' } = {}) => {
    // For "campaign-level" the campaign id is enough. For "adGroup-level"
    // we need an adGroupId; without one we just clear the list rather
    // than error — the UI shows an empty state with a hint.
    if (level === 'campaign' && !campaignId) { setNegativeKeywords([]); return; }
    if (level === 'adGroup' && !adGroupId)   { setNegativeKeywords([]); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await api.get('/google/keywords/negative', {
        params: params(
          ['accountId', accountId], ['loginCustomerId', loginCustomerId],
          level === 'campaign' ? ['campaignId', campaignId] : ['adGroupId', adGroupId],
        ),
      });
      setNegativeKeywords(data?.negativeKeywords || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to load negative keywords');
    } finally {
      setLoading(false);
    }
  }, [accountId, loginCustomerId, campaignId, adGroupId]);

  const fetchSearchTerms = useCallback(async () => {
    if (!campaignId) { setSearchTerms([]); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await api.get('/google/keywords/search-terms', {
        params: params(['accountId', accountId], ['loginCustomerId', loginCustomerId], ['campaignId', campaignId], ['dateRange', dateRange]),
      });
      setSearchTerms(data?.searchTerms || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Failed to load search terms');
    } finally {
      setLoading(false);
    }
  }, [accountId, loginCustomerId, campaignId, dateRange]);

  const fetchAdGroups = useCallback(async () => {
    if (!campaignId) { setAdGroups([]); return; }
    try {
      const { data } = await api.get('/google/keywords/ad-groups', {
        params: params(['accountId', accountId], ['loginCustomerId', loginCustomerId], ['campaignId', campaignId]),
      });
      setAdGroups(data?.adGroups || []);
    } catch (err) {
      // Ad-group fetch is auxiliary — don't let it overwrite the main
      // tab's error message.
      console.warn('[useGoogleKeywords] ad-group fetch failed:', err?.message);
    }
  }, [accountId, loginCustomerId, campaignId]);

  // Auto-load ad groups whenever the campaign changes — the dropdown
  // should always reflect the currently selected campaign.
  useEffect(() => { fetchAdGroups(); }, [fetchAdGroups]);

  const addKeywords = useCallback(async ({ adGroupId: targetAdGroupId, keywords: list }) => {
    const { data } = await api.post('/google/keywords', { adGroupId: targetAdGroupId, keywords: list }, {
      params: params(['accountId', accountId], ['loginCustomerId', loginCustomerId]),
    });
    await fetchKeywords();
    return data;
  }, [accountId, loginCustomerId, fetchKeywords]);

  const addNegativeKeywords = useCallback(async ({ level, campaignId: cid, adGroupId: aid, keywords: list }) => {
    const { data } = await api.post('/google/keywords/negative', { level, campaignId: cid, adGroupId: aid, keywords: list }, {
      params: params(['accountId', accountId], ['loginCustomerId', loginCustomerId]),
    });
    await fetchNegatives({ level });
    return data;
  }, [accountId, loginCustomerId, fetchNegatives]);

  return {
    keywords, negativeKeywords, searchTerms, adGroups,
    loading, error,
    fetchKeywords, fetchNegatives, fetchSearchTerms, fetchAdGroups,
    addKeywords, addNegativeKeywords,
  };
};
