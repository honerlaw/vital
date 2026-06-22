import { type ProgressionRule } from '@/data/types';

/**
 * Guard for the closed progression vocabulary (030). The discriminated union is validated by
 * `kind`, and ANY unknown `kind` falls through to `false` — this is the strict-writer fence (028)
 * that keeps the LLM from smuggling executable logic the engine can't apply. Numeric fields use
 * `Number.isFinite` / `Number.isInteger` (not bare `typeof`) so NaN/Infinity/floats can't reach
 * the `progressionTarget` arithmetic. Shared by the server LLM-program validator and the client
 * hydration/guard path so the boundaries can't drift.
 */
export function isProgressionRule(value: unknown): value is ProgressionRule {
  if (typeof value !== 'object' || value === null || !('kind' in value)) return false;
  const kind = value.kind;
  if (kind === 'linear') {
    return (
      'increment' in value &&
      typeof value.increment === 'number' &&
      Number.isFinite(value.increment) &&
      'frequency' in value &&
      (value.frequency === 'per-session' || value.frequency === 'per-week')
    );
  }
  if (kind === 'double-progression') {
    return (
      'repLow' in value &&
      typeof value.repLow === 'number' &&
      Number.isInteger(value.repLow) &&
      'repHigh' in value &&
      typeof value.repHigh === 'number' &&
      Number.isInteger(value.repHigh) &&
      'increment' in value &&
      typeof value.increment === 'number' &&
      Number.isFinite(value.increment)
    );
  }
  if (kind === 'amrap-driven') {
    return (
      'baseIncrement' in value &&
      typeof value.baseIncrement === 'number' &&
      Number.isFinite(value.baseIncrement) &&
      'bonusThresholdReps' in value &&
      typeof value.bonusThresholdReps === 'number' &&
      Number.isInteger(value.bonusThresholdReps) &&
      'bonusIncrement' in value &&
      typeof value.bonusIncrement === 'number' &&
      Number.isFinite(value.bonusIncrement)
    );
  }
  return false;
}
