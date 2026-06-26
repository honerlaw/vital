/**
 * Maps a raw `workout_sessions` table row (every column `unknown`) to the typed `SessionLog`.
 * pg returns `timestamptz` columns as JS `Date` instances (NOT strings), so `finished_at` is
 * narrowed via `instanceof Date` and serialized with `.toISOString()` — a string-typed guard
 * would reject every row. Invalid CORE columns throw (the route 500s rather than serving a
 * partial list — their corruption is server fault). The optional `set_log` (022) is the one
 * deliberate exception: it is client-supplied data parsed BEST-EFFORT — a malformed blob
 * console.errors and degrades to a log without `exercises`, because one bad row must never
 * 500 the whole history (which gates boot). '{}' / empty exercises = "no per-set data" (the
 * pre-022 default and every old-client write), omitted silently. No `pg` import —
 * unit-testable offline.
 */
import { isSessionExerciseLogArray } from '@/data/guards';
import { type UnknownRow } from '@/server/db';
import { type SessionLog } from '@/data/types';

export function rowToSessionLog(row: UnknownRow): SessionLog {
  const programId = row['program_id'];
  const programName = row['program_name'];
  const dayName = row['day_name'];
  const finishedAt = row['finished_at'];

  if (typeof programId !== 'string') throw new Error('workout_sessions.program_id not a string');
  if (typeof programName !== 'string') {
    throw new Error('workout_sessions.program_name is not a string');
  }
  if (typeof dayName !== 'string') throw new Error('workout_sessions.day_name is not a string');
  if (!(finishedAt instanceof Date)) {
    throw new Error('workout_sessions.finished_at is not a Date');
  }

  const log: SessionLog = { programId, programName, dayName, dateISO: finishedAt.toISOString() };

  // Best-effort duration_sec (041) — pg returns an integer column as a JS number, NULL (pre-041
  // rows) as null. Attach only a finite, non-negative value; anything else degrades to "no
  // duration" rather than 500ing the boot-gating history list (same tolerant-reader posture as
  // set_log below).
  const durationSec = row['duration_sec'];
  if (typeof durationSec === 'number' && Number.isFinite(durationSec) && durationSec >= 0) {
    log.durationSec = durationSec;
  } else if (durationSec !== null && durationSec !== undefined) {
    console.error('workout_sessions.duration_sec malformed — serving log without duration');
  }

  // Best-effort set_log (022) — pg parses jsonb into a JS value already.
  const setLog = row['set_log'];
  if (typeof setLog === 'object' && setLog !== null && !Array.isArray(setLog)) {
    if ('exercises' in setLog || 'unit' in setLog) {
      if (
        'exercises' in setLog &&
        isSessionExerciseLogArray(setLog.exercises) &&
        'unit' in setLog &&
        setLog.unit === 'lb'
      ) {
        if (setLog.exercises.length > 0) {
          log.exercises = setLog.exercises;
          log.unit = setLog.unit;
        }
      } else {
        console.error('workout_sessions.set_log malformed — serving log without set data');
      }
    }
  } else if (setLog !== undefined) {
    console.error('workout_sessions.set_log malformed — serving log without set data');
  }

  return log;
}
