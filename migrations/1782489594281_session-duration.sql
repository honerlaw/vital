-- Up Migration
--
-- Per-session elapsed time (041): wall-clock seconds from the Begin tap to Finish & log. Nullable
-- because sessions logged before 041 have no start timestamp to derive it from — NULL reads as
-- "no duration" (the mapper omits the optional `durationSec`), exactly like the 022 `set_log`
-- '{}' default. The client computes the value (finishSession) and the POST validator rejects
-- NaN/Infinity/negative/float before it reaches this append-only column.

ALTER TABLE workout_sessions ADD COLUMN duration_sec integer;

-- Down Migration
--
-- Lossy by design (mirrors the 022 set_log down): elapsed time has no home without the column.

ALTER TABLE workout_sessions DROP COLUMN duration_sec;
