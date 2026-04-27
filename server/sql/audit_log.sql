-- AI write-operation audit log
-- Every time the AI agent calls a create_/update_/delete_ tool (Meta or Google),
-- one row is written here. Lets us answer "what did the AI change, for whom,
-- and when?" — required for compliance, debugging, and recovery.
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS audit_log (
  id            bigserial PRIMARY KEY,
  fb_user_id    text,                                 -- actor (null if token missing)
  session_id    text,                                 -- chat/adk session id
  platform      text NOT NULL,                        -- 'meta' | 'google'
  tool_name     text NOT NULL,                        -- e.g. create_campaign
  ad_account_id text,                                 -- Meta act_xxx or Google customer id
  args          jsonb,                                -- tool arguments (may be truncated)
  result        jsonb,                                -- tool return value (may be truncated)
  success       boolean NOT NULL,
  error_message text,
  duration_ms   integer,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_time   ON audit_log(fb_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_session     ON audit_log(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_tool        ON audit_log(tool_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_account     ON audit_log(ad_account_id, created_at DESC);
