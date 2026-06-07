import { isSetEntry } from '@/data/guards/isSetEntry';
import { type SessionExerciseLog } from '@/data/types';

/** Guard for one per-exercise slice of a session's set log (022). */
export function isSessionExerciseLog(value: unknown): value is SessionExerciseLog {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    'scheme' in value &&
    typeof value.scheme === 'string' &&
    'sets' in value &&
    Array.isArray(value.sets) &&
    value.sets.every(isSetEntry)
  );
}
