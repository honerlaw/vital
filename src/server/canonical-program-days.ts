/**
 * Re-project a saved program's days to canonical known fields (030) before persisting — the same
 * strip-to-known-shape discipline the sessions route applies (the guards validate required fields
 * but don't strip extras, and a saved program is immutable). Drops any client-attached keys at the
 * day / exercise / progression / deload level; the rule object (already guard-validated) is copied
 * as-is.
 */
import { type ExerciseProgression, type WorkoutDay } from '@/data/types';

export function canonicalProgramDays(days: WorkoutDay[]): WorkoutDay[] {
  const cleanProgression = (p: ExerciseProgression): ExerciseProgression => ({
    startWeight: p.startWeight,
    rule: p.rule,
    ...(p.deload
      ? {
          deload: {
            triggerConsecutiveFails: p.deload.triggerConsecutiveFails,
            dropPct: p.deload.dropPct,
          },
        }
      : {}),
  });
  return days.map((d) => ({
    name: d.name,
    exercises: d.exercises.map((e) => ({
      name: e.name,
      sets: e.sets,
      scheme: e.scheme,
      ...(e.progression ? { progression: cleanProgression(e.progression) } : {}),
    })),
  }));
}
