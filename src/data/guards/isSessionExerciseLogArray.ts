import { isSessionExerciseLog } from '@/data/guards/isSessionExerciseLog';
import { type SessionExerciseLog } from '@/data/types';

/** Guard for a session's full per-exercise set log (022). */
export function isSessionExerciseLogArray(value: unknown): value is SessionExerciseLog[] {
  return Array.isArray(value) && value.every(isSessionExerciseLog);
}
