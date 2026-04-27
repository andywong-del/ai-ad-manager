-- ADK Session persistence tables
-- Replaces the in-memory InMemorySessionService so agent state survives
-- Vercel cold starts and horizontal scale-out.
-- Run this in the Supabase SQL Editor.

-- ── adk_sessions ──────────────────────────────────────────────────────────
-- One row per chat session. state is JSONB (token, adAccountId, workflow, etc.).
CREATE TABLE IF NOT EXISTS adk_sessions (
  id text PRIMARY KEY,                           -- session id (same as chat session id)
  app_name text NOT NULL,
  user_id text NOT NULL,                         -- ADK user id (currently constant "user")
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_update_time bigint NOT NULL,              -- epoch ms
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adk_sessions_app_user
  ON adk_sessions(app_name, user_id, last_update_time DESC);

-- ── adk_events ────────────────────────────────────────────────────────────
-- Event stream (user messages, model responses, function calls/responses).
-- Ordered by (session_id, seq) — seq gives a stable tie-break within same timestamp.
CREATE TABLE IF NOT EXISTS adk_events (
  seq bigserial,
  session_id text NOT NULL REFERENCES adk_sessions(id) ON DELETE CASCADE,
  app_name text NOT NULL,
  user_id text NOT NULL,
  event_data jsonb NOT NULL,                     -- full Event object
  timestamp bigint NOT NULL,                     -- epoch ms (event.timestamp)
  PRIMARY KEY (session_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_adk_events_session_ts
  ON adk_events(session_id, timestamp ASC);
