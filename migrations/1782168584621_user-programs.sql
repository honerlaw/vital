-- Up Migration
--
-- AI-generated custom routines (030). Two additive tables.
--
-- user_programs — this user's generated programs. Structurally a superset of `programs`
-- (id/name/tag/cred/per_week/blurb/days); per-exercise PROGRESSION metadata is folded INTO each
-- exercise inside the `days` jsonb (no separate column — progression is per-exercise, not per-row),
-- and `spec` jsonb holds the intake answers that produced it so a post-commit refine can re-seed.
-- Keyed by clerk_user_id (soft reference, no FK — same 012 rationale as user_state /
-- workout_sessions). `id` is a uuid (pgcrypto gen_random_uuid, enabled in the init migration) so a
-- generated draft carries a stable id before it is saved. A saved program is immutable — refine
-- spawns a NEW row rather than mutating one that has sessions logged against it (028 invariant).

CREATE TABLE user_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  name text NOT NULL,
  tag text NOT NULL,
  cred text NOT NULL,
  per_week integer NOT NULL,
  blurb text NOT NULL,
  days jsonb NOT NULL,
  spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_programs_user_idx ON user_programs (clerk_user_id, created_at);

-- llm_usage — a per-user daily call counter backing a simple server-side rate cap on the LLM
-- routes (plan/generate/refine). PK (clerk_user_id, day) so a single upsert increments today's
-- count; older rows are harmless history. Checked-and-incremented at request time.

CREATE TABLE llm_usage (
  clerk_user_id text NOT NULL,
  day date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (clerk_user_id, day)
);

-- Down Migration

DROP TABLE llm_usage;

DROP TABLE user_programs;
