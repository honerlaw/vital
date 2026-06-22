/**
 * AMRAP-driven target (030): a base increment every successful completion, plus a bonus increment
 * for each completion whose final done set (the AMRAP set) met or exceeded `bonusThresholdReps`.
 * Target = `startWeight + baseIncrement × successes + bonusIncrement × bonusSessions`. Pure
 * function of the anchor + rule + history-derived successes.
 */
import { type SuccessfulCompletion } from '@/data/engine/successfulCompletions';
import { type ProgressionRule } from '@/data/types';

type AmrapRule = Extract<ProgressionRule, { kind: 'amrap-driven' }>;

export const amrapTarget = (
  startWeight: number,
  rule: AmrapRule,
  successes: SuccessfulCompletion[],
): number => {
  const base = startWeight + rule.baseIncrement * successes.length;
  const bonusSessions = successes.filter((c) => {
    const done = c.sets.filter((s) => s.done && s.reps !== null);
    if (done.length === 0) return false;
    const last = done[done.length - 1];
    return last.reps !== null && last.reps >= rule.bonusThresholdReps;
  }).length;
  return base + rule.bonusIncrement * bonusSessions;
};
