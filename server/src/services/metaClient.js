import axios from 'axios';

const BASE_URL = process.env.META_BASE_URL || 'https://graph.facebook.com';
const API_VERSION = process.env.FB_API_VERSION || 'v19.0';

const metaApi = axios.create({ baseURL: `${BASE_URL}/${API_VERSION}`, timeout: 12000 });

export const getCampaigns = async (token, adAccountId) => {
  const { data } = await metaApi.get(`/${adAccountId}/campaigns`, {
    params: {
      access_token: token,
      fields: 'id,name,status,daily_budget,insights.date_preset(last_7d){spend,impressions,clicks,actions,action_values}'
    }
  });
  return data.data;
};

export const updateCampaign = async (token, campaignId, updates) => {
  const { data } = await metaApi.post(`/${campaignId}`, null, {
    params: { access_token: token, ...updates }
  });
  return data;
};

export const getInsights = async (token, adAccountId, datePreset = 'last_7d') => {
  const { data } = await metaApi.get(`/${adAccountId}/insights`, {
    params: {
      access_token: token,
      fields: 'spend,actions,action_values,impressions,clicks,ctr,cpm',
      date_preset: datePreset
    }
  });
  return data.data[0] || {};
};

export const getAdAccounts = async (token) => {
  const { data } = await metaApi.get('/me/adaccounts', {
    params: {
      access_token: token,
      fields: 'id,name,account_id,account_status,currency,business',
      limit: 100
    }
  });
  return data.data;
};

export const getBusinesses = async (token) => {
  const { data } = await metaApi.get('/me/businesses', {
    params: { access_token: token, fields: 'id,name,verification_status' }
  });
  return data.data;
};

export const getPages = async (token) => {
  const { data } = await metaApi.get('/me/accounts', {
    params: { access_token: token, fields: 'id,name,engagement,fan_count,category' }
  });
  return data.data;
};

export const getCustomAudiences = async (token, adAccountId) => {
  const { data } = await metaApi.get(`/${adAccountId}/customaudiences`, {
    params: {
      access_token: token,
      fields: 'id,name,subtype,approximate_count,description',
      limit: 50,
    }
  });
  return data.data;
};

export const getOwnedAdAccounts = async (token, businessId) => {
  const { data } = await metaApi.get(`/${businessId}/owned_ad_accounts`, {
    params: {
      access_token: token,
      fields: 'id,name,account_id,account_status,currency',
      limit: 100
    }
  });
  return data.data;
};

export const getPageAds = async (token, pageId) => {
  const { data } = await metaApi.get(`/${pageId}/ads`, {
    params: { access_token: token, fields: 'id,name,status,effective_status', limit: 25 }
  });
  return data.data;
};

export const createCustomAudience = async (token, adAccountId, params) => {
  const { data } = await metaApi.post(`/${adAccountId}/customaudiences`, null, {
    params: {
      access_token: token,
      name: params.name,
      subtype: params.subtype || 'WEBSITE',
      description: params.description || '',
      retention_days: 30,
    }
  });
  return data;
};

export const createCampaign = async (token, adAccountId, params) => {
  const { data } = await metaApi.post(`/${adAccountId}/campaigns`, null, {
    params: { access_token: token, ...params }
  });
  return data;
};

export const exchangeToken = async (shortLivedToken) => {
  const { data } = await metaApi.get('/oauth/access_token', {
    params: {
      grant_type: 'fb_exchange_token',
      client_id: process.env.FB_APP_ID,
      client_secret: process.env.FB_APP_SECRET,
      fb_exchange_token: shortLivedToken
    }
  });
  return data;
};
