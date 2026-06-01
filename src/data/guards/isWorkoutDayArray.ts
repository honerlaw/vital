import { isWorkoutDay } from '@/data/guards/isWorkoutDay';
import { type WorkoutDay } from '@/data/types';

export function isWorkoutDayArray(value: unknown): value is WorkoutDay[] {
  return Array.isArray(value) && value.every(isWorkoutDay);
}
