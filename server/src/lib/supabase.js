import { createClient } from '@supabase/supabase-js';

let _client = null;

export const getSupabase = () => {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  _client = createClient(url, key);
  return _client;
};

// Backward compat — lazy getter
export const supabase = new Proxy({}, {
  get(_, prop) {
    const client = getSupabase();
    if (!client) return prop === 'from' ? () => ({ select: () => ({ data: null, error: { message: 'Supabase not configured' } }) }) : undefined;
    return client[prop]?.bind?.(client) ?? client[prop];
  }
});
