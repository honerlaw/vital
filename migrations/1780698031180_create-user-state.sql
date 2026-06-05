-- Up Migration
--
-- Per-user persistence (012): a single-row settings table keyed by the Clerk user id plus an
-- append-only workout-session log. `active_program_id` / `program_id` are SOFT references to
-- programs.id — deliberately no FK (a FK would couple user rows to the seeded catalog and
-- cascade-delete history on a program removal; stale ids are normalized client-side at
-- hydration). One global cursor mirrors current client semantics; a per-program cursor is an
-- anticipated ADDITIVE later migration.

CREATE TABLE user_state (
  clerk_user_id     text        PRIMARY KEY,
  active_program_id text        NOT NULL,
  cursor            integer     NOT NULL,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workout_sessions (
  id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  clerk_user_id text        NOT NULL,
  program_id    text        NOT NULL,
  program_name  text        NOT NULL,
  day_name      text        NOT NULL,
  finished_at   timestamptz NOT NULL
);

CREATE INDEX workout_sessions_user_finished_idx
  ON workout_sessions (clerk_user_id, finished_at DESC);

-- Down Migration

DROP TABLE workout_sessions;
DROP TABLE user_state;
