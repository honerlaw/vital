-- Up Migration
--
-- Per-user workout equipment profile (042). One additive table, one row per user.
--
-- user_equipment — the canonical equipment ids the user owns (see src/data/equipment-catalog.ts),
-- stored as a jsonb string array. Keyed by clerk_user_id (soft reference, no FK — same 012
-- rationale as user_state / workout_sessions / food_log_entries). Single-row-per-user, mirroring
-- user_state: the GET route returns an empty list for a user with no row yet (no 404 special-case),
-- and PUT upserts on the primary key. `items` defaults to an empty array so a freshly-inserted row
-- is well-formed. Boot-hydrated (small, per-user), so no secondary index is needed beyond the PK.

CREATE TABLE user_equipment (
  clerk_user_id text        PRIMARY KEY,
  items         jsonb       NOT NULL DEFAULT '[]'::jsonb,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Down Migration

DROP TABLE user_equipment;
