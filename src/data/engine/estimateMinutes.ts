import { totalSets } from '@/data/engine/totalSets';
import { WorkoutDay } from '@/data/types';

/** Rough session length estimate (minutes). */
export const estimateMinutes = (day: WorkoutDay): number =>
  Math.max(35, totalSets(day) * 5);
