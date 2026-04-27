-- custom_skill_revisions
--
-- Append-only history for custom skills. Every create/update/revert on
-- `custom_skills` writes a snapshot row here. Used by the "History" panel
-- in StrategistConfig and by POST /api/skills/:id/revert.
--
-- Notes:
-- * `version` is monotonic per skill (1, 2, 3, …). Reverting bumps to
--   max+1 just like a regular edit — history is never rewritten.
-- * `(skill_id, fb_user_id)` is the natural owner key; we keep both so the
--   table can be filtered without a join when a row is fetched directly.
-- * No FK to custom_skills — we want history to survive a skill delete so
--   admins can audit deletions. (DELETE on custom_skills leaves orphan
--   revisions; that's intentional.)

create table if not exists custom_skill_revisions (
  id          bigserial   primary key,
  skill_id    text        not null,
  fb_user_id  text        not null,
  version     int         not null,
  name        text        not null,
  description text        default '',
  content     text        default '',
  icon        text        default 'sparkles',
  type        text        default 'strategy',
  preview     text        default '',
  source      text        default 'edit',  -- 'create' | 'edit' | 'revert'
  reverted_from int       null,            -- if source='revert', which version
  created_at  timestamptz default now(),
  unique (skill_id, version)
);

create index if not exists custom_skill_revisions_skill_idx
  on custom_skill_revisions (skill_id, version desc);

create index if not exists custom_skill_revisions_user_idx
  on custom_skill_revisions (fb_user_id, created_at desc);
