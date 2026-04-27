// Out-of-band approval endpoints for SAFE_MODE pending confirmations.
// The AI sees a pending_id in its CONFIRMATION_REQUIRED response but cannot
// call these endpoints — only a real user session (with a valid FB Bearer
// token) can flip a row to approved.

import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { resolveUser } from '../middleware/resolveUser.js';

const router = Router();

// Cookie session preferred; Bearer header still works for legacy callers.
// resolveUser sets req.fbUserId — handlers below just read it.
router.use(resolveUser);

// List user's un-approved, un-consumed, un-expired pending confirmations.
router.get('/pending', async (req, res) => {
  const fbUserId = req.fbUserId;
  if (!fbUserId) return res.status(401).json({ error: 'unauthenticated' });
  if (!supabase) return res.status(503).json({ error: 'supabase_unavailable' });

  const { data, error } = await supabase
    .from('pending_confirmations')
    .select('*')
    .eq('fb_user_id', fbUserId)
    .eq('approved', false)
    .eq('consumed', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ pending: data || [] });
});

// Get a single pending row so the UI / user can inspect what they're about to approve.
router.get('/:id', async (req, res) => {
  const fbUserId = req.fbUserId;
  if (!fbUserId) return res.status(401).json({ error: 'unauthenticated' });
  if (!supabase) return res.status(503).json({ error: 'supabase_unavailable' });

  const { data, error } = await supabase
    .from('pending_confirmations')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'not_found' });
  if (data.fb_user_id && data.fb_user_id !== fbUserId) return res.status(403).json({ error: 'forbidden' });
  res.json(data);
});

// Approve a pending confirmation. After this, the AI can successfully retry
// its tool call with confirm_id = this id.
router.post('/:id/approve', async (req, res) => {
  const fbUserId = req.fbUserId;
  if (!fbUserId) return res.status(401).json({ error: 'unauthenticated' });
  if (!supabase) return res.status(503).json({ error: 'supabase_unavailable' });

  const { data, error } = await supabase
    .from('pending_confirmations')
    .select('id, fb_user_id, consumed, expires_at, approved')
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'not_found' });
  if (data.fb_user_id && data.fb_user_id !== fbUserId) return res.status(403).json({ error: 'forbidden' });
  if (data.consumed) return res.status(409).json({ error: 'already_consumed' });
  if (new Date(data.expires_at) < new Date()) return res.status(410).json({ error: 'expired' });

  const { error: updateErr } = await supabase
    .from('pending_confirmations')
    .update({ approved: true, approved_at: new Date().toISOString() })
    .eq('id', req.params.id);
  if (updateErr) return res.status(500).json({ error: updateErr.message });

  res.json({ ok: true, approved: true });
});

// Reject (explicitly mark consumed so the AI can't later approve out-of-band).
router.post('/:id/reject', async (req, res) => {
  const fbUserId = req.fbUserId;
  if (!fbUserId) return res.status(401).json({ error: 'unauthenticated' });
  if (!supabase) return res.status(503).json({ error: 'supabase_unavailable' });

  const { data } = await supabase
    .from('pending_confirmations')
    .select('fb_user_id')
    .eq('id', req.params.id)
    .maybeSingle();
  if (data?.fb_user_id && data.fb_user_id !== fbUserId) return res.status(403).json({ error: 'forbidden' });

  const { error: updateErr } = await supabase
    .from('pending_confirmations')
    .update({ consumed: true, consumed_at: new Date().toISOString() })
    .eq('id', req.params.id);
  if (updateErr) return res.status(500).json({ error: updateErr.message });

  res.json({ ok: true, rejected: true });
});

export default router;
