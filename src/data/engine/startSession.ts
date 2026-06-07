import { LiveSession, Program } from '@/data/types';

export const startSession = (program: Program, dayIndex: number): LiveSession => ({
  programId: program.id,
  dayIndex,
  // Seeded from the day's exercises — THE alignment invariant (022): finishSession zips
  // `sets[ei]` against `exercises[ei]` by index, which holds because this is the only writer
  // of the array shape and no action resizes it.
  sets: program.days[dayIndex].exercises.map((e) =>
    Array.from({ length: e.sets }, () => ({ done: false, weight: null, reps: null })),
  ),
  switchedFrom: null, // a plain start is not a switch; SWITCH_AND_START_WORKOUT overrides (015)
});
