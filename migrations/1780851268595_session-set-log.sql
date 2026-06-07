-- Up Migration
--
-- Per-set weight & reps log (022). One jsonb column on the append-only history table —
-- denormalized like `program_name`/`day_name` (soft references, no FK; same 012 rationale).
-- Shape: {"unit":"lb","exercises":[{"name","scheme","sets":[{"done","weight","reps"}]}]}.
-- The unit is denormalized INTO each row so history is self-describing — a future kg toggle
-- needs no backfill of old rows. '{}' (the default, and every pre-022 row / old-client write)
-- means "no per-set data": the reader omits the optional field rather than serving an empty
-- workout. The reader is best-effort by design — a malformed blob degrades to a log without
-- set data; it must never 500 the history list (which gates boot).

ALTER TABLE workout_sessions ADD COLUMN set_log jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Down Migration

-- Lossy by design (mirrors the 015 down): per-set data has no home without the column.
ALTER TABLE workout_sessions DROP COLUMN set_log;
