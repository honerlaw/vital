/**
 * Double-progression target (030): weight only advances once you top out the rep range. Among the
 * exercise's successful completions, count those where EVERY done set reached `repHigh` — each such
 * session is one weight advance. Target = `startWeight + increment × advances`. (Sessions that hit
 * the scheme floor but not `repHigh` are successes that add reps, not weight — so they don't count
 * here.) Pure function of the anchor + rule + history-derived successes.
 */
import { type SuccessfulCompletion } from '@/data/engine/successfulCompletions';
import { type ProgressionRule } from '@/data/types';

type DoubleRule = Extract<ProgressionRule, { kind: 'double-progression' }>;

export const doubleProgressionTarget = (
  startWeight: number,
  rule: DoubleRule,
  successes: SuccessfulCompletion[],
): number => {
  const advances = successes.filter((c) => {
    const done = c.sets.filter((s) => s.done && s.reps !== null);
    return done.length > 0 && done.every((s) => s.reps !== null && s.reps >= rule.repHigh);
  }).length;
  return startWeight + rule.increment * advances;
};
