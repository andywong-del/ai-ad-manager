import { Router } from 'express';
import * as metaClient from '../services/metaClient.js';

const router = Router();


// GET / - List ad creatives (paginated)
router.get('/', async (req, res) => {
  try {
    const { adAccountId, limit, after } = req.query;
    if (!adAccountId) {
      return res.status(400).json({ error: 'adAccountId query parameter is required' });
    }
    const params = {
      access_token: req.token,
      limit: limit ? parseInt(limit) : 24,
      fields: 'id,name,status,body,title,image_hash,image_url,video_id,object_story_spec,object_url,call_to_action_type,url_tags,asset_feed_spec,thumbnail_url',
    };
    if (after) params.after = after;
    const { data } = await metaClient.metaApi.get(`/${adAccountId}/adcreatives`, { params });
    res.json({ data: data?.data || [], paging: data?.paging || null });
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[creatives] GET / error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /ad-library - Fetch ads with full creative data + campaign/adset names for the Ad Library view
router.get('/ad-library', async (req, res) => {
  try {
    const { adAccountId, limit, after } = req.query;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });
    const fields = [
      'id', 'name', 'status', 'effective_status', 'created_time',
      'campaign_id', 'campaign{id,name,objective,status}',
      'adset_id', 'adset{id,name,status}',
      'creative{id,name,title,body,image_url,image_hash,thumbnail_url,video_id,object_story_spec,call_to_action_type,asset_feed_spec}',
      'preview_shareable_link',
    ].join(',');
    const params = {
      access_token: req.token,
      fields,
      limit: limit ? parseInt(limit) : 24,
    };
    if (after) params.after = after;
    const { data } = await metaClient.metaApi.get(`/${adAccountId}/ads`, { params });
    res.json({ data: data?.data || [], paging: data?.paging || null });
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[creatives] GET /ad-library error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /:id/previews - Preview creative (must be before /:id to avoid param collision)
router.get('/:id/previews', async (req, res) => {
  try {
    const { ad_format } = req.query;
    if (!ad_format) {
      return res.status(400).json({ error: 'ad_format query parameter is required' });
    }
    const preview = await metaClient.getCreativePreview(req.token, req.params.id, ad_format);
    res.json(preview);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[creatives] GET /:id/previews error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /:id - Get single creative
router.get('/:id', async (req, res) => {
  try {
    const creative = await metaClient.getAdCreative(req.token, req.params.id);
    res.json(creative);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[creatives] GET /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST / - Create ad creative
router.post('/', async (req, res) => {
  try {
    const { adAccountId, name, body, title, image_hash, video_id, object_story_spec, object_url, call_to_action_type, url_tags, asset_feed_spec } = req.body;
    if (!adAccountId || !name) {
      return res.status(400).json({ error: 'adAccountId and name are required' });
    }
    const params = { name };
    if (body !== undefined) params.body = body;
    if (title !== undefined) params.title = title;
    if (image_hash !== undefined) params.image_hash = image_hash;
    if (video_id !== undefined) params.video_id = video_id;
    if (object_story_spec !== undefined) params.object_story_spec = object_story_spec;
    if (object_url !== undefined) params.object_url = object_url;
    if (call_to_action_type !== undefined) params.call_to_action_type = call_to_action_type;
    if (url_tags !== undefined) params.url_tags = url_tags;
    if (asset_feed_spec !== undefined) params.asset_feed_spec = asset_feed_spec;

    const result = await metaClient.createAdCreative(req.token, adAccountId, params);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[creatives] POST / error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// PATCH /:id - Update creative
router.patch('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const result = await metaClient.updateAdCreative(req.token, req.params.id, updates);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[creatives] PATCH /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// DELETE /:id - Delete creative
router.delete('/:id', async (req, res) => {
  try {
    const result = await metaClient.deleteAdCreative(req.token, req.params.id);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[creatives] DELETE /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

export default router;
