import * as metaClient from './metaClient.js';

// In-memory token store — production should use a database
const tokenStore = new Map();

export const exchangeToken = async (shortLivedToken) => {
  const result = await metaClient.exchangeToken(shortLivedToken);
  const expiresAt = Date.now() + (result.expires_in || 5184000) * 1000;
  const entry = {
    longLivedToken: result.access_token,
    expiresAt,
    tokenType: result.token_type
  };
  tokenStore.set(result.access_token, entry);
  return entry;
};

export const getToken = (token) => tokenStore.get(token) || null;
