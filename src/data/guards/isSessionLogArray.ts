import { isSessionLog } from '@/data/guards/isSessionLog';
import { type SessionLog } from '@/data/types';

export function isSessionLogArray(value: unknown): value is SessionLog[] {
  return Array.isArray(value) && value.every(isSessionLog);
}
