/**
 * Maps a raw `workout_sessions` table row (every column `unknown`) to the typed `SessionLog`.
 * pg returns `timestamptz` columns as JS `Date` instances (NOT strings), so `finished_at` is
 * narrowed via `instanceof Date` and serialized with `.toISOString()` — a string-typed guard
 * would reject every row. Invalid rows throw (the route 500s rather than serving a partial
 * list). No `pg` import — unit-testable offline.
 */
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

  return { programId, programName, dayName, dateISO: finishedAt.toISOString() };
}
