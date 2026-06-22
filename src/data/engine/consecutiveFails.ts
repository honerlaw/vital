/**
 * Stateless deload trigger input (030): the number of CONSECUTIVE failed attempts of an exercise
 * at the most recent end of history (newest-first). A "logged attempt" is a session whose per-set
 * log has at least one done set; it FAILS when a parseable target exists and some done set fell
 * short of it. The scan counts leading failures and stops at the first success; non-attempts are
 * skipped (they neither fail nor reset the streak). Mirrors `successfulCompletions`' attempt /
 * success definition so the two derivations can't disagree.
 */
import { parseSchemeReps } from '@/data/engine/parseSchemeReps';
import { type SessionLog } from '@/data/types';

export const consecutiveFails = (history: SessionLog[], exerciseName: string): number => {
  let streak = 0;
  for (const session of history) {
    const ex = session.exercises?.find((e) => e.name === exerciseName);
    if (!ex) continue;
    const doneSets = ex.sets.filter((s) => s.done);
    if (doneSets.length === 0) continue;
    const target = parseSchemeReps(ex.scheme);
    const success =
      target === null || doneSets.every((s) => s.reps !== null && s.reps >= target);
    if (success) break;
    streak += 1;
  }
  return streak;
};
