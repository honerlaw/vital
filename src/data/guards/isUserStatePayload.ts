import { isSessionLogArray } from '@/data/guards/isSessionLogArray';
import { type UserStatePayload } from '@/data/types';

export function isUserStatePayload(value: unknown): value is UserStatePayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'activeProgramId' in value &&
    (typeof value.activeProgramId === 'string' || value.activeProgramId === null) &&
    'cursor' in value &&
    typeof value.cursor === 'number' &&
    'history' in value &&
    isSessionLogArray(value.history)
  );
}
