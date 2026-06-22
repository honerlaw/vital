import { type RoutineKnob } from '@/data/routine-types';

/**
 * Guard for a structured re-prompt knob (030). Pure directives (`more-volume`, `less-time`) carry
 * no payload; `emphasize` carries a `muscleGroup` string and `swap-equipment` a `note` string.
 * Validates the `/refine` request body; an unknown `kind` is rejected (strict-writer, 028).
 */
export function isRoutineKnob(value: unknown): value is RoutineKnob {
  if (typeof value !== 'object' || value === null || !('kind' in value)) return false;
  const kind = value.kind;
  if (kind === 'more-volume' || kind === 'less-time') return true;
  if (kind === 'emphasize') {
    return 'muscleGroup' in value && typeof value.muscleGroup === 'string';
  }
  if (kind === 'swap-equipment') {
    return 'note' in value && typeof value.note === 'string';
  }
  return false;
}
