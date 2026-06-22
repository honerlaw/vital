import { isDeloadModifier } from '@/data/guards/isDeloadModifier';
import { isProgressionRule } from '@/data/guards/isProgressionRule';
import { type ExerciseProgression } from '@/data/types';

/**
 * Guard for per-exercise progression metadata (030). `startWeight` is a non-negative finite
 * number or null (the session-1 anchor; null = "ask the user"). `rule` must be a valid member of
 * the closed vocabulary; `deload`, when present, must be a valid modifier. Absent `deload` is fine
 * (the field is optional). Shared by the LLM-program validator and the client guard path.
 */
export function isExerciseProgression(value: unknown): value is ExerciseProgression {
  if (typeof value !== 'object' || value === null) return false;
  if (!('startWeight' in value)) return false;
  const sw = value.startWeight;
  const startWeightOk =
    sw === null || (typeof sw === 'number' && Number.isFinite(sw) && sw >= 0);
  if (!startWeightOk) return false;
  if (!('rule' in value) || !isProgressionRule(value.rule)) return false;
  if ('deload' in value && !isDeloadModifier(value.deload)) return false;
  return true;
}
