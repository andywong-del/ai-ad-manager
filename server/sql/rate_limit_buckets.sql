-- Distributed rate-limit counters.
--
-- Vercel serverless functions don't share memory across invocations, so an
-- in-process Map can't actually rate-limit anything in prod. We park the
-- counters in Postgres instead and lean on a single atomic upsert per
-- request to bump+read the count race-safely.
--
-- Algorithm: fixed window. Each bucket is keyed by `(key, window_start)`,
-- where `window_start` is the unix-ms boundary the request landed in. New
-- window → new row → count starts at 1. Same window → ON CONFLICT bumps
-- the existing row. Cheap, no locking on hot keys, and the row count is
-- bounded by `(active_keys * windows_kept)`.
--
-- We don't try to do sliding-window — this isn't a billing meter, just a
-- DoS / cost cap. Fixed-window's "burst at the window edge" weakness is
-- fine when the window is 60s.

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key           text   NOT NULL,
  window_start  bigint NOT NULL,        -- unix ms, floor()ed to window size
  count         integer NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS rate_limit_buckets_window_idx
  ON rate_limit_buckets(window_start);

-- Atomic "increment and return new count". One round-trip per request.
-- The ON CONFLICT path is what makes this race-safe: two concurrent
-- INSERTs on the same (key, window_start) — exactly one wins the insert
-- with count=1, the other lands on the conflict branch and reads/updates
-- the existing row, returning count=2. No advisory lock needed.
CREATE OR REPLACE FUNCTION rate_limit_incr(p_key text, p_window_start bigint)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_count integer;
BEGIN
  INSERT INTO rate_limit_buckets (key, window_start, count)
       VALUES (p_key, p_window_start, 1)
  ON CONFLICT (key, window_start)
       DO UPDATE SET count = rate_limit_buckets.count + 1
    RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

-- Optional periodic cleanup — run via Supabase scheduled job or cron. Keeps
-- the table from growing forever; a 1-day retention is plenty since the
-- longest window we use is 24h.
CREATE OR REPLACE FUNCTION rate_limit_cleanup(p_keep_ms bigint DEFAULT 172800000)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted integer;
BEGIN
  DELETE FROM rate_limit_buckets
   WHERE window_start < (EXTRACT(EPOCH FROM now()) * 1000)::bigint - p_keep_ms;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;
