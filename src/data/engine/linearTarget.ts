/**
 * Linear progression target (030): `startWeight + increment × multiplier`, where the multiplier is
 * the count of successful completions (`per-session`) or the count of DISTINCT ISO weeks in which
 * a success happened (`per-week`). Pure function of the anchor + rule + history-derived successes.
 */
import { isoWeekKey } from '@/data/engine/isoWeekKey';
import { type SuccessfulCompletion } from '@/data/engine/successfulCompletions';
import { type ProgressionRule } from '@/data/types';

type LinearRule = Extract<ProgressionRule, { kind: 'linear' }>;

export const linearTarget = (
  startWeight: number,
  rule: LinearRule,
  successes: SuccessfulCompletion[],
): number => {
  const multiplier =
    rule.frequency === 'per-week'
      ? new Set(successes.map((c) => isoWeekKey(c.dateISO))).size
      : successes.length;
  return startWeight + rule.increment * multiplier;
};
