import { type Exercise } from '@/data/types';

export function isExercise(value: unknown): value is Exercise {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    'sets' in value &&
    typeof value.sets === 'number' &&
    'scheme' in value &&
    typeof value.scheme === 'string'
  );
}
