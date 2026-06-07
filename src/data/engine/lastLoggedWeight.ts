/**
 * Cross-session weight prefill (024) — the weight the user last logged for an exercise,
 * scanned from history. Used ONLY as a non-authoritative UI placeholder (the lowest rung of
 * the fallback chain, below the in-session prior set); never coercion (that lives in
 * `updateSet`) and never a clamp on typed values.
 *
 * Semantics: history arrives newest-first (GET /api/me/state orders by finished_at DESC);
 * the first session containing an EXACT-name match with a qualifying set wins, and the LAST
 * qualifying set in that exercise supplies the weight. A set qualifies iff
 * `done && weight !== null` — history consumers trust only committed sets (028), unlike the
 * in-session prior-set fallback which inherits any typed weight. Sessions without per-set
 * data (legacy / degraded rows) or without a qualifying set are skipped, and the scan
 * continues into older sessions. No match anywhere → null (blank placeholder).
 */
import { type SessionLog } from '@/data/types';

export const lastLoggedWeight = (history: SessionLog[], exerciseName: string): number | null => {
  for (const session of history) {
    const exercise = session.exercises?.find((e) => e.name === exerciseName);
    if (!exercise) continue;
    const last = exercise.sets
      .slice()
      .reverse()
      .find((s) => s.done && s.weight !== null);
    if (last && last.weight !== null) return last.weight;
  }
  return null;
};
