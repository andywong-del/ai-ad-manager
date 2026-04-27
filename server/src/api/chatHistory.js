import { Router } from 'express';
import axios from 'axios';
import { supabase } from '../lib/supabase.js';
import { resolveUser } from '../middleware/resolveUser.js';

const router = Router();

router.use(resolveUser);

const requireUser = (req, res, next) => {
  if (!req.fbUserId) return res.status(401).json({ error: 'Authentication required' });
  if (!supabase) return res.status(503).json({ error: 'Database not configured' });
  next();
};

const isTableMissing = (error) => error?.code === 'PGRST205' || error?.message?.includes('schema cache');

// ── GET /sessions — list recent sessions for this user ────────────────────
router.get('/sessions', requireUser, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('id, title, ad_account_id, pinned, message_count, created_at, updated_at')
    .eq('fb_user_id', req.fbUserId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isTableMissing(error)) return res.json({ sessions: [], _warn: 'chat_sessions table missing — run server/sql/chat_history.sql' });
    return res.status(500).json({ error: error.message });
  }
  res.json({ sessions: data || [] });
});

// ── GET /sessions/:id/messages ────────────────────────────────────────────
router.get('/sessions/:id/messages', requireUser, async (req, res) => {
  const { id } = req.params;

  // Verify ownership
  const { data: session, error: sErr } = await supabase
    .from('chat_sessions').select('id').eq('id', id).eq('fb_user_id', req.fbUserId).single();
  if (sErr || !session) return res.status(404).json({ error: 'Session not found' });

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, role, content, metadata, created_at')
    .eq('session_id', id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ messages: data || [] });
});

// ── PUT /sessions/:id — upsert session metadata ───────────────────────────
router.put('/sessions/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const { title, ad_account_id, pinned, message_count } = req.body || {};

  const payload = {
    id,
    fb_user_id: req.fbUserId,
    updated_at: new Date().toISOString(),
  };
  if (title !== undefined) payload.title = title;
  if (ad_account_id !== undefined) payload.ad_account_id = ad_account_id;
  if (pinned !== undefined) payload.pinned = pinned;
  if (message_count !== undefined) payload.message_count = message_count;

  const { data, error } = await supabase
    .from('chat_sessions')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    if (isTableMissing(error)) return res.status(503).json({ error: 'chat_sessions table missing — run server/sql/chat_history.sql' });
    return res.status(500).json({ error: error.message });
  }
  res.json({ session: data });
});

// ── DELETE /sessions/:id ──────────────────────────────────────────────────
router.delete('/sessions/:id', requireUser, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('chat_sessions').delete().eq('id', id).eq('fb_user_id', req.fbUserId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ── POST /sessions/:id/messages — batch upsert messages ───────────────────
// Body: { messages: [{ id, role, content, metadata?, created_at? }] }
// Upserts by id so re-sending is idempotent.
router.post('/sessions/:id/messages', requireUser, async (req, res) => {
  const { id: sessionId } = req.params;
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Ensure session exists (auto-create with derived title if missing)
  const { data: existing } = await supabase
    .from('chat_sessions').select('id').eq('id', sessionId).eq('fb_user_id', req.fbUserId).single();
  if (!existing) {
    const firstUser = messages.find(m => m.role === 'user');
    const title = (firstUser?.content || 'New Chat').slice(0, 80);
    const { error: cErr } = await supabase
      .from('chat_sessions')
      .insert({ id: sessionId, fb_user_id: req.fbUserId, title });
    if (cErr && !isTableMissing(cErr)) return res.status(500).json({ error: cErr.message });
  }

  const rows = messages.map(m => ({
    id: m.id,
    session_id: sessionId,
    fb_user_id: req.fbUserId,
    role: m.role,
    content: m.content ?? m.text ?? '',
    metadata: m.metadata || {},
    created_at: m.created_at || (m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString()),
  }));

  const { error } = await supabase
    .from('chat_messages').upsert(rows, { onConflict: 'id' });
  if (error) {
    if (isTableMissing(error)) return res.status(503).json({ error: 'chat_messages table missing — run server/sql/chat_history.sql' });
    return res.status(500).json({ error: error.message });
  }

  // Bump session updated_at + message_count
  await supabase
    .from('chat_sessions')
    .update({ updated_at: new Date().toISOString(), message_count: rows.length })
    .eq('id', sessionId)
    .eq('fb_user_id', req.fbUserId);

  res.json({ ok: true, saved: rows.length });
});

export default router;
