import { isProgramTag } from '@/data/guards/isProgramTag';
import { isWorkoutDayArray } from '@/data/guards/isWorkoutDayArray';
import { type Program } from '@/data/types';

export function isProgram(value: unknown): value is Program {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'tag' in value &&
    isProgramTag(value.tag) &&
    'cred' in value &&
    typeof value.cred === 'string' &&
    'perWeek' in value &&
    typeof value.perWeek === 'number' &&
    'blurb' in value &&
    typeof value.blurb === 'string' &&
    'days' in value &&
    isWorkoutDayArray(value.days)
  );
}
