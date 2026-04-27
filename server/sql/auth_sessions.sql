-- Server-managed sessions for the FB long-lived token.
--
-- Why this table exists:
--   The long-lived FB access token used to live in browser localStorage.
--   That meant any XSS payload could exfiltrate it and impersonate the user
--   for ~60 days. We now keep the token server-side, keyed by a random
--   session id that is shipped to the browser as an HttpOnly cookie. JS in
--   the page can't read the session id; the server is the only place that
--   ever sees the long-lived token.
--
-- Lookup is by `id` (the cookie value). `fb_user_id` is denormalized so we
-- can revoke every session for a user in one statement (e.g. on logout-all,
-- compromised account, etc).

create table if not exists auth_sessions (
  id              text primary key,                       -- random session id (cookie value)
  fb_user_id      text,                                   -- Facebook numeric user id, for revoke-all
  fb_token        text not null,                          -- long-lived FB access token
  fb_token_exp    timestamptz,                            -- when FB says the token expires
  user_name       text,                                   -- cached display name (for /session response)
  user_first_name text,
  created_at      timestamptz default now(),
  last_seen_at    timestamptz default now(),
  expires_at      timestamptz not null                    -- session expiry (we trim early in app code)
);

create index if not exists auth_sessions_fb_user_id_idx on auth_sessions(fb_user_id);
create index if not exists auth_sessions_expires_at_idx on auth_sessions(expires_at);

-- Periodic cleanup is the caller's job; schedule a cron in Supabase or just
-- run on app startup. Keeping the SQL minimal so it stays portable.
