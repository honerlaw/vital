import { isCursorMap } from '@/data/guards/isCursorMap';
import { isSessionLogArray } from '@/data/guards/isSessionLogArray';
import { type UserStatePayload } from '@/data/types';

export function isUserStatePayload(value: unknown): value is UserStatePayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    'activeProgramId' in value &&
    (typeof value.activeProgramId === 'string' || value.activeProgramId === null) &&
    'cursors' in value &&
    isCursorMap(value.cursors) &&
    'history' in value &&
    isSessionLogArray(value.history)
  );
}
