-- Up Migration
--
-- Per-program cursors (015): each program keeps its own rotation position, so switching
-- the active program never zeroes progress. Supersedes 012's "one global cursor mirrors
-- current client semantics; a per-program cursor is an anticipated ADDITIVE later
-- migration" — realized here as additive-then-cutover (the scalar column is dropped after
-- backfill). The map is keyed by program id (soft reference, same rationale as 012: no FK).

ALTER TABLE user_state ADD COLUMN cursors jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE user_state SET cursors = jsonb_build_object(active_program_id, cursor);

ALTER TABLE user_state DROP COLUMN cursor;

-- Down Migration

ALTER TABLE user_state ADD COLUMN cursor integer;

-- Lossy by necessity: only the active program's position survives a downgrade (sibling
-- keys have no scalar home). COALESCE guards a row whose map lacks the active key.
UPDATE user_state
  SET cursor = COALESCE((cursors ->> active_program_id)::integer, 0);

ALTER TABLE user_state ALTER COLUMN cursor SET NOT NULL;

ALTER TABLE user_state DROP COLUMN cursors;
