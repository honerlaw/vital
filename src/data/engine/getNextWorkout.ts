import { Program, WorkoutDay } from '@/data/types';

/** The day the user is due to train next. */
export const getNextWorkout = (program: Program, cursor: number): WorkoutDay =>
  program.days[cursor % program.days.length];
