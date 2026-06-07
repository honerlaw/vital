import { isSessionExerciseLogArray } from '@/data/guards';
import { type SessionLog } from '@/data/types';

/**
 * Client-side mirror of the server's best-effort `set_log` read (022): rebuild the history
 * entry from its core fields and attach `exercises`/`unit` ONLY when they re-validate through
 * the shared guard. The core payload guard (`isSessionLog`) checks only the four legacy
 * fields, so a malformed optional field would otherwise ride into typed state — and making
 * the array guard strict instead would let ONE corrupt row fail `every()` and brick boot,
 * the exact vector the tolerant server reader closes. Degrade symmetrically: worst case a
 * session shows no set detail, never an error screen.
 */
export function sanitizeSessionLog(log: SessionLog): SessionLog {
  const out: SessionLog = {
    programId: log.programId,
    programName: log.programName,
    dayName: log.dayName,
    dateISO: log.dateISO,
  };
  if (isSessionExerciseLogArray(log.exercises) && log.exercises.length > 0 && log.unit === 'lb') {
    out.exercises = log.exercises;
    out.unit = log.unit;
  }
  return out;
}
