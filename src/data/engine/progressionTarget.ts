/**
 * The progression-derived working-weight target for a generated exercise (030) — the new top
 * rung of the prefill chain (030/024). Computed purely from the exercise's logged history:
 *
 *   typed-in-session value (wins, in ExerciseBlock) → progressionTarget(...) → blank
 *
 * Returns null when there is no anchor (startWeight null and the rule can't establish one), so the
 * UI falls through to a blank placeholder. The base target is selected from the CLOSED vocabulary
 * via an exhaustive switch (the cast-free idiom, 003) — an unknown kind is a compile error, and
 * the `never` default is a runtime fence. A deload, when configured, is applied last. This NEVER
 * clamps a typed value (it's a placeholder source only), preserving the 028/030 invariant.
 */
import { amrapTarget } from '@/data/engine/amrapTarget';
import { applyDeload } from '@/data/engine/applyDeload';
import { consecutiveFails } from '@/data/engine/consecutiveFails';
import { doubleProgressionTarget } from '@/data/engine/doubleProgressionTarget';
import { linearTarget } from '@/data/engine/linearTarget';
import { successfulCompletions } from '@/data/engine/successfulCompletions';
import { type ExerciseProgression, type SessionLog } from '@/data/types';

export const progressionTarget = (
  progression: ExerciseProgression,
  history: SessionLog[],
  exerciseName: string,
): number | null => {
  const startWeight = progression.startWeight;
  if (startWeight === null) return null;
  const successes = successfulCompletions(history, exerciseName);
  const rule = progression.rule;
  let base: number;
  switch (rule.kind) {
    case 'linear':
      base = linearTarget(startWeight, rule, successes);
      break;
    case 'double-progression':
      base = doubleProgressionTarget(startWeight, rule, successes);
      break;
    case 'amrap-driven':
      base = amrapTarget(startWeight, rule, successes);
      break;
    default: {
      const exhaustive: never = rule;
      return exhaustive;
    }
  }
  if (progression.deload) {
    base = applyDeload(base, progression.deload, consecutiveFails(history, exerciseName));
  }
  return base;
};
