-- Uploads registry — tracks every file put into GCS under ai-ad-manager/*.
-- Run in Supabase SQL Editor (Dashboard > SQL Editor > New Query).
--
-- Flow:
--   /sign inserts row with status='pending'
--   /commit upserts row to status='committed' with server-verified metadata
--   Rows still 'pending' after N hours can be GC'd (separate cron, not here).

CREATE TABLE IF NOT EXISTS uploads (
  object_key        text PRIMARY KEY,       -- canonical GCS path (ai-ad-manager/...)
  fb_user_id        text NOT NULL,
  kind              text NOT NULL,          -- chat | skills | brand | creative
  content_type      text,
  original_filename text,
  declared_size     bigint,                  -- what the client said at /sign
  actual_size       bigint,                  -- what GCS reported at /commit
  md5_hash          text,
  etag              text,
  generation        text,
  status            text NOT NULL DEFAULT 'pending', -- pending | committed | failed
  created_at        timestamptz NOT NULL DEFAULT now(),
  committed_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_uploads_user ON uploads(fb_user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_kind ON uploads(kind);
CREATE INDEX IF NOT EXISTS idx_uploads_pending ON uploads(status, created_at) WHERE status = 'pending';

-- RLS: service key bypasses, so this is mostly documentation.
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
