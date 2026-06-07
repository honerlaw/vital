import { type SetEntry } from '@/data/types';

/**
 * Guard for one set record (022). Shared by the client hydration sanitizer, the server row
 * mapper, and the POST body validator — one implementation so the three trust boundaries
 * can't drift (the isCursorMap discipline). `Number.isFinite` / `Number.isInteger` (not bare
 * `typeof === 'number'`) are load-bearing: they reject NaN/Infinity (and float reps), so no
 * unusable value reaches history or the UI's `weight × reps` rendering.
 */
export function isSetEntry(value: unknown): value is SetEntry {
  return (
    typeof value === 'object' &&
    value !== null &&
    'done' in value &&
    typeof value.done === 'boolean' &&
    'weight' in value &&
    (value.weight === null ||
      (typeof value.weight === 'number' && Number.isFinite(value.weight) && value.weight >= 0)) &&
    'reps' in value &&
    (value.reps === null ||
      (typeof value.reps === 'number' && Number.isInteger(value.reps) && value.reps >= 0))
  );
}
