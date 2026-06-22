/**
 * Stateless progression input (030): the SUCCESSFUL completions of an exercise, scanned from
 * history (newest-first, as `GET /api/me/state` orders it). A session is a "logged attempt" of
 * the exercise when its per-set log has at least one done set; an attempt is SUCCESSFUL when every
 * done set met or exceeded the scheme's target reps (`parseSchemeReps` of the session-denormalized
 * scheme). When the scheme has no parseable target, a logged attempt counts as success (can't
 * judge — don't penalize). Non-attempts (no per-set data / no done set) are skipped. The returned
 * list carries each success's date (for per-week cadence) and its sets (for AMRAP bonus counting),
 * so every progression rule derives its multiplier from history alone — no persisted counter.
 */
import { parseSchemeReps } from '@/data/engine/parseSchemeReps';
import { type SessionLog, type SetEntry } from '@/data/types';

export interface SuccessfulCompletion {
  dateISO: string;
  sets: SetEntry[];
}

export const successfulCompletions = (
  history: SessionLog[],
  exerciseName: string,
): SuccessfulCompletion[] => {
  const out: SuccessfulCompletion[] = [];
  for (const session of history) {
    const ex = session.exercises?.find((e) => e.name === exerciseName);
    if (!ex) continue;
    const doneSets = ex.sets.filter((s) => s.done);
    if (doneSets.length === 0) continue;
    const target = parseSchemeReps(ex.scheme);
    const success =
      target === null || doneSets.every((s) => s.reps !== null && s.reps >= target);
    if (success) out.push({ dateISO: session.dateISO, sets: ex.sets });
  }
  return out;
};
