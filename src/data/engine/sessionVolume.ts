import { type SessionLog } from '@/data/types';

/**
 * Total training volume (041) for a finished session: Σ over every COMPLETED set of
 * `weight × reps`. Only `done` sets with both a non-null weight and non-null reps contribute —
 * a skipped or partially-entered set adds nothing (mirrors the history display, which dims
 * non-done sets). Sessions without per-set data (`exercises` absent — pre-022 / old-client logs)
 * yield 0, the same value as a logged session in which nothing was weighted; callers gate the
 * display on `> 0`. Unit-agnostic: the value is in the session's own `unit` (lb in v1).
 */
export const sessionVolume = (log: SessionLog): number => {
  if (log.exercises === undefined) return 0;
  let total = 0;
  for (const ex of log.exercises) {
    for (const s of ex.sets) {
      if (s.done && s.weight !== null && s.reps !== null) {
        total += s.weight * s.reps;
      }
    }
  }
  return total;
};
