import { Program, WorkoutDay } from '@/data/types';

/** The next `n` days in the rotation (excludes the current one). */
export const getUpcoming = (program: Program, cursor: number, n: number): WorkoutDay[] => {
  const out: WorkoutDay[] = [];
  for (let i = 1; i <= n; i++) {
    out.push(program.days[(cursor + i) % program.days.length]);
  }
  return out;
};
