import { type DeloadModifier } from '@/data/types';

/**
 * Guard for the optional deload modifier (030). `triggerConsecutiveFails` is a positive integer
 * (a count of sessions); `dropPct` is a percentage in [0, 100). Integer/finite checks keep
 * malformed LLM output out of the `applyDeload` arithmetic.
 */
export function isDeloadModifier(value: unknown): value is DeloadModifier {
  return (
    typeof value === 'object' &&
    value !== null &&
    'triggerConsecutiveFails' in value &&
    typeof value.triggerConsecutiveFails === 'number' &&
    Number.isInteger(value.triggerConsecutiveFails) &&
    value.triggerConsecutiveFails > 0 &&
    'dropPct' in value &&
    typeof value.dropPct === 'number' &&
    Number.isFinite(value.dropPct) &&
    value.dropPct >= 0 &&
    value.dropPct < 100
  );
}
