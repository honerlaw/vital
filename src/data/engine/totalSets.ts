import { WorkoutDay } from '@/data/types';

export const totalSets = (day: WorkoutDay): number =>
  day.exercises.reduce((a, e) => a + e.sets, 0);
