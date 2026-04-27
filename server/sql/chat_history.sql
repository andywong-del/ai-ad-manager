-- Chat history tables for Supabase
-- Persists user chat sessions and messages (previously only in browser localStorage).
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New Query).

-- ── chat_sessions ──────────────────────────────────────────────────────────
-- Session metadata (title, pinned, timestamps). Keyed by frontend-generated id
-- so the same sessionId used in localStorage maps 1:1 to a DB row.
CREATE TABLE IF NOT EXISTS chat_sessions (
  id text PRIMARY KEY,                      -- frontend session id (makeId output)
  fb_user_id text NOT NULL,                 -- Meta user id (owner)
  ad_account_id text,                       -- ad account selected at creation (nullable)
  title text,                               -- first user message, truncated
  pinned boolean DEFAULT false,
  message_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(fb_user_id, updated_at DESC);

-- ── chat_messages ──────────────────────────────────────────────────────────
-- One row per message. Both user and agent messages stored.
-- metadata holds attachments, tool calls, canvas blocks, etc.
CREATE TABLE IF NOT EXISTS chat_messages (
  id text PRIMARY KEY,                      -- frontend message id
  session_id text NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  fb_user_id text NOT NULL,                 -- denormalised for faster user-scoped queries
  role text NOT NULL,                       -- 'user' | 'agent' | 'system'
  content text,                             -- message text
  metadata jsonb DEFAULT '{}'::jsonb,       -- attachments, activity log, etc.
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(fb_user_id, created_at DESC);
