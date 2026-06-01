import { isExercise } from '@/data/guards/isExercise';
import { type WorkoutDay } from '@/data/types';

export function isWorkoutDay(value: unknown): value is WorkoutDay {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    'exercises' in value &&
    Array.isArray(value.exercises) &&
    value.exercises.every(isExercise)
  );
}
