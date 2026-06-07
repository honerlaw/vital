import { LiveSession, SetEntry } from '@/data/types';

/** Partial update for one set; omitted fields keep their current value. */
export interface SetPatch {
  done?: boolean;
  weight?: number | null;
  reps?: number | null;
}

/**
 * Patch one set of the live session (022 — replaced the boolean `toggleSet`). ALL numeric
 * coercion lives HERE, in the pure engine, never in the UI or the persistence wrapper — the
 * reducer and the write-through mirror call the same pure functions, so what gets POSTed is
 * provably what the reducer stored (the 012/017 determinism contract). Coercion: null stays
 * null (blank field); weight must be finite and non-negative; reps must additionally be an
 * integer; anything else (NaN/Infinity/negative/float reps) coerces to null rather than
 * poisoning history.
 */
export const updateSet = (
  s: LiveSession,
  ei: number,
  si: number,
  patch: SetPatch,
): LiveSession => {
  const cleanWeight = (v: number | null): number | null =>
    v !== null && Number.isFinite(v) && v >= 0 ? v : null;
  const cleanReps = (v: number | null): number | null =>
    v !== null && Number.isInteger(v) && v >= 0 ? v : null;
  const sets = s.sets.map((row, r) =>
    r === ei
      ? row.map((entry, c): SetEntry => {
          if (c !== si) return entry;
          return {
            done: patch.done ?? entry.done,
            weight: patch.weight === undefined ? entry.weight : cleanWeight(patch.weight),
            reps: patch.reps === undefined ? entry.reps : cleanReps(patch.reps),
          };
        })
      : row,
  );
  return { ...s, sets };
};
