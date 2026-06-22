import { isExerciseProgression } from '@/data/guards/isExerciseProgression';
import { type Exercise } from '@/data/types';

/**
 * Guard for one exercise. `progression` (030) is OPTIONAL — catalog exercises omit it (so they
 * stay untouched), generated exercises carry it. When present it must be a valid
 * `ExerciseProgression`; this is how `isProgram` transitively validates a generated program's
 * progression with no separate generated-program guard.
 */
export function isExercise(value: unknown): value is Exercise {
  if (typeof value !== 'object' || value === null) return false;
  if (!('name' in value) || typeof value.name !== 'string') return false;
  if (!('sets' in value) || typeof value.sets !== 'number') return false;
  if (!('scheme' in value) || typeof value.scheme !== 'string') return false;
  if ('progression' in value && !isExerciseProgression(value.progression)) return false;
  return true;
}
